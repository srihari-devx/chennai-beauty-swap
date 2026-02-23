import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface WishlistButtonProps {
  productId: string;
  isWishlisted: boolean;
  onToggle: (productId: string) => void;
  size?: "sm" | "md";
}

const WishlistButton = ({ productId, isWishlisted, onToggle, size = "sm" }: WishlistButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    onToggle(productId);
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const btnSize = size === "sm" ? "w-7 h-7" : "w-9 h-9";

  return (
    <button
      onClick={handleClick}
      className={`${btnSize} rounded-full flex items-center justify-center transition-all duration-200 ${
        isWishlisted
          ? "bg-red-500 text-white shadow-sm"
          : "bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-red-500 border border-border"
      }`}
      title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
    >
      <Heart className={`${iconSize} ${isWishlisted ? "fill-current" : ""}`} />
    </button>
  );
};

export default WishlistButton;
