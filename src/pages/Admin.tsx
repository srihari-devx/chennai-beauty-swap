import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid
} from "recharts";
import {
  Users, Package, CheckCircle, TrendingUp, ShieldAlert,
  Clock, Trophy, UserPlus, Trash2, Activity, Newspaper, Plus, Edit, Eye, EyeOff
} from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ArticleRow {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
}

const COLORS = ["#e07ea0", "#b392d8", "#f4b8ce", "#8ecadf", "#f9d78e", "#7dc98e", "#f4956b", "#8fbff7"];

interface FunnelData { stage: string; count: number }
interface HourData { hour: string; count: number }
interface LeaderEntry { name: string; sales: number; userId: string }

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, listings: 0, sold: 0 });
  const [areaData, setAreaData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [avgTimeToSell, setAvgTimeToSell] = useState<string>("N/A");
  const [hourData, setHourData] = useState<HourData[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "users" | "products" | "reports" | "admins" | "articles">("overview");
  const [loading, setLoading] = useState(true);
  const [managingUserId, setManagingUserId] = useState<string | null>(null);

  // Articles state
  const [articlesList, setArticlesList] = useState<ArticleRow[]>([]);
  const [articleForm, setArticleForm] = useState({ title: "", content: "", excerpt: "", category: "general", cover_image_url: "", is_published: false });
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [savingArticle, setSavingArticle] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);

    const [profilesRes, productsRes, reportRes, viewsRes, chatsRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_reports").select("*, products(name, brand)").order("created_at", { ascending: false }),
      supabase.from("product_views").select("product_id"),
      supabase.from("chats").select("product_id"),
      supabase.from("user_roles").select("*").eq("role", "admin"),
    ]);

    const allProducts = productsRes.data || [];
    const allProfiles = profilesRes.data || [];
    const allViews = viewsRes.data || [];
    const allChats = chatsRes.data || [];

    setStats({
      users: allProfiles.length,
      listings: allProducts.length,
      sold: allProducts.filter(p => p.is_sold).length,
    });

    // Area distribution
    const areaCounts: Record<string, number> = {};
    allProducts.forEach(p => { areaCounts[p.area] = (areaCounts[p.area] || 0) + 1; });
    setAreaData(Object.entries(areaCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8));

    // Category distribution
    const catCounts: Record<string, number> = {};
    allProducts.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
    setCategoryData(Object.entries(catCounts).map(([name, value]) => {
      const cat = PRODUCT_CATEGORIES.find(c => c.value === name);
      return { name: cat?.label || name, value };
    }));

    // Conversion funnel
    const uniqueViewedProducts = new Set(allViews.map(v => v.product_id)).size;
    const uniqueChattedProducts = new Set(allChats.map(c => c.product_id)).size;
    const soldCount = allProducts.filter(p => p.is_sold).length;
    setFunnelData([
      { stage: "Views", count: uniqueViewedProducts },
      { stage: "Chats Started", count: uniqueChattedProducts },
      { stage: "Sold", count: soldCount },
    ]);

    // Average time to sell
    const soldProducts = allProducts.filter(p => p.is_sold && p.updated_at && p.created_at);
    if (soldProducts.length > 0) {
      const totalDays = soldProducts.reduce((sum, p) => {
        const created = new Date(p.created_at).getTime();
        const sold = new Date(p.updated_at).getTime();
        return sum + (sold - created) / (1000 * 60 * 60 * 24);
      }, 0);
      const avg = totalDays / soldProducts.length;
      setAvgTimeToSell(avg < 1 ? `${Math.round(avg * 24)}h` : `${avg.toFixed(1)} days`);
    }

    // Most active hour
    const hourCounts: Record<number, number> = {};
    allProducts.forEach(p => {
      const h = new Date(p.created_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    setHourData(
      Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, "0")}:00`,
        count: hourCounts[i] || 0,
      }))
    );

    // Top 5 sellers
    const sellerSales: Record<string, number> = {};
    allProducts.filter(p => p.is_sold).forEach(p => {
      sellerSales[p.seller_id] = (sellerSales[p.seller_id] || 0) + 1;
    });
    const topSellers = Object.entries(sellerSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, sales]) => {
        const profile = allProfiles.find(p => p.user_id === userId);
        return { name: profile?.full_name || "Unknown", sales, userId };
      });
    setLeaderboard(topSellers);

    setUsers(allProfiles);
    setProducts(allProducts);
    setReports(reportRes.data || []);
    // Map admin roles with profile data
    const adminRoles = rolesRes.data || [];
    const adminsWithProfiles = adminRoles.map(a => {
      const profile = allProfiles.find(p => p.user_id === a.user_id);
      return { ...a, profile };
    });
    setAdmins(adminsWithProfiles);

    // Articles
    const { data: articlesData } = await (supabase as any)
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    setArticlesList((articlesData as ArticleRow[]) || []);

    setLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user and all their data?")) return;
    
    setManagingUserId(userId);
    try {
      // Get user's product IDs first (needed for cascading deletes)
      const { data: userProducts } = await supabase
        .from("products")
        .select("id")
        .eq("seller_id", userId);
      const productIds = (userProducts || []).map(p => p.id);

      // Delete related data in correct order
      if (productIds.length > 0) {
        await supabase.from("product_views").delete().in("product_id", productIds);
        await supabase.from("product_reports").delete().in("product_id", productIds);
        await supabase.from("wishlists").delete().in("product_id", productIds);
        // Delete chats & messages for user's products
        const { data: chats } = await supabase.from("chats").select("id").in("product_id", productIds);
        const chatIds = (chats || []).map(c => c.id);
        if (chatIds.length > 0) {
          await supabase.from("messages").delete().in("chat_id", chatIds);
        }
        await supabase.from("chats").delete().in("product_id", productIds);
        await supabase.from("products").delete().eq("seller_id", userId);
      }

      // Delete user's own chats as buyer
      const { data: buyerChats } = await supabase.from("chats").select("id").eq("buyer_id", userId);
      const buyerChatIds = (buyerChats || []).map(c => c.id);
      if (buyerChatIds.length > 0) {
        await supabase.from("messages").delete().in("chat_id", buyerChatIds);
        await supabase.from("chats").delete().eq("buyer_id", userId);
      }

      // Delete remaining user-specific data
      await supabase.from("wishlists").delete().eq("user_id", userId);
      await supabase.from("notifications").delete().eq("user_id", userId);
      await supabase.from("ratings").delete().eq("rater_id", userId);
      await supabase.from("ratings").delete().eq("seller_id", userId);
      await supabase.from("seller_badges").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // Finally delete the profile
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;

      // Delete from auth.users via secure SQL RPC (prevents reappearing on refresh)
      // @ts-ignore - The RPC function exists in Supabase but might not be in the generated types yet
      const { error: rpcError } = await supabase.rpc("admin_delete_user", {
        target_user_id: userId,
      });
      if (rpcError) {
        console.warn("Auth user deletion warning:", rpcError.message);
        // Still consider it a success since profile data is removed
      }

      setUsers(u => u.filter(user => user.user_id !== userId));
      setStats(s => ({ ...s, users: s.users - 1 }));
      toast.success("User and all their data deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete user: " + (error.message || "Unknown error"));
    } finally {
      setManagingUserId(null);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts(p => p.filter(prod => prod.id !== id));
      toast.success("Product deleted");
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    // Find profile by looking up all profiles — we match by checking auth
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    // We need to use the edge function to find user by email
    const res = await supabase.functions.invoke("setup-admin", {
      body: { email: newAdminEmail.trim(), password: null },
    });
    if (res.error) {
      toast.error("Failed to add admin: " + res.error.message);
    } else if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`Admin role granted to ${newAdminEmail}`);
      setNewAdminEmail("");
      fetchData();
    }
    setAddingAdmin(false);
  };

  const removeAdmin = async (userId: string) => {
    if (!confirm("Remove admin role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (!error) {
      setAdmins(a => a.filter(admin => admin.user_id !== userId));
      toast.success("Admin role removed");
    }
  };

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Total Listings", value: stats.listings, icon: Package, color: "text-blue-500" },
    { label: "Sold Products", value: stats.sold, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Avg Time to Sell", value: avgTimeToSell, icon: Clock, color: "text-amber-500" },
  ];

  const tabs = ["overview", "analytics", "users", "products", "reports", "admins", "articles"] as const;

  const ARTICLE_CATEGORIES = [
    { value: "general", label: "General" },
    { value: "beauty-tips", label: "Beauty Tips" },
    { value: "platform-updates", label: "Platform Updates" },
    { value: "safety", label: "Safety" },
    { value: "announcements", label: "Announcements" },
  ];

  const resetArticleForm = () => {
    setArticleForm({ title: "", content: "", excerpt: "", category: "general", cover_image_url: "", is_published: false });
    setEditingArticleId(null);
    setShowArticleForm(false);
  };

  const handleSaveArticle = async () => {
    if (!articleForm.title.trim() || !articleForm.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSavingArticle(true);
    const payload = {
      title: articleForm.title.trim(),
      content: articleForm.content.trim(),
      excerpt: articleForm.excerpt.trim() || null,
      category: articleForm.category,
      cover_image_url: articleForm.cover_image_url.trim() || null,
      is_published: articleForm.is_published,
      updated_at: new Date().toISOString(),
    };

    if (editingArticleId) {
      const { error } = await (supabase as any).from("articles").update(payload).eq("id", editingArticleId);
      if (error) { toast.error("Failed to update article"); }
      else {
        toast.success("Article updated!");
        setArticlesList(prev => prev.map(a => a.id === editingArticleId ? { ...a, ...payload } : a));
        resetArticleForm();
      }
    } else {
      const { data, error } = await (supabase as any).from("articles").insert({ ...payload, author_id: (await supabase.auth.getUser()).data.user?.id }).select().single();
      if (error) { toast.error("Failed to create article: " + error.message); }
      else {
        toast.success("Article created!");
        setArticlesList(prev => [data as ArticleRow, ...prev]);
        resetArticleForm();
      }
    }
    setSavingArticle(false);
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    const { error } = await (supabase as any).from("articles").delete().eq("id", id);
    if (!error) {
      setArticlesList(prev => prev.filter(a => a.id !== id));
      toast.success("Article deleted");
    }
  };

  const handleEditArticle = (article: ArticleRow) => {
    setArticleForm({
      title: article.title,
      content: article.content,
      excerpt: article.excerpt || "",
      category: article.category || "general",
      cover_image_url: article.cover_image_url || "",
      is_published: article.is_published,
    });
    setEditingArticleId(article.id);
    setShowArticleForm(true);
  };

  const togglePublish = async (article: ArticleRow) => {
    const newStatus = !article.is_published;
    const { error } = await (supabase as any).from("articles").update({ is_published: newStatus, updated_at: new Date().toISOString() }).eq("id", article.id);
    if (!error) {
      setArticlesList(prev => prev.map(a => a.id === article.id ? { ...a, is_published: newStatus } : a));
      toast.success(newStatus ? "Article published!" : "Article unpublished");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Chennai Beauty Swap — Platform Overview</p>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {tab === "reports" && reports.length > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{reports.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {statCards.map((s, i) => (
                    <div key={i} className="bg-card rounded-2xl border border-border shadow-card p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                    <h3 className="font-semibold text-foreground mb-4">Products by Area</h3>
                    {areaData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={areaData} margin={{ left: -20, bottom: 40 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(340 65% 60%)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center text-muted-foreground text-sm py-10">No data yet</p>}
                  </div>

                  <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                    <h3 className="font-semibold text-foreground mb-4">Products by Category</h3>
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                            {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center text-muted-foreground text-sm py-10">No data yet</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Conversion Funnel */}
                <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Conversion Funnel</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={funnelData} margin={{ left: -10 }}>
                      <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {funnelData.map((_, i) => (
                          <Cell key={i} fill={["#8ecadf", "#b392d8", "#7dc98e"][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
                    {funnelData.map((d, i) => (
                      <span key={i}>
                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: ["#8ecadf", "#b392d8", "#7dc98e"][i] }} />
                        {d.stage}: {d.count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Most Active Hour */}
                  <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Listings by Hour of Day</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={hourData} margin={{ left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="hsl(340 65% 60%)" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top 5 Sellers */}
                  <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold text-foreground">Top 5 Sellers</h3>
                    </div>
                    {leaderboard.length > 0 ? (
                      <div className="space-y-3">
                        {leaderboard.map((seller, i) => (
                          <div key={seller.userId} className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0 ? "bg-amber-100 text-amber-700" :
                              i === 1 ? "bg-gray-100 text-gray-600" :
                              i === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{seller.name}</p>
                            </div>
                            <span className="text-sm font-bold text-primary">{seller.sales} sales</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-center text-muted-foreground text-sm py-10">No sales yet</p>}
                  </div>
                </div>

                {/* Most Active Area */}
                <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                  <h3 className="font-semibold text-foreground mb-2">Most Active Area</h3>
                  {areaData.length > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-cta flex items-center justify-center text-white text-lg">📍</div>
                      <div>
                        <p className="text-lg font-bold text-foreground">{areaData[0].name}</p>
                        <p className="text-sm text-muted-foreground">{areaData[0].count} listings</p>
                      </div>
                    </div>
                  ) : <p className="text-muted-foreground text-sm">No data</p>}
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Area</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full gradient-cta flex items-center justify-center text-white text-xs font-bold">
                                {u.full_name?.[0]?.toUpperCase()}
                              </div>
                              {u.full_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{u.area}</td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(u.user_id)}
                                disabled={managingUserId === u.user_id}
                                className="h-7 px-2.5 text-xs rounded-lg gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                {managingUserId === u.user_id ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{p.brand} {p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.area}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-primary">₹{p.selling_price}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.is_sold ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700"}`}>
                              {p.is_sold ? "Sold" : "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="destructive" onClick={() => deleteProduct(p.id)} className="h-7 px-2 text-xs rounded-lg">Delete</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="font-semibold text-foreground">No reports yet</p>
                    <p className="text-muted-foreground text-sm">The platform looks clean!</p>
                  </div>
                ) : reports.map((r) => (
                  <div key={r.id} className="bg-card rounded-2xl border border-destructive/20 p-4 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {r.products?.brand} {r.products?.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </p>
                        <p className="text-sm text-foreground mt-2 bg-muted/30 rounded-xl p-2">{r.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "admins" && (
              <div className="space-y-6">
                {/* Add Admin */}
                <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Add New Admin</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter the email of an existing user to grant them admin privileges.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button onClick={addAdmin} disabled={addingAdmin || !newAdminEmail.trim()} className="gradient-cta text-primary-foreground border-0">
                      {addingAdmin ? "Adding..." : "Add Admin"}
                    </Button>
                  </div>
                </div>

                {/* Current Admins */}
                <div className="bg-card rounded-2xl border border-border shadow-card p-5">
                  <h3 className="font-semibold text-foreground mb-4">Current Admins</h3>
                  <div className="space-y-3">
                    {admins.map(a => (
                      <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-cta flex items-center justify-center text-white text-xs font-bold">
                            {a.profile?.full_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{a.profile?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{a.profile?.area}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeAdmin(a.user_id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    {admins.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No admins found</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── ARTICLES TAB ─── */}
            {activeTab === "articles" && (
              <div className="space-y-6">
                {/* Create / Edit Form Toggle */}
                {!showArticleForm ? (
                  <Button onClick={() => { resetArticleForm(); setShowArticleForm(true); }} className="gradient-cta text-primary-foreground border-0 gap-2">
                    <Plus className="w-4 h-4" /> New Article
                  </Button>
                ) : (
                  <div className="bg-card rounded-2xl border border-border shadow-card p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Newspaper className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{editingArticleId ? "Edit Article" : "Create New Article"}</h3>
                      </div>
                      <button onClick={resetArticleForm} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="articleTitle">Title *</Label>
                        <Input
                          id="articleTitle"
                          value={articleForm.title}
                          onChange={e => setArticleForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Article title"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="articleCategory">Category</Label>
                          <select
                            id="articleCategory"
                            value={articleForm.category}
                            onChange={e => setArticleForm(f => ({ ...f, category: e.target.value }))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {ARTICLE_CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="articleCover">Cover Image URL</Label>
                          <Input
                            id="articleCover"
                            value={articleForm.cover_image_url}
                            onChange={e => setArticleForm(f => ({ ...f, cover_image_url: e.target.value }))}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="articleExcerpt">Excerpt (short summary)</Label>
                        <Input
                          id="articleExcerpt"
                          value={articleForm.excerpt}
                          onChange={e => setArticleForm(f => ({ ...f, excerpt: e.target.value }))}
                          placeholder="Brief description shown in previews"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="articleContent">Content *</Label>
                        <textarea
                          id="articleContent"
                          value={articleForm.content}
                          onChange={e => setArticleForm(f => ({ ...f, content: e.target.value }))}
                          placeholder="Write your article content here..."
                          rows={10}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="articlePublish"
                          checked={articleForm.is_published}
                          onChange={e => setArticleForm(f => ({ ...f, is_published: e.target.checked }))}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                        <label htmlFor="articlePublish" className="text-sm text-foreground cursor-pointer">Publish immediately</label>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleSaveArticle} disabled={savingArticle} className="gradient-cta text-primary-foreground border-0">
                          {savingArticle ? "Saving..." : editingArticleId ? "Update Article" : "Create Article"}
                        </Button>
                        <Button variant="outline" onClick={resetArticleForm}>Cancel</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Articles List */}
                {articlesList.length === 0 ? (
                  <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                    <div className="text-4xl mb-3">📰</div>
                    <p className="font-semibold text-foreground">No articles yet</p>
                    <p className="text-muted-foreground text-sm">Create your first article above!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {articlesList.map(article => (
                      <div key={article.id} className="bg-card rounded-2xl border border-border shadow-card p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                article.is_published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {article.is_published ? "Published" : "Draft"}
                              </span>
                              {article.category && (
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {article.category.replace("-", " ")}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-foreground truncate">{article.title}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(article.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                            {article.excerpt && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{article.excerpt}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => togglePublish(article)} className="h-8 px-2" title={article.is_published ? "Unpublish" : "Publish"}>
                              {article.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEditArticle(article)} className="h-8 px-2">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteArticle(article.id)} className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
