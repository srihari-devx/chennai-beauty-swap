import { Link } from "react-router-dom";
import { MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConditionBadge from "@/components/ConditionBadge";
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
    profiles?: { full_name: string; area: string } | null;
  };
  showChatButton?: boolean;
}

const ProductCard = ({ product, showChatButton = true }: ProductCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const categoryInfo = PRODUCT_CATEGORIES.find(c => c.value === product.category);
  const imageUrl = product.images?.[0];

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
          {/* Available badge */}
          {!product.is_sold && (
            <div className="absolute top-2 left-2">
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Available
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium truncate">{product.brand}</p>
              <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
            </div>
            <p className="text-primary font-bold text-sm whitespace-nowrap">₹{product.selling_price}</p>
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
