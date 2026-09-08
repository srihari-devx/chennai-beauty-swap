import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN"),
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
  };
}

/**
 * Generate a URL-safe slug from a display name.
 * "Priya Beauty" → "priya-beauty"
 */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ─── Verify caller is an authenticated admin ───
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabase.auth.getUser(token);
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if caller is admin
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin")
    .single();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Parse request body ───
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, name } = body;

  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "Valid email is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return new Response(JSON.stringify({ error: "Invalid email format" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // ─── Find existing user by email ───
  let userId: string | undefined;
  let userName: string | undefined;

  try {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (!listError && usersData?.users) {
      const user = usersData.users.find(
        (u: any) => u.email?.toLowerCase() === normalizedEmail
      );
      if (user) {
        if (user.email_confirmed_at || user.confirmed_at) {
          userId = user.id;
        } else {
          return new Response(JSON.stringify({
            error: "User exists but email is not verified. They must verify their email first.",
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }
  } catch (_err) {
    return new Response(JSON.stringify({
      error: "User lookup failed. Please try again.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({
      error: "User not found. They must sign up and verify their email first.",
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Check if already an influencer ───
  const { data: existing } = await supabase
    .from("influencers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({
      error: "This user is already an influencer.",
    }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Get display name from profile or use provided name ───
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .single();

  const displayName = (name && typeof name === "string" && name.trim())
    ? name.trim()
    : profileData?.full_name || normalizedEmail.split("@")[0];

  // ─── Generate unique slug ───
  let baseSlug = nameToSlug(displayName);
  if (!baseSlug) baseSlug = "influencer";

  let slug = baseSlug;
  let suffix = 0;

  // Ensure slug uniqueness
  while (true) {
    const { data: slugCheck } = await supabase
      .from("influencers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!slugCheck) break;

    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }

  // Referral code: uppercase version of slug
  const referralCode = slug.toUpperCase().replace(/-/g, "-");

  // ─── Create influencer record ───
  const { data: newInfluencer, error: insertError } = await supabase
    .from("influencers")
    .insert({
      user_id: userId,
      name: displayName,
      slug,
      referral_code: referralCode,
      status: "active",
    })
    .select()
    .single();

  if (insertError) {
    return new Response(JSON.stringify({
      error: `Failed to create influencer: ${insertError.message}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    influencer: newInfluencer,
    message: `Influencer created: ${displayName} (${slug})`,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
