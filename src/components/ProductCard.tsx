import { Link } from "react-router-dom";
import { MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConditionBadge from "@/components/ConditionBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import WishlistButton from "@/components/WishlistButton";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  product: {
    id: string;
    brand: string;
    name: string;
    condition: string;
    selling_price: number;
    area: string;
    images: string[];
    is_sold: boolean;
    category: string;
    seller_id: string;
    previous_price?: number | null;
    original_price?: number | null;
    price_reduced_at?: string | null;
    profiles?: { full_name: string; area: string; is_verified?: boolean } | null;
  };
  showChatButton?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
  sellerVerified?: boolean;
}

const ProductCard = ({ product, showChatButton = true, isWishlisted = false, onToggleWishlist, sellerVerified }: ProductCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categoryInfo = PRODUCT_CATEGORIES.find(c => c.value === product.category);
  const imageUrl = product.images?.[0];
  const isPriceReduced = !!product.price_reduced_at;

  const handleChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/product/${product.id}`);
  };

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="bg-card rounded-2xl border border-border shadow-card hover:shadow-beauty transition-all duration-300 overflow-hidden group-hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl gradient-hero">
              {categoryInfo?.emoji || "🎀"}
            </div>
          )}
          {/* Sold overlay */}
          {product.is_sold && (
            <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
              <span className="bg-card text-foreground text-sm font-bold px-3 py-1 rounded-full">Sold</span>
            </div>
          )}
          {/* Top badges row */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {!product.is_sold && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Available
              </span>
            )}
            {isPriceReduced && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Price Reduced
              </span>
            )}
          </div>
          {/* Wishlist button */}
          {onToggleWishlist && (
            <div className="absolute top-2 right-2">
              <WishlistButton
                productId={product.id}
                isWishlisted={isWishlisted}
                onToggle={onToggleWishlist}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground font-medium truncate">{product.brand}</p>
                {(sellerVerified || product.profiles?.is_verified) && <VerifiedBadge size="sm" />}
              </div>
              <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-primary font-bold text-sm whitespace-nowrap">₹{product.selling_price}</p>
              {product.original_price && product.original_price > product.selling_price && (
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground line-through">₹{product.original_price}</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded">
                    {Math.round(((product.original_price - product.selling_price) / product.original_price) * 100)}% saved
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mb-3">
            <ConditionBadge condition={product.condition} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{product.area}</span>
            </div>
          </div>

          {showChatButton && !product.is_sold && user?.id !== product.seller_id && (
            <Button
              size="sm"
              onClick={handleChat}
              className="w-full gradient-cta border-0 text-primary-foreground text-xs h-8 rounded-xl"
            >
              <MessageCircle className="w-3 h-3" />
              Chat Seller
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
