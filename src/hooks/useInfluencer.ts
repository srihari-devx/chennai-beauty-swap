import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Influencer {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  referral_code: string;
  status: string;
  created_at: string;
}

export interface ReferralClick {
  id: string;
  influencer_id: string;
  clicked_at: string;
  referral_source: string;
  user_agent: string | null;
}

export interface SourceBreakdown {
  source: string;
  count: number;
}

export function useInfluencer() {
  const { user } = useAuth();
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [totalClicks, setTotalClicks] = useState(0);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdown[]>([]);
  const [recentClicks, setRecentClicks] = useState<ReferralClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfluencerData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch influencer profile
      const { data: infData, error: infError } = await supabase
        .from("influencers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (infError || !infData) {
        setInfluencer(null);
        setLoading(false);
        return;
      }

      setInfluencer(infData as Influencer);

      // Fetch all clicks for this influencer
      const { data: clicksData, error: clicksError } = await supabase
        .from("referral_clicks")
        .select("*")
        .eq("influencer_id", infData.id)
        .order("clicked_at", { ascending: false });

      if (clicksError) {
        setError("Failed to load referral data");
        setLoading(false);
        return;
      }

      const clicks = (clicksData || []) as ReferralClick[];

      setTotalClicks(clicks.length);
      setRecentClicks(clicks.slice(0, 20));

      // Calculate source breakdown
      const sourceCounts: Record<string, number> = {};
      clicks.forEach((click) => {
        const src = click.referral_source || "direct";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });

      const breakdown = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      setSourceBreakdown(breakdown);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInfluencerData();
  }, [fetchInfluencerData]);

  return {
    influencer,
    totalClicks,
    sourceBreakdown,
    recentClicks,
    loading,
    error,
    refetch: fetchInfluencerData,
  };
}
