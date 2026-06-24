import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { cleanImageUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Calendar,
  User,
  Tag,
  Share2,
  Copy,
  Check,
  Facebook,
  Twitter,
  MessageCircle,
  Clock,
  ArrowRight,
  Newspaper
} from "lucide-react";
import { toast } from "sonner";

interface Article {
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

const CATEGORY_COLORS: Record<string, string> = {
  "beauty-tips": "bg-pink-100 text-pink-700 border-pink-200",
  "platform-updates": "bg-blue-100 text-blue-700 border-blue-200",
  safety: "bg-amber-100 text-amber-700 border-amber-200",
  announcements: "bg-purple-100 text-purple-700 border-purple-200",
  general: "bg-gray-100 text-gray-700 border-gray-200",
};

const getCategoryColor = (cat: string | null) => {
  if (!cat) return "bg-muted text-muted-foreground border-border";
  return CATEGORY_COLORS[cat] || "bg-muted text-muted-foreground border-border";
};

const formatCategory = (cat: string | null) => {
  if (!cat) return "General";
  return cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const ArticleImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center min-h-[200px]">
        <Newspaper className="w-12 h-12 text-primary/30" />
      </div>
    );
  }

  return (
    <img
      src={cleanImageUrl(src)}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};

const ArticleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchArticleData = async () => {
      setLoading(true);
      try {
        // Fetch article
        const { data: art, error } = await (supabase as any)
          .from("articles")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (art) {
          setArticle(art as Article);

          // Fetch related/recent articles (excluding current one)
          const { data: related } = await (supabase as any)
            .from("articles")
            .select("*")
            .eq("is_published", true)
            .neq("id", id)
            .order("created_at", { ascending: false })
            .limit(3);

          setRelatedArticles((related as Article[]) || []);
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        toast.error("Failed to load article.");
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [id]);

  // Use dynamic SEO
  useSEO({
    title: article?.title,
    description: article?.excerpt || article?.content.slice(0, 160),
    image: article?.cover_image_url || undefined,
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-4">
        <div className="max-w-md">
          <div className="text-5xl mb-4">📰</div>
          <h2 className="font-display text-2xl font-bold mb-2">Article Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The article you are looking for might have been removed or is no longer available.
          </p>
          <Button asChild className="gradient-cta border-0 text-white rounded-xl">
            <Link to="/articles">Back to Articles</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate reading time
  const words = article.content.split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  const shareTitle = encodeURIComponent(article.title);
  const shareUrl = encodeURIComponent(window.location.href);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Article Hero */}
      <section className="relative w-full h-[320px] md:h-[450px] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-40">
          <ArticleImage
            src={article.cover_image_url || ""}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute bottom-0 inset-x-0">
          <div className="container max-w-4xl mx-auto px-4 pb-8">
            <button
              onClick={() => navigate("/articles")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 mb-6 bg-background/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-border shadow-sm transition-all duration-200 hover:-translate-x-0.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Articles
            </button>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              {article.category && (
                <span
                  className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full border shadow-sm ${getCategoryColor(
                    article.category
                  )}`}
                >
                  <Tag className="w-3.5 h-3.5 inline mr-1" />
                  {formatCategory(article.category)}
                </span>
              )}
              <span className="text-sm text-foreground/80 font-medium flex items-center gap-1.5 bg-background/65 backdrop-blur-sm px-3 py-1 rounded-full border border-border/30">
                <Clock className="w-3.5 h-3.5" />
                {readingTime} min read
              </span>
            </div>

            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-tight leading-tight max-w-3xl">
              {article.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Article Content & Sidebar Layout */}
      <section className="container max-w-4xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-8 bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card">
            {/* Meta Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-cta flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground block">Swaptics Team</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3 text-primary" /> Author
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(article.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            {/* Paragraphs */}
            <div className="prose max-w-none text-foreground leading-relaxed text-base space-y-6 whitespace-pre-line">
              {article.content}
            </div>

            {/* Social Share Floating Container (Mobile and Desktop) */}
            <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Share this article
              </span>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="rounded-xl border-border hover:bg-muted text-xs gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="rounded-xl border-border hover:bg-green-50 hover:text-green-600 hover:border-green-200 text-xs gap-1.5"
                >
                  <a
                    href={`https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="rounded-xl border-border hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 text-xs gap-1.5"
                >
                  <a
                    href={`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="w-3.5 h-3.5" /> Twitter
                  </a>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="rounded-xl border-border hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-xs gap-1.5"
                >
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook className="w-3.5 h-3.5" /> Facebook
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Promo Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-lavender/50 to-background border border-primary/20 shadow-card">
              <span className="text-2xl mb-3 block">✨</span>
              <h3 className="font-display font-bold text-lg text-foreground mb-2">Have beauty products to share?</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Join Swaptics today. List your unused makeup and skincare products, connect with beauty lovers near you, and swap or sell easily.
              </p>
              <Button asChild className="w-full gradient-cta border-0 text-white rounded-xl text-xs">
                <Link to="/sell">List a Product</Link>
              </Button>
            </div>

            {/* Newsletter Subscription Widget */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-card">
              <h3 className="font-display font-semibold text-base text-foreground mb-2">Stay Updated</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Get the latest beauty tips and platform updates delivered straight to your inbox.
              </p>
              <Button asChild variant="outline" className="w-full border-primary/30 hover:bg-primary/5 text-xs rounded-xl">
                <Link to="/">Subscribe to Newsletter</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-border">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Related Articles</h2>
                <p className="text-muted-foreground text-sm">More tips and guidelines from our blog</p>
              </div>
              <Button variant="ghost" asChild className="text-primary hover:bg-primary/5 gap-1">
                <Link to="/articles">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedArticles.map((art) => (
                <Link
                  key={art.id}
                  to={`/articles/${art.id}`}
                  className="group bg-card rounded-2xl border border-border shadow-card overflow-hidden hover:shadow-beauty transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                >
                  <div className="w-full h-36 bg-muted overflow-hidden relative">
                    <ArticleImage
                      src={art.cover_image_url || ""}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(art.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <h3 className="font-display font-semibold text-foreground text-sm sm:text-base mb-2 line-clamp-2 leading-snug">
                      {art.title}
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 flex-1">
                      {art.excerpt || art.content.slice(0, 100) + "..."}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-primary text-xs font-semibold group-hover:underline">
                      Read More <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ArticleDetail;
