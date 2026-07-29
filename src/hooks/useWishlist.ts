import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useWishlist = () => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchWishlist = async () => {
    if (!user) { setWishlistIds(new Set()); return; }
    const { data } = await supabase
      .from("wishlists")
      .select("product_id")
      .eq("user_id", user.id);
    setWishlistIds(new Set((data || []).map(w => w.product_id)));
  };

  useEffect(() => { fetchWishlist(); }, [user]);

  const toggleWishlist = async (productId: string) => {
    if (!user) return false;
    setLoading(true);
    try {
      // @ts-ignore — custom RPC not in generated types
      const { data: res, error } = await supabase.rpc("fn_toggle_wishlist", {
        p_user_id: user.id,
        p_product_id: productId,
      });
      const result = res as { error?: string; action?: string } | null;
      if (error || result?.error) return false;
      if (result?.action === "removed") {
        setWishlistIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
      } else {
        setWishlistIds(prev => new Set(prev).add(productId));
      }
      return true;
    } catch { return false; }
    finally { setLoading(false); }
  };

  const isWishlisted = (productId: string) => wishlistIds.has(productId);

  return { wishlistIds, isWishlisted, toggleWishlist, loading, refetch: fetchWishlist };
};
