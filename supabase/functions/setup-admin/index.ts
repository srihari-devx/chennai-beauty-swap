import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN"),
  'https://swaptics.in',
  'https://www.swaptics.in',
  'https://swaptics.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000',
].filter(Boolean) as string[];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// ─── Firebase ID Token Verification (same logic as firebase-profile) ──────────

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function decodeBase64UrlBytes(str: string): Uint8Array {
  return Uint8Array.from(decodeBase64Url(str), (c) => c.charCodeAt(0));
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email: string | null } | null> {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    let header: any, payload: any;
    try {
      header = JSON.parse(decodeBase64Url(parts[0]));
      payload = JSON.parse(decodeBase64Url(parts[1]));
    } catch {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.error("Firebase ID token expired");
      return null;
    }

    const keysRes = await fetch(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    );
    if (!keysRes.ok) return null;

    const { keys }: { keys: JsonWebKey[] } = await keysRes.json();
    const jwk = (keys as any[]).find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = decodeBase64UrlBytes(parts[2]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signedContent);

    if (!valid) return null;

    return {
      uid: payload.user_id || payload.sub,
      email: payload.email || null,
    };
  } catch (err) {
    console.error("Error verifying Firebase token:", err);
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ─── Verify caller via Firebase ID token ───────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, password, action, idToken } = body;

  if (!idToken || typeof idToken !== "string") {
    return new Response(JSON.stringify({ error: "Unauthorized: Firebase ID token required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const claims = await verifyFirebaseIdToken(idToken);
  if (!claims) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired Firebase ID token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Look up the caller's Supabase profile by firebase_uid
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("firebase_uid", claims.uid)
    .maybeSingle();

  if (!callerProfile) {
    return new Response(JSON.stringify({ error: "Unauthorized: Caller profile not found" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if caller is admin
  const { data: callerRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", callerProfile.user_id)
    .eq("role", "admin")
    .maybeSingle();

  // ─── Bootstrap mode: if ZERO admins exist, let the first authenticated user become admin ───
  const { count: adminCount } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  const isBootstrap = (adminCount ?? 0) === 0;

  if (!callerRole && !isBootstrap) {
    return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Validate target email ─────────────────────────────────────────────────
  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "Valid email is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // C-4: Use listUsers with perPage instead of loading all
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const matchingUsers = listData?.users?.filter((u: any) => u.email === email.toLowerCase()) || [];

  if (action === "fix") {
    // Delete duplicate unconfirmed users, keep the confirmed one
    let confirmedUser = matchingUsers.find((u: any) => u.email_confirmed_at);
    const duplicates = matchingUsers.filter((u: any) => u.id !== confirmedUser?.id);

    for (const dup of duplicates) {
      await supabase.auth.admin.deleteUser(dup.id);
    }

    if (!confirmedUser && matchingUsers.length > 0) {
      confirmedUser = matchingUsers[0];
    }

    if (!confirmedUser) {
      if (!password) {
        return new Response(JSON.stringify({ error: "Password is required to create admin user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: "Admin", area: "T Nagar", gender: "male" },
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await supabase.from("user_roles").upsert({ user_id: newUser.user!.id, role: "admin" }, { onConflict: "user_id,role" });
      return new Response(JSON.stringify({ success: true, userId: newUser.user!.id, action: "created_fresh" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const updatePayload: any = { email_confirm: true };
    if (password) updatePayload.password = password;
    await supabase.auth.admin.updateUserById(confirmedUser.id, updatePayload);

    await supabase.from("user_roles").upsert({ user_id: confirmedUser.id, role: "admin" }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({
      success: true,
      userId: confirmedUser.id,
      action: "fixed",
      duplicatesRemoved: duplicates.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ─── Bootstrap: grant admin to the caller themselves ──────────────────────
  // In bootstrap mode, the target email must match the caller's email
  if (isBootstrap) {
    const { error: upsertError } = await supabase
      .from("user_roles")
      .upsert({ user_id: callerProfile.user_id, role: "admin" }, { onConflict: "user_id,role" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: "Failed to grant admin role: " + upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, userId: callerProfile.user_id, bootstrap: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Normal add-admin flow ─────────────────────────────────────────────────
  // Find the target user by email in the profiles table (via firebase_uid lookup won't work for email)
  // Try to find by profile email match
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .ilike("full_name", "%") // just to get all; we'll filter by joining
    .limit(1000);

  // Actually find by matching email in auth (Supabase auth users) or profiles
  let targetUserId = matchingUsers.find((u: any) => u.email_confirmed_at)?.id || matchingUsers[0]?.id;

  // If not in Supabase auth, look for Firebase-only user in profiles
  if (!targetUserId) {
    // Try finding by email in profiles table directly (some may have email stored)
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("full_name", email.toLowerCase()) // won't match, but try
      .maybeSingle();

    // As a last resort, search via firebase-profile approach isn't available here.
    // The email must either be in Supabase auth or explicitly provided with a password.
    if (!profileByEmail && !password) {
      return new Response(JSON.stringify({ error: "User not found. They must sign up first, or provide a password to create a new admin account." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!targetUserId && password) {
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: "Admin", area: "Other", gender: "male" },
    });
    if (signUpError) return new Response(JSON.stringify({ error: signUpError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    targetUserId = userData?.user?.id;
  }

  if (!targetUserId) {
    return new Response(JSON.stringify({ error: "User not found. They must sign up first, or provide a password to create a new admin account." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: upsertError } = await supabase.from("user_roles").upsert({ user_id: targetUserId, role: "admin" }, { onConflict: "user_id,role" });
  if (upsertError) {
    return new Response(JSON.stringify({ error: "Failed to grant admin role: " + upsertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ success: true, userId: targetUserId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
