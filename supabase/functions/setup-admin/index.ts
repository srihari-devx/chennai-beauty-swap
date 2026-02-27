import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { email, password } = await req.json();

  // Find user by email
  const { data: listData } = await supabase.auth.admin.listUsers();
  let userId = listData?.users?.find((u: any) => u.email === email)?.id;

  // If user doesn't exist and password provided, create them
  if (!userId && password) {
    const { data: userData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Admin", area: "Other", gender: "male" },
    });

    if (signUpError) {
      return new Response(JSON.stringify({ error: signUpError.message }), { status: 400 });
    }
    userId = userData?.user?.id;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), { status: 404 });
  }

  // Insert admin role
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  return new Response(JSON.stringify({ success: true, userId, roleError: roleError?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
