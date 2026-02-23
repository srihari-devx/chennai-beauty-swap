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
      if (wishlistIds.has(productId)) {
        await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
        setWishlistIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
      } else {
        await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
        setWishlistIds(prev => new Set(prev).add(productId));
      }
      return true;
    } catch { return false; }
    finally { setLoading(false); }
  };

  const isWishlisted = (productId: string) => wishlistIds.has(productId);

  return { wishlistIds, isWishlisted, toggleWishlist, loading, refetch: fetchWishlist };
};
