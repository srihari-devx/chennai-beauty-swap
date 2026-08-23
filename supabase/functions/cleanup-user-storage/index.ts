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

  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    return new Response(JSON.stringify({ error: "Valid userId is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── Perform Service-Role Storage Cleanup (Finding 4 Remediation) ───
  let deletedCount = 0;
  let errorDetail: string | null = null;

  try {
    const { data: files, error: listError } = await supabase.storage
      .from("product-images")
      .list(userId);

    if (listError) {
      errorDetail = listError.message;
    } else if (files && files.length > 0) {
      const filePaths = files.map((f: { name: string }) => `${userId}/${f.name}`);
      const { data: removed, error: removeError } = await supabase.storage
        .from("product-images")
        .remove(filePaths);

      if (removeError) {
        errorDetail = removeError.message;
      } else {
        deletedCount = removed?.length ?? filePaths.length;
      }
    }
  } catch (err: any) {
    errorDetail = err?.message || "Storage operation failed";
  }

  // ─── Record Storage Cleanup in Admin Audit Log (Finding 9) ───
  try {
    await supabase.from("admin_audit_log").insert({
      admin_id: caller.id,
      action: "storage_cleanup",
      target_user_id: userId,
      details: {
        bucket: "product-images",
        deleted_count: deletedCount,
        error: errorDetail,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (_logErr) {
    // Non-blocking log attempt
  }

  if (errorDetail) {
    return new Response(JSON.stringify({
      success: false,
      warning: `Storage cleanup partial failure: ${errorDetail}`,
      deletedCount,
    }), {
      status: 200, // Return 200 with warning so user cascade deletion proceeds
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    deletedCount,
    message: `Cleaned up ${deletedCount} storage items for user ${userId}`,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
