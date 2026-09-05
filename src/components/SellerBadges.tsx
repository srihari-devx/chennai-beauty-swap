import { Award, Zap, ShieldCheck, Trophy, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const BADGE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  influencer: { label: "Influencer", icon: Sparkles, color: "text-pink-600", bg: "bg-pink-50" },
  first_sale: { label: "First Sale", icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
  five_sales: { label: "5 Sales", icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
  trusted_seller: { label: "Trusted Seller", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  fast_responder: { label: "Fast Responder", icon: Zap, color: "text-blue-600", bg: "bg-blue-50" },
};

interface SellerBadgesProps {
  badges: string[];
}

const SellerBadges = ({ badges }: SellerBadgesProps) => {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map(badge => {
        const config = BADGE_CONFIG[badge];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <Tooltip key={badge}>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}>
                <Icon className="w-3 h-3" /> {config.label}
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{config.label} badge earned!</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default SellerBadges;
