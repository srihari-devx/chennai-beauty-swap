import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cleanImageUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Newspaper,
  Calendar,
  Tag,
} from "lucide-react";

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
  "beauty-tips": "bg-pink-100 text-pink-700",
  "platform-updates": "bg-blue-100 text-blue-700",
  safety: "bg-amber-100 text-amber-700",
  announcements: "bg-purple-100 text-purple-700",
  general: "bg-gray-100 text-gray-700",
};

const getCategoryColor = (cat: string | null) => {
  if (!cat) return "bg-muted text-muted-foreground";
  return CATEGORY_COLORS[cat] || "bg-muted text-muted-foreground";
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
      <div className="w-full h-full bg-muted flex items-center justify-center min-h-[160px]">
        <Newspaper className="w-10 h-10 text-primary/30" />
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

const Articles = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("articles")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        if (!error && data) setArticles(data as Article[]);
      } catch {
        // articles table may not exist yet
      }
      setLoading(false);
    };
    fetchArticles();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="gradient-hero pt-12 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-lavender/60 blur-3xl" />
        </div>
        <div className="container max-w-3xl mx-auto relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-card/60 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6 shadow-sm">
            <Newspaper className="w-3.5 h-3.5" />
            Blog & Updates
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Articles
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Stay informed with beauty tips, platform updates, and safety
            guidelines from the Swaptics team.
          </p>
        </div>
      </section>

      {/* Articles List */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <div className="text-5xl mb-4">📰</div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                No Articles Yet
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Our team is working on publishing helpful articles about beauty
                tips, safety guidelines, and platform updates. Check back soon!
              </p>
              <Button
                asChild
                className="mt-6 gradient-cta border-0 text-primary-foreground rounded-xl"
              >
                <Link to="/">
                  Back to Home <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {articles.map((article, idx) => {
                return (
                  <article
                    key={article.id}
                    className="bg-card rounded-2xl border border-border shadow-card overflow-hidden hover:shadow-beauty transition-all duration-300 animate-fade-in group flex flex-col md:flex-row"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Cover image */}
                    <div className="w-full md:w-1/3 min-h-[160px] md:h-auto overflow-hidden bg-muted">
                      <Link to={`/articles/${article.id}`} className="block h-full">
                        <ArticleImage
                          src={article.cover_image_url || ""}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />
                      </Link>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {article.category && (
                            <span
                              className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${getCategoryColor(
                                article.category
                              )}`}
                            >
                              <Tag className="w-2.5 h-2.5 inline mr-1" />
                              {formatCategory(article.category)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(article.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3 leading-snug group-hover:text-primary transition-colors">
                          <Link to={`/articles/${article.id}`}>
                            {article.title}
                          </Link>
                        </h2>

                        {/* Excerpt */}
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                          {article.excerpt || article.content.slice(0, 200) + "..."}
                        </p>
                      </div>

                      {/* Read more link */}
                      <div>
                        <Link
                          to={`/articles/${article.id}`}
                          className="mt-4 inline-flex items-center gap-1.5 text-primary text-sm font-semibold hover:underline transition-all"
                        >
                          Read More <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Articles;
