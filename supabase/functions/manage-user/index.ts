import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { userId, action } = await req.json();

    if (!userId || !action) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      
      // Also delete the profile just in case there's no cascade delete.
      await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
      
      return new Response(JSON.stringify({ success: true, message: "User deleted successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "block") {
      // Set ban_duration to block the user. Over 10 years ban.
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "87600h" });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, message: "User blocked successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "unblock") {
      // Remove ban duration to unblock the user
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true, message: "User unblocked successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Default error for unhandled action
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
