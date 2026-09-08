import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInfluencer } from "@/hooks/useInfluencer";
import { Button } from "@/components/ui/button";
import {
  Copy, Check, Link2, MousePointerClick, Clock, CalendarDays,
  Activity, CircleDot, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";

const SOURCE_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  youtube: "#FF0000",
  whatsapp: "#25D366",
  facebook: "#1877F2",
  direct: "#8B5CF6",
};

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  direct: "Direct",
};

const SOURCE_EMOJIS: Record<string, string> = {
  instagram: "📸",
  youtube: "▶️",
  whatsapp: "💬",
  facebook: "👤",
  direct: "🔗",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

const InfluencerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    influencer, totalClicks, sourceBreakdown, recentClicks,
    loading, error, refetch,
  } = useInfluencer();

  const [copied, setCopied] = useState(false);

  const referralUrl = influencer
    ? `${window.location.origin}/i/${influencer.slug}`
    : "";

  const copyReferralLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-4">
            <div className="h-48 rounded-2xl bg-muted animate-pulse" />
            <div className="h-32 rounded-2xl bg-muted animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-28 rounded-2xl bg-muted animate-pulse" />
              <div className="h-28 rounded-2xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not an influencer
  if (!influencer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center mx-auto mb-4 border border-border">
              <Link2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Influencer Access
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              You don't have an influencer account yet. Contact the Swaptics team to get started.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="gradient-cta border-0 text-primary-foreground rounded-xl"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-20 bg-card rounded-2xl border border-destructive/30">
            <p className="text-destructive font-semibold mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isActive = influencer.status === "active";

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">

        {/* ── Profile Card ────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full gradient-cta flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {influencer.name[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground truncate">
                {influencer.name}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  <CircleDot className="w-3 h-3" />
                  {isActive ? "Active" : "Inactive"}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Joined {formatDate(influencer.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Referral code */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="font-medium text-foreground">Referral Code:</span>
            <code className="px-2 py-0.5 bg-muted rounded-lg text-xs font-mono">
              {influencer.referral_code}
            </code>
          </div>
        </div>

        {/* ── Referral Link Card ──────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Your Referral Link</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-muted rounded-xl px-4 py-3 border border-border">
              <p className="text-sm font-mono text-foreground truncate" id="referral-link-text">
                {referralUrl}
              </p>
            </div>
            <Button
              onClick={copyReferralLink}
              size="sm"
              className={`rounded-xl flex-shrink-0 transition-all duration-200 ${
                copied
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "gradient-cta border-0 text-primary-foreground"
              }`}
              id="copy-referral-link-btn"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" /> Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link on your social media to track your referrals.
          </p>
        </div>

        {/* ── Stats Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Total Clicks */}
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center border border-border">
                <MousePointerClick className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Total Clicks</span>
            </div>
            <p className="text-3xl font-bold text-foreground font-display">{totalClicks}</p>
          </div>

          {/* Top Source */}
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center border border-border">
                <Activity className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Top Source</span>
            </div>
            <p className="text-lg font-bold text-foreground truncate">
              {sourceBreakdown.length > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span>{SOURCE_EMOJIS[sourceBreakdown[0].source] || "🔗"}</span>
                  {SOURCE_LABELS[sourceBreakdown[0].source] || sourceBreakdown[0].source}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm font-normal">No data yet</span>
              )}
            </p>
          </div>
        </div>

        {/* ── Source Breakdown ─────────────────────────────── */}
        {sourceBreakdown.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 mb-6">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Referral Sources
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Pie chart */}
              <div className="w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceBreakdown}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke="hsl(var(--card))"
                    >
                      {sourceBreakdown.map((entry) => (
                        <Cell
                          key={entry.source}
                          fill={SOURCE_COLORS[entry.source] || "#9CA3AF"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        SOURCE_LABELS[name] || name,
                      ]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-2">
                {sourceBreakdown.map((entry) => {
                  const pct = totalClicks > 0
                    ? Math.round((entry.count / totalClicks) * 100)
                    : 0;
                  return (
                    <div
                      key={entry.source}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SOURCE_COLORS[entry.source] || "#9CA3AF" }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {SOURCE_EMOJIS[entry.source] || "🔗"}{" "}
                          {SOURCE_LABELS[entry.source] || entry.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-foreground">{entry.count}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Recent Activity ─────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Recent Activity</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              className="rounded-xl text-muted-foreground hover:text-foreground"
              id="refresh-activity-btn"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>

          {recentClicks.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-muted/30 border border-dashed border-border">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-display text-base font-semibold text-foreground mb-1">
                No referral clicks yet
              </h3>
              <p className="text-muted-foreground text-xs">
                Share your referral link to start tracking visits.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {recentClicks.map((click) => (
                <div
                  key={click.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      backgroundColor: `${SOURCE_COLORS[click.referral_source] || "#9CA3AF"}18`,
                    }}
                  >
                    {SOURCE_EMOJIS[click.referral_source] || "🔗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {SOURCE_LABELS[click.referral_source] || "Direct"} click
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(click.clicked_at)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {timeAgo(click.clicked_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfluencerDashboard;
