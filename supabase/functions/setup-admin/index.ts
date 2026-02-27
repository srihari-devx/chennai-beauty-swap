import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { email, password } = await req.json();

  // Create user
  const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Admin", area: "Other", gender: "male" },
  });

  if (signUpError && !signUpError.message.includes("already been registered")) {
    return new Response(JSON.stringify({ error: signUpError.message }), { status: 400 });
  }

  // Get user id
  let userId = userData?.user?.id;
  if (!userId) {
    const { data: listData } = await supabase.auth.admin.listUsers();
    const found = listData?.users?.find((u: any) => u.email === email);
    userId = found?.id;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  // Insert admin role
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ success: true, userId, roleError: roleError?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
