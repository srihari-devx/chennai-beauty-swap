import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
}

const VerifiedBadge = ({ size = "sm" }: VerifiedBadgeProps) => {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-emerald-600">
          <BadgeCheck className={`${iconSize} fill-emerald-500 text-white`} />
          {size === "md" && <span className="text-xs font-semibold text-emerald-600">Verified</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">Verified Seller — Invoice proof checked ✓</TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
