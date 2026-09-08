import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Detects the referral source from document.referrer.
 * Returns one of: instagram, youtube, whatsapp, facebook, or direct.
 */
function detectReferralSource(): string {
  try {
    const referrer = document.referrer;
    if (!referrer) return "direct";

    const hostname = new URL(referrer).hostname.toLowerCase();

    if (hostname.includes("instagram.com") || hostname.includes("instagram")) return "instagram";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    if (hostname.includes("whatsapp.com") || hostname.includes("whatsapp")) return "whatsapp";
    if (hostname.includes("facebook.com") || hostname.includes("fb.com") || hostname.includes("fb.me")) return "facebook";

    return "direct";
  } catch {
    return "direct";
  }
}

const ReferralRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      return;
    }

    let cancelled = false;

    const processReferral = async () => {
      // Look up the influencer by slug
      const { data: influencer, error } = await supabase
        .from("influencers")
        .select("id, status")
        .eq("slug", slug.toLowerCase())
        .single();

      if (cancelled) return;

      if (error || !influencer) {
        setNotFound(true);
        return;
      }

      // Only track clicks for active influencers
      if (influencer.status === "active") {
        const source = detectReferralSource();

        // Fire-and-forget: insert click record
        supabase
          .from("referral_clicks")
          .insert({
            influencer_id: influencer.id,
            referral_source: source,
            user_agent: navigator.userAgent || null,
          })
          .then(() => {
            // Click tracked successfully (silent)
          });
      }

      // Redirect to homepage
      navigate("/", { replace: true });
    };

    processReferral();

    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full gradient-hero flex items-center justify-center mx-auto mb-6 border border-border">
            <span className="text-3xl">🔗</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            Link Not Found
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            This referral link doesn't exist or may have been deactivated.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl gradient-cta text-primary-foreground font-semibold text-sm transition-all hover:opacity-90"
          >
            Go to Swaptics
          </button>
        </div>
      </div>
    );
  }

  // Loading state while processing the referral
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground font-sans text-sm">Redirecting you to Swaptics...</p>
      </div>
    </div>
  );
};

export default ReferralRedirect;
