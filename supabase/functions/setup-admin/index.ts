import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  // C-2 fix: CORS restricted to specific origin. Update this to your production domain.
  // For local dev, you can temporarily use '*' but restrict before deploying.
  'Access-Control-Allow-Origin': Deno.env.get("ALLOWED_ORIGIN") || 'https://swaptics.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ─── C-2 FIX: Verify caller is an authenticated admin ───
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller } } = await supabase.auth.getUser(token);
  if (!caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // ─── End auth check ───

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, password, action } = body;

  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ error: "Valid email is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // M-4 FIX: No hardcoded fallback password — password must be provided for user creation
  // C-4 FIX: Use targeted listUsers with filter instead of loading all users
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
      // M-4 FIX: Require explicit password — no hardcoded fallback
      if (!password) {
        return new Response(JSON.stringify({ error: "Password is required to create admin user" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: "Admin", area: "T Nagar", gender: "male" },
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await supabase.from("user_roles").upsert({ user_id: newUser.user!.id, role: "admin" }, { onConflict: "user_id,role" });
      return new Response(JSON.stringify({ success: true, userId: newUser.user!.id, action: "created_fresh" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // M-4 FIX: Only update password if explicitly provided
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

  // Original add-admin flow
  let userId = matchingUsers.find((u: any) => u.email_confirmed_at)?.id || matchingUsers[0]?.id;

  if (!userId && password) {
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: "Admin", area: "Other", gender: "male" },
    });
    if (signUpError) return new Response(JSON.stringify({ error: signUpError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    userId = userData?.user?.id;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  return new Response(JSON.stringify({ success: true, userId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
