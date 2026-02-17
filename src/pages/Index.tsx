import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, MapPin, Shield, Sparkles, ChevronRight } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";

const Index = () => {
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_sold", false)
        .order("created_at", { ascending: false })
        .limit(6);
      setRecentProducts(data || []);
    };
    fetchRecent();
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
          <div className="inline-flex items-center gap-2 bg-card/60 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Chennai's #1 Beauty Marketplace
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Rescue Beauty Products.{" "}
            <span className="text-gradient">Save Money.</span>{" "}
            Reduce Waste.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            Chennai's hyperlocal marketplace to buy, sell, and swap unused cosmetics.
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
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Chennai Only</div>
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
              { step: "3", icon: "🤝", title: "Meet & Swap", desc: "Arrange to meet in a safe public place in Chennai to complete the exchange." },
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

      {/* RECENTLY ADDED */}
      <section className="py-16 px-4 bg-card">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-1">Recently Added</h2>
              <p className="text-muted-foreground">Fresh listings from Chennai</p>
            </div>
            <Button variant="ghost" asChild className="flex items-center gap-1 text-primary">
              <Link to="/browse">See All <ChevronRight className="w-4 h-4" /></Link>
            </Button>
          </div>
          {recentProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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

      {/* SAFETY GUIDELINES */}
      <section className="py-16 px-4 gradient-hero">
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
              <div key={i} className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-card">
                <span className="text-2xl flex-shrink-0 mt-0.5">{tip.icon}</span>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{tip.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-card">
        <div className="container max-w-2xl mx-auto text-center">
          <div className="p-10 rounded-3xl gradient-cta text-white shadow-beauty">
            <h2 className="font-display text-3xl font-bold mb-3">Join Chennai Beauty Swap</h2>
            <p className="text-white/80 mb-6 text-lg">
              Join thousands of Chennai beauty lovers buying and selling smart.
            </p>
            <Button size="lg" asChild className="bg-white text-primary font-semibold hover:bg-white/90 rounded-xl px-8">
              <Link to="/auth?mode=signup">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* DISCLAIMER */}
      <div className="bg-muted/50 border-t border-border px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          ⚠️ <strong>Disclaimer:</strong> This platform only connects buyers and sellers. We are not responsible for product authenticity, allergic reactions, or transaction disputes. Meet only in public places. By using Chennai Beauty Swap, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
};

export default Index;
