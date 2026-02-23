import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTrustScore = (sellerId: string | undefined) => {
  const [score, setScore] = useState(0);
  const [badges, setBadges] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!sellerId) return;

    const calculate = async () => {
      const [profileRes, ratingsRes, soldRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("is_verified, created_at").eq("user_id", sellerId).single(),
        supabase.from("ratings").select("rating").eq("seller_id", sellerId),
        supabase.from("products").select("id").eq("seller_id", sellerId).eq("is_sold", true),
        supabase.from("seller_badges").select("badge_type").eq("user_id", sellerId),
      ]);

      let total = 0;
      const profile = profileRes.data;
      const ratings = ratingsRes.data || [];
      const soldCount = soldRes.data?.length || 0;
      const badgeList = (badgesRes.data || []).map(b => b.badge_type);

      // Verified seller (+30)
      if (profile?.is_verified) { total += 30; setIsVerified(true); }

      // Invoice uploaded is part of verification, so +20 if verified
      if (profile?.is_verified) total += 20;

      // 3+ successful sales (+20)
      if (soldCount >= 3) total += 20;

      // Average rating > 4 (+20)
      if (ratings.length > 0) {
        const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
        if (avg > 4) total += 20;
      }

      // Account older than 30 days (+10)
      if (profile?.created_at) {
        const daysSince = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince >= 30) total += 10;
      }

      setScore(Math.min(100, total));
      setBadges(badgeList);
    };

    calculate();
  }, [sellerId]);

  return { score, badges, isVerified };
};
