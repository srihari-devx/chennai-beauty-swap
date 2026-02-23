import { Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustScoreProps {
  score: number;
  showLabel?: boolean;
}

const TrustScore = ({ score, showLabel = true }: TrustScoreProps) => {
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-500" : "text-muted-foreground";
  const bgColor = score >= 70 ? "bg-emerald-50 border-emerald-200" : score >= 40 ? "bg-amber-50 border-amber-200" : "bg-muted border-border";
  const label = score >= 70 ? "Highly Trusted" : score >= 40 ? "Building Trust" : "New Seller";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${bgColor} ${color}`}>
          <Shield className="w-3 h-3" />
          <span>{score}</span>
          {showLabel && <span className="hidden sm:inline">· {label}</span>}
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs max-w-48">
        Trust Score ({score}/100): Based on verification, sales history, ratings & account age.
      </TooltipContent>
    </Tooltip>
  );
};

export default TrustScore;
