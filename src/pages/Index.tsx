import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, MapPin, Shield, Sparkles, ChevronRight, ChevronDown, Mail, Newspaper, Calendar, Tag } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { cleanImageUrl } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import NewsletterSection from "@/components/NewsletterSection";
import FeedbackForm from "@/components/FeedbackForm";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

/* ─── Article type (matches DB) ─── */
interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "beauty-tips": "bg-pink-100 text-pink-700",
  "platform-updates": "bg-blue-100 text-blue-700",
  safety: "bg-amber-100 text-amber-700",
  announcements: "bg-purple-100 text-purple-700",
  general: "bg-gray-100 text-gray-700",
};

/* ─── Carousel Dots Indicator ─── */
const CarouselDots = ({ api }: { api: CarouselApi | undefined }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
    onSelect();
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api, onSelect]);

  if (scrollSnaps.length <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-0 mt-5">
      {scrollSnaps.map((_, idx) => (
        <button
          key={idx}
          onClick={() => api?.scrollTo(idx)}
          aria-label={`Go to slide ${idx + 1}`}
          className="relative flex items-center justify-center w-12 h-12 cursor-pointer"
        >
          <span
            className={`rounded-full transition-all duration-300 block ${
              idx === selectedIndex
                ? "w-6 h-2 bg-primary"
                : "w-2 h-2 bg-primary/25 hover:bg-primary/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ArticleImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-40 gradient-hero flex items-center justify-center">
        <Newspaper className="w-10 h-10 text-primary/30" />
      </div>
    );
  }

  return (
    <img
      src={cleanImageUrl(src)}
      alt={alt}
      width={400}
      height={160}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
    />
  );
};

/* ─── FAQ Accordion Item ─── */
const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="bg-card rounded-2xl border border-border shadow-card overflow-hidden transition-all duration-200 hover:shadow-beauty"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground text-sm sm:text-base leading-snug">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "300px" : "0px", opacity: open ? 1 : 0 }}
      >
        <p className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

/* ─── Product Carousel ─── */
const ProductCarousel = ({
  products,
  setApi,
  api,
  isWishlisted,
  toggleWishlist,
}: {
  products: any[];
  setApi: (api: CarouselApi) => void;
  api: CarouselApi | undefined;
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (id: string) => Promise<boolean>;
}) => (
  <div>
    <Carousel
      opts={{ align: "start", loop: true }}
      setApi={setApi}
      className="w-full"
    >
      <CarouselContent className="-ml-3">
        {products.map((product) => (
          <CarouselItem
            key={product.id}
            className="pl-3 basis-1/2 sm:basis-1/3 lg:basis-1/4"
          >
            <ProductCard
              product={product}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={toggleWishlist}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-3 md:-left-5 bg-card/90 backdrop-blur-sm border-border shadow-card hover:bg-card" />
      <CarouselNext className="-right-3 md:-right-5 bg-card/90 backdrop-blur-sm border-border shadow-card hover:bg-card" />
    </Carousel>
    <CarouselDots api={api} />
  </div>
);

/* ─── Main Page ─── */
const Index = () => {
  const { user, profile } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [nearbyProducts, setNearbyProducts] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);
  const [showEmail, setShowEmail] = useState(false);

  /* Carousel APIs for dots */
  const [trendingApi, setTrendingApi] = useState<CarouselApi>();
  const [recentApi, setRecentApi] = useState<CarouselApi>();
  const [nearbyApi, setNearbyApi] = useState<CarouselApi>();
  const [articlesApi, setArticlesApi] = useState<CarouselApi>();

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_sold", false)
        .order("created_at", { ascending: false })
        .limit(8);
      setRecentProducts(data || []);
    };
    fetchRecent();
  }, []);

  // Near You products
  useEffect(() => {
    if (!profile?.area) return;
    const fetchNearby = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_sold", false)
        .eq("area", profile.area as any)
        .order("created_at", { ascending: false })
        .limit(8);
      setNearbyProducts(data || []);
    };
    fetchNearby();
  }, [profile?.area]);

  // Trending products (most viewed in last 7 days)
  useEffect(() => {
    const fetchTrending = async () => {
      const { data: viewData } = await supabase
        .from("product_views")
        .select("product_id")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (viewData && viewData.length > 0) {
        const counts: Record<string, number> = {};
        viewData.forEach(v => { counts[v.product_id] = (counts[v.product_id] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const ids = sorted.map(s => s[0]);

        if (ids.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("*")
            .in("id", ids)
            .eq("is_sold", false);
          setTrendingProducts(products || []);
          return;
        }
      }
      // Fallback: most recent
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_sold", false)
        .order("created_at", { ascending: false })
        .limit(8);
      setTrendingProducts(data || []);
    };
    fetchTrending();
  }, []);

  // Latest articles
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data } = await (supabase as any)
          .from("articles")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(5);
        setLatestArticles((data as Article[]) || []);
      } catch {
        // articles table may not exist yet
      }
    };
    fetchArticles();
  }, []);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="gradient-hero pt-16 pb-20 px-4 text-center overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-lavender/60 blur-3xl" />
        </div>
        <div className="container max-w-3xl mx-auto relative z-10 animate-fade-in">
          {user && profile ? (
            <div className="mb-6 flex flex-col items-center gap-2">
              <button
                onClick={() => setShowEmail((v) => !v)}
                aria-label={showEmail ? "Hide email address" : "Show email address"}
                className="inline-flex items-center gap-2 bg-card/70 border border-primary/20 rounded-full px-5 py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-full gradient-cta flex items-center justify-center text-white text-[10px] font-bold">
                  {profile.full_name?.[0]?.toUpperCase()}
                </div>
                <span className="text-foreground">
                  Welcome back, <strong>{profile.full_name?.split(' ')[0]}</strong>! ✨
                </span>
              </button>
              {showEmail && (
                <div className="inline-flex items-center gap-1.5 bg-card/80 border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground shadow-sm animate-fade-in">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </div>
              )}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-card/60 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              India's #1 Beauty Marketplace
            </div>
          )}
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Rescue Beauty Products.{" "}
            <span className="text-gradient">Save Money.</span>{" "}
            Reduce Waste.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            India's hyperlocal marketplace to buy, sell, and swap unused cosmetics.
            Connect with beauty lovers in your area — no payments, no delivery hassle.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gradient-cta border-0 text-primary-foreground shadow-beauty px-8 rounded-xl">
              <Link to="/browse">
                Browse Products <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-xl border-primary/30 hover:bg-primary/5">
              <Link to="/auth?mode=signup">Start Selling Free</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> All Across India</div>
            <div className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Safe & Verified</div>
            <div className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4 text-primary" /> In-App Chat</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 px-4 bg-card">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">How It Works</h2>
            <p className="text-muted-foreground">Three simple steps to your next beauty find</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: "📸", title: "List Your Product", desc: "Upload photos, set your price, and list your unused beauty products in minutes." },
              { step: "2", icon: "💬", title: "Chat with Buyer", desc: "Connect directly with interested buyers through our in-app chat — safe and simple." },
              { step: "3", icon: "🤝", title: "Meet & Swap", desc: "Arrange to meet in a safe public place in your city to complete the exchange." },
            ].map((item, i) => (
              <div key={i} className="relative text-center p-6 rounded-2xl bg-background border border-border shadow-card hover:shadow-beauty transition-all duration-300 group">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl gradient-cta flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
                  {item.step}
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BROWSE CATEGORIES */}
      <section className="py-16 px-4 gradient-hero">
        <div className="container max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-1">Browse by Category</h2>
              <p className="text-muted-foreground">Find exactly what you're looking for</p>
            </div>
            <Button variant="ghost" asChild className="hidden sm:flex items-center gap-1 text-primary">
              <Link to="/browse">View All <ChevronRight className="w-4 h-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {PRODUCT_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                to={`/browse?category=${cat.value}`}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all duration-200 text-center"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{cat.emoji}</span>
                <span className="text-xs font-medium text-foreground">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEAR YOU — CAROUSEL */}
      {user && nearbyProducts.length > 0 && (
        <section className="py-16 px-4 bg-card">
          <div className="container max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-1">📍 Near You</h2>
                <p className="text-muted-foreground">Products in {profile?.area}</p>
              </div>
              <Button variant="ghost" asChild className="flex items-center gap-1 text-primary">
                <Link to={`/browse?area=${profile?.area}`}>See All <ChevronRight className="w-4 h-4" /></Link>
              </Button>
            </div>
            <ProductCarousel products={nearbyProducts} setApi={setNearbyApi} api={nearbyApi} isWishlisted={isWishlisted} toggleWishlist={toggleWishlist} />
          </div>
        </section>
      )}

      {/* TRENDING NOW — CAROUSEL */}
      {trendingProducts.length > 0 && (
        <section className={`py-16 px-4 ${user && nearbyProducts.length > 0 ? "gradient-hero" : "bg-card"}`}>
          <div className="container max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-1">🔥 Trending Now</h2>
                <p className="text-muted-foreground">Most popular products this week</p>
              </div>
              <Button variant="ghost" asChild className="flex items-center gap-1 text-primary">
                <Link to="/browse">See All <ChevronRight className="w-4 h-4" /></Link>
              </Button>
            </div>
            <ProductCarousel products={trendingProducts} setApi={setTrendingApi} api={trendingApi} isWishlisted={isWishlisted} toggleWishlist={toggleWishlist} />
          </div>
        </section>
      )}

      {/* RECENTLY ADDED — CAROUSEL */}
      <section className="py-16 px-4 bg-card">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-1">Recently Added</h2>
              <p className="text-muted-foreground">Fresh listings from across India</p>
            </div>
            <Button variant="ghost" asChild className="flex items-center gap-1 text-primary">
              <Link to="/browse">See All <ChevronRight className="w-4 h-4" /></Link>
            </Button>
          </div>
          {recentProducts.length > 0 ? (
            <ProductCarousel products={recentProducts} setApi={setRecentApi} api={recentApi} isWishlisted={isWishlisted} toggleWishlist={toggleWishlist} />
          ) : (
            <div className="text-center py-16 bg-background rounded-2xl border border-dashed border-border">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-muted-foreground text-sm">No listings yet — be the first to sell!</p>
              <Button asChild size="sm" className="mt-4 gradient-cta border-0 text-primary-foreground">
                <Link to="/sell">List a Product</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* LATEST ARTICLES — CAROUSEL */}
      {latestArticles.length > 0 && (
        <section className="py-16 px-4 gradient-hero">
          <div className="container max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground mb-1">📰 Latest Articles</h2>
                <p className="text-muted-foreground">Tips, updates & beauty insights</p>
              </div>
              <Button variant="ghost" asChild className="flex items-center gap-1 text-primary">
                <Link to="/articles">View All <ChevronRight className="w-4 h-4" /></Link>
              </Button>
            </div>
            <Carousel
              opts={{ align: "start", loop: true }}
              setApi={setArticlesApi}
              className="w-full"
            >
              <CarouselContent className="-ml-3">
                {latestArticles.map((article) => (
                  <CarouselItem
                    key={article.id}
                    className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3"
                  >
                    <Link to={`/articles/${article.id}`} className="group block">
                      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden hover:shadow-beauty transition-all duration-300 group-hover:-translate-y-1 h-full flex flex-col">
                        {/* Cover image */}
                        <div className="w-full h-40 overflow-hidden bg-muted">
                          <ArticleImage
                            src={article.cover_image_url || ""}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {article.category && (
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                                CATEGORY_COLORS[article.category] || "bg-muted text-muted-foreground"
                              }`}>
                                <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                                {article.category.replace("-", " ")}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(article.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-semibold text-foreground mb-1.5 line-clamp-2 leading-snug">
                            {article.title}
                          </h3>
                          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 flex-1">
                            {article.excerpt || article.content.slice(0, 120) + "..."}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-primary text-xs font-medium group-hover:underline">
                            Read More <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-3 md:-left-5 bg-card/90 backdrop-blur-sm border-border shadow-card hover:bg-card" />
              <CarouselNext className="-right-3 md:-right-5 bg-card/90 backdrop-blur-sm border-border shadow-card hover:bg-card" />
            </Carousel>
            <CarouselDots api={articlesApi} />
          </div>
        </section>
      )}

      {/* SAFETY GUIDELINES */}
      <section className="py-16 px-4 bg-card">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">Stay Safe ✨</h2>
            <p className="text-muted-foreground">Your safety is our top priority</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: "🏬", title: "Meet in Public Places", desc: "Always meet in malls, coffee shops, or other busy public locations." },
              { icon: "🧪", title: "Check Before You Buy", desc: "Inspect the product carefully before accepting. Test swatches if allowed." },
              { icon: "📱", title: "Chat In-App Only", desc: "Keep all communication within the platform for your safety." },
              { icon: "⭐", title: "Rate Your Experience", desc: "Leave honest ratings to help others make informed decisions." },
            ].map((tip, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl bg-background border border-border shadow-card">
                <span className="text-2xl flex-shrink-0 mt-0.5">{tip.icon}</span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1 text-base">{tip.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-4 gradient-hero">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about Swaptics</p>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "What is Swaptics?",
                a: "Swaptics is India's hyperlocal marketplace for buying, selling, and swapping unused or gently-used beauty products. We connect beauty lovers in the same area so you can meet up safely — no shipping, no payment gateway."
              },
              {
                q: "Is Swaptics free to use?",
                a: "Yes! Listing products, browsing, and chatting with buyers/sellers is completely free. We don't charge any commission or listing fees."
              },
              {
                q: "How do payments work?",
                a: "Swaptics doesn't handle payments. Buyers and sellers arrange the price via in-app chat and exchange cash (or swap products) when they meet in person."
              },
              {
                q: "How do I know a product is authentic?",
                a: "We encourage sellers to upload photos of the retail bill, batch code, and the actual product. Always inspect the product carefully during meet-up before completing the deal."
              },
              {
                q: "Is it safe to meet strangers?",
                a: "Safety is our top priority. We recommend meeting in busy public places like malls or coffee shops, going with a friend, and keeping all communication within the app. Never share personal contact details."
              },
              {
                q: "What can I sell on Swaptics?",
                a: "You can sell any unused, sealed, swatched, or gently-used cosmetic and beauty products — lipsticks, foundations, skincare, fragrances, eyeshadows, and more. Expired or counterfeit products are not allowed."
              },
              {
                q: "What areas does Swaptics cover?",
                a: "Swaptics currently operates across major cities and towns in India — Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata, and many more. You can enter any location within India."
              },
            ].map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 gradient-hero">
        <div className="container max-w-2xl mx-auto text-center">
          <div className="p-10 rounded-3xl gradient-cta text-white shadow-beauty">
            <h2 className="font-display text-3xl font-bold mb-3">Join Swaptics</h2>
            <p className="text-white/80 mb-6 text-lg">
              Join thousands of beauty lovers across India buying and selling smart.
            </p>
            <Button size="lg" asChild className="bg-white text-primary font-semibold hover:bg-white/90 rounded-xl px-8">
              <Link to="/auth?mode=signup">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <NewsletterSection />

      {/* FEEDBACK */}
      <FeedbackForm />

      {/* DISCLAIMER */}
      <div className="bg-muted/50 border-t border-border px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          ⚠️ <strong>Disclaimer:</strong> This platform only connects buyers and sellers. We are not responsible for product authenticity, allergic reactions, or transaction disputes. Meet only in public places. By using Swaptics, you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline font-medium">terms of service</Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary hover:underline font-medium">privacy policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default Index;
