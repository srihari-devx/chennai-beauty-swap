import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid
} from "recharts";
import {
  Link2, CircleDot, Trash2, Copy, ChevronDown, ChevronUp,
  MousePointerClick, Smartphone, Monitor, Users,
  TrendingUp, Trophy, Activity, Globe
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClickRecord {
  id: string;
  influencer_id: string;
  clicked_at: string;
  referral_source: string;
  user_agent: string | null;
}

interface Props {
  influencersList: any[];
  setInfluencersList: React.Dispatch<React.SetStateAction<any[]>>;
  onRefresh: () => void;
}

const SOURCE_META: Record<string, { color: string; label: string; emoji: string }> = {
  instagram: { color: "#E4405F", label: "Instagram", emoji: "📸" },
  youtube: { color: "#FF0000", label: "YouTube", emoji: "▶️" },
  whatsapp: { color: "#25D366", label: "WhatsApp", emoji: "💬" },
  facebook: { color: "#1877F2", label: "Facebook", emoji: "👤" },
  direct: { color: "#94a3b8", label: "Direct", emoji: "🔗" },
};

function detectDevice(ua: string | null): "mobile" | "desktop" {
  if (!ua) return "desktop";
  return /mobile|android|iphone|ipad|ipod|webos|blackberry|opera mini|iemobile/i.test(ua)
    ? "mobile" : "desktop";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function InfluencerInsightsTab({ influencersList, setInfluencersList, onRefresh }: Props) {
  const [allClicks, setAllClicks] = useState<ClickRecord[]>([]);
  const [clicksLoading, setClicksLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      setClicksLoading(true);
      const { data } = await supabase
        .from("referral_clicks")
        .select("*")
        .order("clicked_at", { ascending: false });
      setAllClicks((data || []) as ClickRecord[]);
      setClicksLoading(false);
    })();
  }, [influencersList]);

  const activeCount = influencersList.filter((i) => i.status === "active").length;

  const clicksThisMonth = useMemo(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return allClicks.filter((c) => new Date(c.clicked_at) >= start).length;
  }, [allClicks]);

  const timelineData = useMemo(() => {
    const map: Record<string, number> = {};
    allClicks.forEach((c) => { const d = c.clicked_at.slice(0, 10); map[d] = (map[d] || 0) + 1; });
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), clicks: map[key] || 0 };
    });
  }, [allClicks]);

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    allClicks.forEach((c) => { const s = c.referral_source || "direct"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map)
      .map(([key, value]) => ({ key, name: SOURCE_META[key]?.label || key, value, color: SOURCE_META[key]?.color || "#94a3b8" }))
      .sort((a, b) => b.value - a.value);
  }, [allClicks]);

  const leaderboard = useMemo(() => {
    const total: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const srcMap: Record<string, Record<string, number>> = {};
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    allClicks.forEach((c) => {
      total[c.influencer_id] = (total[c.influencer_id] || 0) + 1;
      if (new Date(c.clicked_at) >= start) monthly[c.influencer_id] = (monthly[c.influencer_id] || 0) + 1;
      if (!srcMap[c.influencer_id]) srcMap[c.influencer_id] = {};
      const s = c.referral_source || "direct";
      srcMap[c.influencer_id][s] = (srcMap[c.influencer_id][s] || 0) + 1;
    });
    return influencersList
      .map((inf) => {
        const topSrc = srcMap[inf.id] ? Object.entries(srcMap[inf.id]).sort((a, b) => b[1] - a[1])[0]?.[0] : null;
        return { ...inf, totalClicks: total[inf.id] || 0, monthClicks: monthly[inf.id] || 0, topSource: topSrc };
      })
      .sort((a, b) => b.totalClicks - a.totalClicks);
  }, [allClicks, influencersList]);

  const recentActivity = useMemo(() =>
    allClicks.slice(0, 20).map((c) => ({
      ...c, infName: influencersList.find((i) => i.id === c.influencer_id)?.name || "Unknown", device: detectDevice(c.user_agent),
    })), [allClicks, influencersList]);

  const getDetail = (id: string) => {
    const clicks = allClicks.filter((c) => c.influencer_id === id);
    const srcCount: Record<string, number> = {};
    clicks.forEach((c) => { const s = c.referral_source || "direct"; srcCount[s] = (srcCount[s] || 0) + 1; });
    return {
      total: clicks.length,
      sources: Object.entries(srcCount).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      recent: clicks.slice(0, 10),
    };
  };

  /* ─── Handlers ─── */

  const handleAdd = async () => {
    if (!email.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Please enter a valid email address."); return; }
    setAdding(true);
    try {
      const res = await supabase.functions.invoke("setup-influencer", { body: { email: email.trim(), name: name.trim() || undefined } });
      if (res.error) { toast.error(res.data?.error || res.error.message || "Failed to add influencer."); }
      else if (res.data?.error) { toast.error(res.data.error); }
      else { toast.success(`Influencer created: ${res.data?.influencer?.name || email}`); setEmail(""); setName(""); onRefresh(); }
    } catch (err: any) { toast.error(err.message || "Unexpected error"); }
    setAdding(false);
  };

  const handleToggle = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("influencers").update({ status: next }).eq("id", id);
    if (error) return toast.error("Failed to update status");
    setInfluencersList((p) => p.map((i) => (i.id === id ? { ...i, status: next } : i)));
    toast.success(`Influencer ${next === "active" ? "activated" : "deactivated"}`);
  };

  const handleRemove = (id: string) => {
    toast("Remove this influencer? Their referral data will be deleted.", {
      action: { label: "Remove", onClick: async () => {
        const { error } = await supabase.from("influencers").delete().eq("id", id);
        if (!error) { setInfluencersList((p) => p.filter((i) => i.id !== id)); toast.success("Influencer removed"); }
        else toast.error("Failed to remove influencer");
      }},
      cancel: { label: "Cancel", onClick: () => {} }, duration: 6000,
    });
  };

  const copyLink = (slug: string) => { navigator.clipboard.writeText(`${window.location.origin}/i/${slug}`); toast.success("Referral link copied!"); };
  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("Referral code copied!"); };

  const statCards = [
    { label: "Total Influencers", value: influencersList.length, icon: Users, color: "text-primary" },
    { label: "Active", value: activeCount, icon: CircleDot, color: "text-emerald-500" },
    { label: "Total Clicks", value: allClicks.length, icon: MousePointerClick, color: "text-blue-500" },
    { label: "This Month", value: clicksThisMonth, icon: TrendingUp, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Summary Stat Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{clicksLoading && i >= 2 ? "…" : s.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Charts ─── */}
      {allClicks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Clicks Over Time</h3>
              <span className="text-[10px] text-muted-foreground ml-auto">Last 30 days</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timelineData} margin={{ left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(340, 65%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(340, 65%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="clicks" stroke="hsl(340, 65%, 60%)" strokeWidth={2} fill="url(#clickGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Traffic Sources</h3>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {sourceData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {sourceData.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  {SOURCE_META[s.key]?.emoji} {s.name}: {s.value}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Leaderboard ─── */}
      {leaderboard.length > 0 && leaderboard[0].totalClicks > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-foreground">Influencer Leaderboard</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Influencer</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">This Month</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.slice(0, 5).map((inf, i) => (
                  <tr key={inf.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full gradient-cta flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {inf.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{inf.name}</p>
                          <p className="text-[10px] text-muted-foreground">/i/{inf.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-primary">{inf.totalClicks}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-foreground">{inf.monthClicks}</td>
                    <td className="px-3 py-2.5 text-center">
                      {inf.topSource ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted">
                          {SOURCE_META[inf.topSource]?.emoji} {SOURCE_META[inf.topSource]?.label || inf.topSource}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Add New Influencer ─── */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Add New Influencer</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Enter the email of an existing user to make them an influencer. A referral link and slug will be auto-generated.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-sm" />
          <Input type="text" placeholder="Display name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Button onClick={handleAdd} disabled={adding || !email.trim()} className="gradient-cta text-primary-foreground border-0">
            {adding ? "Adding..." : "Add Influencer"}
          </Button>
        </div>
      </div>

      {/* ─── All Influencers (expandable) ─── */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <h3 className="font-semibold text-foreground mb-4">All Influencers ({influencersList.length})</h3>
        <div className="space-y-2">
          {leaderboard.map((inf) => {
            const isExpanded = expandedId === inf.id;
            const detail = isExpanded ? getDetail(inf.id) : null;
            return (
              <div key={inf.id} className="rounded-xl border border-border overflow-hidden">
                <div
                  className="flex items-center justify-between py-3 px-4 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : inf.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full gradient-cta flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {inf.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{inf.name}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          inf.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          <CircleDot className="w-2.5 h-2.5" />
                          {inf.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">/i/{inf.slug} · {inf.totalClicks} clicks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleToggle(inf.id, inf.status); }}
                      className={`h-8 text-xs ${inf.status === "active" ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}`}
                    >
                      {inf.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleRemove(inf.id); }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                  </div>
                </div>

                {isExpanded && detail && (
                  <div className="px-4 py-4 border-t border-border bg-card space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-muted/30 rounded-lg border border-border px-3 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Referral Link</p>
                          <p className="text-xs text-foreground truncate font-mono">{window.location.origin}/i/{inf.slug}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => copyLink(inf.slug)} className="h-7 px-2 flex-shrink-0"><Copy className="w-3 h-3" /></Button>
                      </div>
                      <div className="bg-muted/30 rounded-lg border border-border px-3 py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Code</p>
                          <p className="text-xs text-foreground font-mono font-bold">{inf.referral_code}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => copyCode(inf.referral_code)} className="h-7 px-2"><Copy className="w-3 h-3" /></Button>
                      </div>
                    </div>

                    {detail.sources.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Traffic by Source</p>
                        <div className="space-y-1.5">
                          {detail.sources.map((s) => {
                            const pct = detail.total > 0 ? (s.count / detail.total) * 100 : 0;
                            const meta = SOURCE_META[s.source] || { color: "#94a3b8", label: s.source, emoji: "🔗" };
                            return (
                              <div key={s.source} className="flex items-center gap-2">
                                <span className="text-xs w-20 flex-shrink-0 flex items-center gap-1">{meta.emoji} {meta.label}</span>
                                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-16 text-right">{s.count} ({pct.toFixed(0)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {detail.recent.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Recent Clicks</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {detail.recent.map((click) => {
                            const device = detectDevice(click.user_agent);
                            const meta = SOURCE_META[click.referral_source || "direct"];
                            return (
                              <div key={click.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded-lg hover:bg-muted/30">
                                <span>{meta?.emoji || "🔗"}</span>
                                <span className="text-foreground">{meta?.label || click.referral_source}</span>
                                {device === "mobile" ? <Smartphone className="w-3 h-3 text-muted-foreground" /> : <Monitor className="w-3 h-3 text-muted-foreground" />}
                                <span className="text-muted-foreground ml-auto">{timeAgo(click.clicked_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {detail.total === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No clicks recorded yet for this influencer</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {influencersList.length === 0 && (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <div className="text-4xl mb-3">🔗</div>
              <p className="font-semibold text-foreground">No influencers added yet</p>
              <p className="text-muted-foreground text-sm">Add your first influencer above to start tracking referrals</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Recent Activity Feed ─── */}
      {recentActivity.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">Last 20 clicks</span>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {recentActivity.map((click) => {
              const meta = SOURCE_META[click.referral_source || "direct"];
              return (
                <div key={click.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="w-7 h-7 rounded-full gradient-cta flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {click.infName[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-xs truncate">{click.infName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      {meta?.emoji} {meta?.label || click.referral_source}
                      <span className="mx-0.5">·</span>
                      {click.device === "mobile" ? <Smartphone className="w-2.5 h-2.5 inline" /> : <Monitor className="w-2.5 h-2.5 inline" />}
                      <span>{click.device === "mobile" ? "Mobile" : "Desktop"}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(click.clicked_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
