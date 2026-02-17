import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md";
  showValue?: boolean;
}

const StarRating = ({ rating, maxStars = 5, size = "sm", showValue = false }: StarRatingProps) => {
  const starSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star
          key={i}
          className={`${starSize} ${
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground"
          }`}
        />
      ))}
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1">
          {rating > 0 ? rating.toFixed(1) : "No ratings"}
        </span>
      )}
    </div>
  );
};

export default StarRating;
