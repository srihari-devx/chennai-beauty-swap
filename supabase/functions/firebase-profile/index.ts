import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN"),
  "https://swaptics.in",
  "https://www.swaptics.in",
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
// Verifies a Firebase ID token using Google's JWK public keys.
// Ref: https://firebase.google.com/docs/auth/admin/verify-id-tokens

interface FirebaseClaims {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

/**
 * Decode a base64url string into a UTF-8 string (handles URL-safe base64).
 */
function decodeBase64Url(str: string): string {
  // Replace URL-safe chars and add padding
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

/**
 * Decode a base64url string into a Uint8Array.
 */
function decodeBase64UrlBytes(str: string): Uint8Array {
  return Uint8Array.from(decodeBase64Url(str), (c) => c.charCodeAt(0));
}

async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseClaims | null> {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      console.error("Invalid JWT format");
      return null;
    }

    // Decode header and payload
    let header: any;
    let payload: any;
    try {
      header = JSON.parse(decodeBase64Url(parts[0]));
      payload = JSON.parse(decodeBase64Url(parts[1]));
    } catch {
      console.error("Failed to decode JWT header/payload");
      return null;
    }

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.error("Firebase ID token has expired");
      return null;
    }

    // ── Use JWK endpoint (not x509) — this is the correct format for Web Crypto ──
    // Google provides Firebase public keys as JWK at this URL:
    const keysRes = await fetch(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    );
    if (!keysRes.ok) {
      console.error("Failed to fetch Google JWK keys:", keysRes.status);
      return null;
    }

    const { keys }: { keys: JsonWebKey[] } = await keysRes.json();
    const jwk = (keys as any[]).find((k) => k.kid === header.kid);

    if (!jwk) {
      console.error("No matching JWK for kid:", header.kid, "available kids:", keys.map((k: any) => k.kid));
      return null;
    }

    // Import the JWK directly — this is what x509 certs were blocking before
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Reconstruct signed content and signature
    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = decodeBase64UrlBytes(parts[2]);

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
    console.error("Unexpected error verifying Firebase token:", err);
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  // Verify the Firebase ID token using JWK keys
  const claims = await verifyFirebaseIdToken(idToken);
  if (!claims) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired Firebase ID token" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Use service role to bypass RLS
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Try to find existing profile by firebase_uid
  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("firebase_uid", claims.uid)
    .maybeSingle();

  if (selectError) {
    console.error("Error fetching profile:", selectError);
    return new Response(
      JSON.stringify({ error: "Database error fetching profile" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (existingProfile) {
    return new Response(JSON.stringify(existingProfile), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create a new profile for this Firebase user.
  // user_id is a stable UUID generated for this Firebase user (FK constraint was dropped).
  const stableUserId = crypto.randomUUID();
  const displayName =
    claims.name || (claims.email ? claims.email.split("@")[0] : "User");

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
    return new Response(
      JSON.stringify({ error: "Failed to create profile: " + insertError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify(newProfile), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
