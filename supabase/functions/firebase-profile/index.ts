import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN"),
  "https://swaptics.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ─── Firebase ID Token Verification ─────────────────────────────────────────
// We verify Firebase ID tokens using Google's public keys (no Admin SDK needed).
// Ref: https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library

interface FirebaseClaims {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseClaims | null> {
  try {
    // Decode the JWT header to get the key ID
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.error("Firebase ID token has expired");
      return null;
    }

    // Fetch Google's public keys
    const keysRes = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    );
    const keys: Record<string, string> = await keysRes.json();

    const cert = keys[header.kid];
    if (!cert) {
      console.error("No matching public key for kid:", header.kid);
      return null;
    }

    // Import the certificate as a CryptoKey
    const pemBody = cert
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/\s/g, "");
    const certDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    const publicKey = await crypto.subtle.importKey(
      "spki",
      certDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Reconstruct the signed content and signature
    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      signedContent
    );

    if (!valid) {
      console.error("Firebase ID token signature verification failed");
      return null;
    }

    return {
      uid: payload.user_id || payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      picture: payload.picture || null,
    };
  } catch (err) {
    console.error("Error verifying Firebase token:", err);
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { idToken } = body;
  if (!idToken || typeof idToken !== "string") {
    return new Response(JSON.stringify({ error: "idToken is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the Firebase ID token
  const claims = await verifyFirebaseIdToken(idToken);
  if (!claims) {
    return new Response(JSON.stringify({ error: "Invalid or expired Firebase ID token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use service role to bypass RLS
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Try to find existing profile by firebase_uid ──────────────────────────
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("firebase_uid", claims.uid)
    .maybeSingle();

  if (selectError) {
    console.error("Error fetching profile:", selectError);
    return new Response(JSON.stringify({ error: "Database error fetching profile" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existingProfile) {
    // ── Return existing profile ──────────────────────────────────────────────
    return new Response(JSON.stringify(existingProfile), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Create a new profile for this Firebase user ───────────────────────────
  // user_id must be a UUID. Since the FK constraint is dropped, we generate
  // a new UUID as a stable identifier for this Firebase user within our system.
  const stableUserId = crypto.randomUUID();
  const displayName = claims.name || (claims.email ? claims.email.split("@")[0] : "User");

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: stableUserId,
      firebase_uid: claims.uid,
      full_name: displayName,
      area: "",
      avatar_url: claims.picture || null,
      is_verified: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating profile:", insertError);
    return new Response(JSON.stringify({ error: "Failed to create profile: " + insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(newProfile), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
