import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ChevronLeft, ChevronRight, MessageCircle, Flag, Star } from "lucide-react";
import ConditionBadge from "@/components/ConditionBadge";
import StarRating from "@/components/StarRating";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerRating, setSellerRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [canRate, setCanRate] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: prod } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      setProduct(prod);

      if (prod) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", prod.seller_id)
          .single();
        setSellerProfile(profile);

        const { data: ratings } = await supabase
          .from("ratings")
          .select("rating")
          .eq("seller_id", prod.seller_id);
        if (ratings && ratings.length > 0) {
          const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
          setSellerRating(avg);
          setRatingCount(ratings.length);
        }

        if (user) {
          // Check if user chatted with seller
          const { data: chat } = await supabase
            .from("chats")
            .select("id")
            .eq("buyer_id", user.id)
            .eq("seller_id", prod.seller_id)
            .single();
          setCanRate(!!chat && user.id !== prod.seller_id);

          // Check existing rating
          const { data: existingRating } = await supabase
            .from("ratings")
            .select("rating")
            .eq("rater_id", user.id)
            .eq("seller_id", prod.seller_id)
            .single();
          if (existingRating) setUserRating(existingRating.rating);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  const handleChat = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!product) return;
    setChatLoading(true);
    try {
      // Check if chat exists
      const { data: existing } = await supabase
        .from("chats")
        .select("id")
        .eq("product_id", product.id)
        .eq("buyer_id", user.id)
        .single();

      let chatId = existing?.id;

      if (!chatId) {
        const { data: newChat, error } = await supabase
          .from("chats")
          .insert({ product_id: product.id, buyer_id: user.id, seller_id: product.seller_id })
          .select("id")
          .single();
        if (error) throw error;
        chatId = newChat.id;
      }
      navigate(`/chats/${chatId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat");
    } finally {
      setChatLoading(false);
    }
  };

  const submitRating = async (rating: number) => {
    if (!user || !product) return;
    const { error } = await supabase
      .from("ratings")
      .upsert({ rater_id: user.id, seller_id: product.seller_id, rating }, { onConflict: "rater_id,seller_id" });
    if (!error) {
      setUserRating(rating);
      toast.success("Rating submitted!");
    }
  };

  const submitReport = async () => {
    if (!user || !product || !reportReason.trim()) return;
    await supabase.from("product_reports").insert({ product_id: product.id, reporter_id: user.id, reason: reportReason });
    toast.success("Report submitted. We'll review it.");
    setReportOpen(false);
    setReportReason("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="font-display text-xl font-semibold">Product not found</h2>
          <Button className="mt-4" onClick={() => navigate("/browse")}>Browse Products</Button>
        </div>
      </div>
    );
  }

  const catInfo = PRODUCT_CATEGORIES.find(c => c.value === product.category);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border shadow-card">
              {product.images?.length > 0 ? (
                <img
                  src={product.images[currentImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl gradient-hero">
                  {catInfo?.emoji || "🎀"}
                </div>
              )}
              {product.is_sold && (
                <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white bg-foreground/80 px-6 py-2 rounded-full">SOLD</span>
                </div>
              )}
              {product.images?.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage(p => Math.max(0, p - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 border border-border flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentImage(p => Math.min(product.images.length - 1, p + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 border border-border flex items-center justify-center hover:bg-card transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      currentImage === i ? "border-primary" : "border-border"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">{product.brand}</p>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <ConditionBadge condition={product.condition} />
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${product.is_sold ? "bg-muted text-muted-foreground border-border" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                  {product.is_sold ? "Sold" : "Available"}
                </span>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-primary">₹{product.selling_price}</span>
              {product.original_price > product.selling_price && (
                <span className="text-muted-foreground line-through text-lg">₹{product.original_price}</span>
              )}
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{catInfo?.emoji} {catInfo?.label}</span>
              </div>
              {product.expiry_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expiry Date</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(product.expiry_date).toLocaleDateString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium text-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {product.area}
                </span>
              </div>
            </div>

            {product.reason_for_selling && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Why selling?</p>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3 leading-relaxed">{product.reason_for_selling}</p>
              </div>
            )}

            {/* Seller Info */}
            {sellerProfile && (
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-cta flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {sellerProfile.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">{sellerProfile.full_name}</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={sellerRating} showValue />
                    {ratingCount > 0 && <span className="text-xs text-muted-foreground">({ratingCount})</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Button */}
            {!product.is_sold && user && user.id !== product.seller_id && (
              <Button
                onClick={handleChat}
                disabled={chatLoading}
                size="lg"
                className="w-full gradient-cta border-0 text-primary-foreground rounded-xl"
              >
                <MessageCircle className="w-4 h-4" />
                {chatLoading ? "Starting chat..." : "Chat Seller"}
              </Button>
            )}
            {!user && (
              <Button size="lg" className="w-full gradient-cta border-0 text-primary-foreground rounded-xl" onClick={() => navigate("/auth")}>
                <MessageCircle className="w-4 h-4" /> Sign in to Chat
              </Button>
            )}

            {/* Rate Seller */}
            {canRate && (
              <div className="bg-muted/30 rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  {userRating ? "Your Rating" : "Rate this Seller"}
                </p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => submitRating(star)}
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          star <= (hoverRating || userRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Report */}
            {user && user.id !== product.seller_id && (
              <div className="text-center">
                <button
                  onClick={() => setReportOpen(!reportOpen)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1"
                >
                  <Flag className="w-3 h-3" /> Report this listing
                </button>
                {reportOpen && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      placeholder="Reason for reporting..."
                      value={reportReason}
                      onChange={e => setReportReason(e.target.value)}
                      className="w-full text-sm border border-input rounded-xl p-3 bg-background text-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button size="sm" variant="destructive" onClick={submitReport} className="w-full rounded-xl">Submit Report</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
