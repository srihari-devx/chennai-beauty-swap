import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Package, CheckCircle, TrendingUp, ShieldAlert } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const COLORS = ["#e07ea0", "#b392d8", "#f4b8ce", "#8ecadf", "#f9d78e", "#7dc98e", "#f4956b", "#8fbff7"];

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, listings: 0, sold: 0 });
  const [areaData, setAreaData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "products" | "reports">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);

    const [profilesRes, productsRes, reportRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_reports").select("*, products(name, brand), profiles!product_reports_reporter_id_fkey(full_name)").order("created_at", { ascending: false }),
    ]);

    const allProducts = productsRes.data || [];
    const allProfiles = profilesRes.data || [];

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

    setUsers(allProfiles);
    setProducts(allProducts);
    setReports(reportRes.data || []);
    setLoading(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts(p => p.filter(prod => prod.id !== id));
      toast.success("Product deleted");
    }
  };

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Total Listings", value: stats.listings, icon: Package, color: "text-blue-500" },
    { label: "Sold Products", value: stats.sold, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Active Listings", value: stats.listings - stats.sold, icon: TrendingUp, color: "text-amber-500" },
  ];

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
        <div className="flex gap-2 mb-6 border-b border-border">
          {(["overview", "users", "products", "reports"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
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
                {/* Stats */}
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

                {/* Charts */}
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

            {activeTab === "users" && (
              <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Area</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
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
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seller</th>
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
                          <td className="px-4 py-3 text-muted-foreground">{p.profiles?.full_name}</td>
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
                          Reported by: {r.profiles?.full_name} · {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </p>
                        <p className="text-sm text-foreground mt-2 bg-muted/30 rounded-xl p-2">{r.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
