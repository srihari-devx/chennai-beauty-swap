import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS, CHENNAI_AREAS } from "@/lib/constants";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [condition, setCondition] = useState("");
  const [area, setArea] = useState("");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category as any);
    if (condition) query = query.eq("condition", condition as any);
    if (area) query = query.eq("area", area as any);
    query = query.gte("selling_price", priceRange[0]).lte("selling_price", priceRange[1]);
    if (search) query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);

    const { data } = await query;
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [category, condition, area, priceRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const clearFilters = () => {
    setCategory("");
    setCondition("");
    setArea("");
    setPriceRange([0, 5000]);
    setSearch("");
  };

  const activeFilters = [category, condition, area].filter(Boolean).length;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Category</p>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(category === cat.value ? "" : cat.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                category === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Condition</p>
        <div className="flex flex-col gap-2">
          {PRODUCT_CONDITIONS.map((cond) => (
            <button
              key={cond.value}
              onClick={() => setCondition(condition === cond.value ? "" : cond.value)}
              className={`flex items-center px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                condition === cond.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {cond.label}
            </button>
          ))}
        </div>
      </div>

      {/* Area */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Area in Chennai</p>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Areas</option>
          {CHENNAI_AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Price Range */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">
          Price Range: <span className="text-primary">₹{priceRange[0]} – ₹{priceRange[1]}</span>
        </p>
        <Slider
          min={0}
          max={5000}
          step={100}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mt-2"
        />
      </div>

      {activeFilters > 0 && (
        <Button variant="outline" onClick={clearFilters} className="w-full rounded-xl text-sm">
          <X className="w-4 h-4" /> Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 py-4 sticky top-16 z-30">
        <div className="container max-w-6xl mx-auto flex gap-3 items-center">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search brands, products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-border bg-background"
              />
            </div>
            <Button type="submit" className="gradient-cta border-0 text-primary-foreground rounded-xl px-5">
              Search
            </Button>
          </form>

          {/* Mobile filter button */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden rounded-xl relative">
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilters > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-display">Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-card sticky top-36">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-foreground">Filters</h3>
              {activeFilters > 0 && (
                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                  {activeFilters} active
                </span>
              )}
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground text-sm">
              {loading ? "Loading..." : `${products.length} product${products.length !== 1 ? "s" : ""} found`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-[3/4]" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">No products found</h3>
              <p className="text-muted-foreground text-sm mb-4">Try adjusting your filters or search term</p>
              <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Browse;
