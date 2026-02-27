import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { email, password, action } = await req.json();

  // List users to find by email
  const { data: listData } = await supabase.auth.admin.listUsers();
  const matchingUsers = listData?.users?.filter((u: any) => u.email === email) || [];

  if (action === "fix") {
    // Delete duplicate unconfirmed users, keep the confirmed one
    let confirmedUser = matchingUsers.find((u: any) => u.email_confirmed_at);
    const duplicates = matchingUsers.filter((u: any) => u.id !== confirmedUser?.id);
    
    for (const dup of duplicates) {
      await supabase.auth.admin.deleteUser(dup.id);
    }

    // If no confirmed user exists, confirm the first one
    if (!confirmedUser && matchingUsers.length > 0) {
      confirmedUser = matchingUsers[0];
    }

    if (!confirmedUser) {
      // Create fresh
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password: password || "@2026cbs",
        email_confirm: true,
        user_metadata: { full_name: "Admin", area: "T Nagar", gender: "male" },
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      
      await supabase.from("user_roles").upsert({ user_id: newUser.user!.id, role: "admin" }, { onConflict: "user_id,role" });
      return new Response(JSON.stringify({ success: true, userId: newUser.user!.id, action: "created_fresh" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update password and ensure confirmed
    await supabase.auth.admin.updateUserById(confirmedUser.id, {
      password: password || "@2026cbs",
      email_confirm: true,
    });

    // Ensure admin role
    await supabase.from("user_roles").upsert({ user_id: confirmedUser.id, role: "admin" }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ 
      success: true, 
      userId: confirmedUser.id, 
      action: "fixed",
      duplicatesRemoved: duplicates.length 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Original add-admin flow
  let userId = matchingUsers.find((u: any) => u.email_confirmed_at)?.id || matchingUsers[0]?.id;

  if (!userId && password) {
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: "Admin", area: "Other", gender: "male" },
    });
    if (signUpError) return new Response(JSON.stringify({ error: signUpError.message }), { status: 400, headers: corsHeaders });
    userId = userData?.user?.id;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), { status: 404, headers: corsHeaders });
  }

  await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  return new Response(JSON.stringify({ success: true, userId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
