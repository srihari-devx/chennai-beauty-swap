import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, CheckCircle, MapPin, Package, MessageCircle, Heart } from "lucide-react";
import ConditionBadge from "@/components/ConditionBadge";
import StarRating from "@/components/StarRating";
import TrustScore from "@/components/TrustScore";
import VerifiedBadge from "@/components/VerifiedBadge";
import SellerBadges from "@/components/SellerBadges";
import ProductCard from "@/components/ProductCard";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";
import { useTrustScore } from "@/hooks/useTrustScore";
import { useWishlist } from "@/hooks/useWishlist";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [sellerRating, setSellerRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const { score: trustScore, badges: sellerBadges, isVerified } = useTrustScore(user?.id);
  const { wishlistIds, isWishlisted, toggleWishlist } = useWishlist();

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [listingsRes, chatsRes, ratingsRes] = await Promise.all([
      supabase.from("products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("chats").select("*, products(*)").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order("created_at", { ascending: false }),
      supabase.from("ratings").select("rating").eq("seller_id", user.id),
    ]);

    setListings(listingsRes.data || []);

    if (chatsRes.data) {
      const withProfiles = await Promise.all(
        chatsRes.data.map(async (chat) => {
          const otherId = chat.buyer_id === user.id ? chat.seller_id : chat.buyer_id;
          const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", otherId).single();
          return { ...chat, other_name: p?.full_name };
        })
      );
      setChats(withProfiles);
    }

    if (ratingsRes.data && ratingsRes.data.length > 0) {
      const avg = ratingsRes.data.reduce((s, r) => s + r.rating, 0) / ratingsRes.data.length;
      setSellerRating(avg);
      setRatingCount(ratingsRes.data.length);
    }
    setLoading(false);
  };

  // Fetch wishlist products
  useEffect(() => {
    if (wishlistIds.size === 0) { setWishlistProducts([]); return; }
    const fetchWishlistProducts = async () => {
      const ids = Array.from(wishlistIds);
      const { data } = await supabase.from("products").select("*").in("id", ids);
      setWishlistProducts(data || []);
    };
    fetchWishlistProducts();
  }, [wishlistIds]);

  useEffect(() => { fetchData(); }, [user]);

  const markAsSold = async (id: string) => {
    const { error } = await supabase.from("products").update({ is_sold: true }).eq("id", id);
    if (!error) {
      setListings(l => l.map(p => p.id === id ? { ...p, is_sold: true } : p));
      toast.success("Marked as sold!");
    }
  };

  const deleteListing = (id: string) => {
    // L-6 fix: Replace native confirm() with toast-based confirmation
    toast("Delete this listing? This cannot be undone.", {
      action: { label: "Delete", onClick: async () => {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (!error) {
          setListings(l => l.filter(p => p.id !== id));
          toast.success("Listing deleted");
        }
      }},
      cancel: { label: "Cancel", onClick: () => {} },
      duration: 6000,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full gradient-cta flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-xl font-bold text-foreground">{profile?.full_name}</h2>
                {isVerified && <VerifiedBadge size="md" />}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> {profile?.area}
                </div>
                <StarRating rating={sellerRating} showValue />
                {ratingCount > 0 && <span className="text-xs text-muted-foreground">({ratingCount} ratings)</span>}
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold text-primary">{listings.filter(l => !l.is_sold).length}</p>
              <p className="text-xs text-muted-foreground">Active Listings</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <TrustScore score={trustScore} />
            <SellerBadges badges={sellerBadges} />
            <Button variant="outline" size="sm" onClick={() => navigate("/profile/edit")} className="rounded-xl ml-auto border-border">
              <Edit className="w-3.5 h-3.5 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        <Tabs defaultValue="listings">
          <TabsList className="w-full bg-muted rounded-xl mb-6 p-1">
            <TabsTrigger value="listings" className="flex-1 rounded-lg text-sm">
              <Package className="w-4 h-4 mr-1.5" /> My Listings
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex-1 rounded-lg text-sm">
              <Heart className="w-4 h-4 mr-1.5" /> Saved ({wishlistProducts.length})
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex-1 rounded-lg text-sm">
              <MessageCircle className="w-4 h-4 mr-1.5" /> Chats
            </TabsTrigger>
          </TabsList>

          {/* LISTINGS TAB */}
          <TabsContent value="listings">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{listings.length} listing{listings.length !== 1 ? "s" : ""}</p>
              <Button asChild size="sm" className="gradient-cta border-0 text-primary-foreground rounded-xl">
                <a href="/sell"><Plus className="w-4 h-4" /> Add Listing</a>
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                <div className="text-4xl mb-3">🛍️</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">No listings yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Start selling your unused beauty products!</p>
                <Button asChild className="gradient-cta border-0 text-primary-foreground rounded-xl">
                  <a href="/sell">List Your First Product</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map((product) => {
                  const catInfo = PRODUCT_CATEGORIES.find(c => c.value === product.category);
                  return (
                    <div key={product.id} className="bg-card rounded-2xl border border-border shadow-card p-4 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl gradient-hero">{catInfo?.emoji}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
                        <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-primary font-bold text-sm">₹{product.selling_price}</span>
                          <ConditionBadge condition={product.condition} />
                          {product.is_sold && (
                            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Sold</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!product.is_sold && (
                          <button
                            onClick={() => markAsSold(product.id)}
                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Mark as Sold"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/edit/${product.id}`)}
                          className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteListing(product.id)}
                          className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* WISHLIST TAB */}
          <TabsContent value="wishlist">
            {wishlistProducts.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                <div className="text-4xl mb-3">💖</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">No saved products</h3>
                <p className="text-muted-foreground text-sm mb-4">Browse and save products you love!</p>
                <Button asChild className="gradient-cta border-0 text-primary-foreground rounded-xl">
                  <a href="/browse">Browse Products</a>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {wishlistProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={isWishlisted(product.id)}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* CHATS TAB */}
          <TabsContent value="chats">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
                <div className="text-4xl mb-3">💬</div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">No chats yet</h3>
                <p className="text-muted-foreground text-sm">Browse products and start chatting with sellers.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => {
                  const catInfo = PRODUCT_CATEGORIES.find(c => c.value === chat.products?.category);
                  return (
                    <button
                      key={chat.id}
                      onClick={() => navigate(`/chats/${chat.id}`)}
                      className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:shadow-card transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center text-xl border border-border flex-shrink-0">
                        {catInfo?.emoji || "🎀"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{chat.other_name || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Re: {chat.products?.brand} {chat.products?.name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">View →</span>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
