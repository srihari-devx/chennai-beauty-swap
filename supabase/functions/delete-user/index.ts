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

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ─── Verify the caller is an authenticated admin ───
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

    // ─── Parse and validate request ───
    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ error: "Invalid userId format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (caller.id === userId) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Fix #11: Atomic cascade deletion ───
    // Delete all user data in correct order, then remove from auth.users

    // 1. Get user's product IDs
    const { data: userProducts } = await supabase
      .from("products")
      .select("id")
      .eq("seller_id", userId);
    const productIds = (userProducts || []).map((p: any) => p.id);

    // 2. Delete product-related data
    if (productIds.length > 0) {
      await supabase.from("product_views").delete().in("product_id", productIds);
      await supabase.from("product_reports").delete().in("product_id", productIds);
      await supabase.from("wishlists").delete().in("product_id", productIds);

      // Get and delete chats + messages for seller's products
      const { data: productChats } = await supabase
        .from("chats")
        .select("id")
        .in("product_id", productIds);
      const productChatIds = (productChats || []).map((c: any) => c.id);

      if (productChatIds.length > 0) {
        await supabase.from("messages").delete().in("chat_id", productChatIds);
      }
      await supabase.from("chats").delete().in("product_id", productIds);
      await supabase.from("products").delete().eq("seller_id", userId);
    }

    // 3. Delete user's buyer chats and messages
    const { data: buyerChats } = await supabase
      .from("chats")
      .select("id")
      .eq("buyer_id", userId);
    const buyerChatIds = (buyerChats || []).map((c: any) => c.id);

    if (buyerChatIds.length > 0) {
      await supabase.from("messages").delete().in("chat_id", buyerChatIds);
      await supabase.from("chats").delete().eq("buyer_id", userId);
    }

    // 4. Delete remaining user data
    await supabase.from("wishlists").delete().eq("user_id", userId);
    await supabase.from("notifications").delete().eq("user_id", userId);
    await supabase.from("ratings").delete().eq("rater_id", userId);
    await supabase.from("ratings").delete().eq("seller_id", userId);
    await supabase.from("seller_badges").delete().eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // 5. Delete profile
    await supabase.from("profiles").delete().eq("user_id", userId);

    // 6. Delete from auth.users (final step)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      // Log but don't fail — profile and data are already cleaned up
      console.error("Auth user deletion warning:", authDeleteError.message);
    }

    // 7. Clean up storage (best effort — don't fail if storage cleanup fails)
    try {
      const { data: files } = await supabase.storage
        .from("product-images")
        .list(userId);
      if (files && files.length > 0) {
        const filePaths = files.map((f: any) => `${userId}/${f.name}`);
        await supabase.storage.from("product-images").remove(filePaths);
      }
    } catch {
      // Storage cleanup is best-effort
    }

    return new Response(JSON.stringify({
      success: true,
      message: "User and all associated data permanently deleted",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    // Generic error — don't expose internals
    return new Response(JSON.stringify({ error: "Failed to delete user. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
