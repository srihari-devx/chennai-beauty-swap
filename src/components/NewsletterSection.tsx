import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const NewsletterSection = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("newsletter_subscribers")
        .insert({
          email: trimmedEmail,
          name: name.trim() || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed! 🎉");
          setSubscribed(true);
        } else {
          toast.error("Something went wrong. Please try again.");
        }
      } else {
        setSubscribed(true);
        toast.success("Welcome aboard! You're now subscribed 🎉");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-lavender/40 blur-3xl" />
      </div>

      <div className="container max-w-2xl mx-auto relative z-10">
        <div className="bg-card/80 backdrop-blur-sm rounded-3xl border border-border shadow-beauty p-8 md:p-10 text-center">
          {/* Icon */}
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl gradient-cta flex items-center justify-center shadow-sm">
            <Mail className="w-6 h-6 text-white" />
          </div>

          {subscribed ? (
            <div className="animate-fade-in space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                You're Subscribed! 🎉
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                We'll keep you updated with the latest beauty products, articles, and exclusive deals from Swaptics.
              </p>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1 text-xs font-semibold text-primary mb-4">
                <Sparkles className="w-3 h-3" />
                Stay Updated
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                Subscribe to Our Newsletter
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto leading-relaxed">
                Get the latest beauty tips, new product alerts, exclusive articles, and platform updates delivered straight to your inbox.
              </p>

              <form onSubmit={handleSubscribe} className="space-y-3 max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl h-11 bg-background/80"
                  />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl h-11 bg-background/80"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl gradient-cta text-primary-foreground border-0 font-semibold text-sm shadow-sm hover:shadow-md transition-shadow"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  No spam, ever. Unsubscribe anytime.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
