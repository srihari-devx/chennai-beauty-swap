import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Star, CheckCircle2, Bug, Lightbulb, Heart } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "general", label: "General", icon: Heart, color: "text-pink-500 bg-pink-50 border-pink-200" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-500 bg-red-50 border-red-200" },
];

const FeedbackForm = () => {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { toast.error("Please enter your name."); return; }
    if (!email.trim()) { toast.error("Please enter your email."); return; }
    if (rating === 0) { toast.error("Please select a rating."); return; }
    if (!message.trim()) { toast.error("Please write a message."); return; }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("feedback")
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          rating,
          category,
          message: message.trim(),
          user_id: user?.id || null,
        });

      if (error) {
        toast.error("Failed to submit feedback. Please try again.");
      } else {
        setSubmitted(true);
        toast.success("Thank you for your feedback! 💖");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <section className="py-16 px-4 bg-card">
        <div className="container max-w-2xl mx-auto">
          <div className="rounded-3xl border border-border shadow-beauty p-10 text-center bg-background animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">
              Feedback Submitted! 🎉
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
              We appreciate you taking the time to share your thoughts. Your feedback helps us make Swaptics better for everyone.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setRating(0);
                setMessage("");
                setCategory("general");
              }}
              className="rounded-xl"
            >
              Submit Another
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-card">
      <div className="container max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl gradient-cta flex items-center justify-center shadow-sm">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">
            We'd Love Your Feedback
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Help us improve Swaptics! Share your experience, suggest features, or report issues.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border shadow-card p-6 md:p-8 bg-background space-y-5"
        >
          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feedbackName">Name</Label>
              <Input
                id="feedbackName"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedbackEmail">Email</Label>
              <Input
                id="feedbackEmail"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                    category === cat.value
                      ? cat.color + " border-current shadow-sm scale-[1.02]"
                      : "border-border bg-background hover:border-primary/20 hover:bg-muted/30"
                  }`}
                >
                  <cat.icon className={`w-4 h-4 ${category === cat.value ? "" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${category === cat.value ? "" : "text-muted-foreground"}`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 transition-transform duration-150 hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 transition-colors duration-150 ${
                      star <= (hoveredRating || rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-medium">
                  {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="feedbackMessage">Message</Label>
            <textarea
              id="feedbackMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              rows={4}
              required
              className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y placeholder:text-muted-foreground"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl gradient-cta text-primary-foreground border-0 font-semibold text-sm shadow-sm hover:shadow-md transition-shadow"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default FeedbackForm;
