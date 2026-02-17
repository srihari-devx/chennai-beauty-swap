import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Camera } from "lucide-react";
import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS, CHENNAI_AREAS } from "@/lib/constants";
import { toast } from "sonner";

const Sell = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    brand: "",
    name: "",
    category: "lipstick",
    condition: "sealed",
    expiry_date: "",
    original_price: "",
    selling_price: "",
    reason_for_selling: "",
    area: profile?.area || "T Nagar",
  });

  useEffect(() => {
    if (profile?.area) setForm(f => ({ ...f, area: profile.area }));
  }, [profile]);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    const newFiles = [...images, ...files].slice(0, 5);
    setImages(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (i: number) => {
    const newImages = images.filter((_, idx) => idx !== i);
    const newPreviews = imagePreviews.filter((_, idx) => idx !== i);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (images.length === 0) { toast.error("Please upload at least one image"); return; }
    setLoading(true);

    try {
      // Upload images
      const imageUrls: string[] = [];
      for (const file of images) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        imageUrls.push(publicUrl);
      }

      // Create product
      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        brand: form.brand,
        name: form.name,
        category: form.category as any,
        condition: form.condition as any,
        expiry_date: form.expiry_date || null,
        original_price: parseFloat(form.original_price),
        selling_price: parseFloat(form.selling_price),
        reason_for_selling: form.reason_for_selling || null,
        images: imageUrls,
        area: form.area as any,
      });

      if (error) throw error;
      toast.success("Product listed successfully! 🎉");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to list product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Sell a Product</h1>
          <p className="text-muted-foreground">List your unused beauty product and connect with buyers in Chennai.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
            <Label className="text-base font-semibold mb-3 block">Product Photos <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground mb-4">Upload 1–5 photos. First photo will be the cover image.</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border shadow-sm">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">Cover</div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all">
                  <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Add Photo</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground text-base">Product Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Brand <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Lakme, Maybelline" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Matte Lipstick Red" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category <span className="text-destructive">*</span></Label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {PRODUCT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Condition <span className="text-destructive">*</span></Label>
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} required className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {PRODUCT_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Original Price (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="599" min="0" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="299" min="0" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Area in Chennai <span className="text-destructive">*</span></Label>
              <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} required className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {CHENNAI_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason for Selling</Label>
              <textarea
                placeholder="e.g. Wrong shade, doesn't suit my skin tone..."
                value={form.reason_for_selling}
                onChange={e => setForm(f => ({ ...f, reason_for_selling: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="w-full gradient-cta border-0 text-primary-foreground rounded-xl"
          >
            <Upload className="w-4 h-4" />
            {loading ? "Listing your product..." : "List Product"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By listing, you confirm the product details are accurate and agree to meet buyers in public places.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Sell;
