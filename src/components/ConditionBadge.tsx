import { Badge } from "@/components/ui/badge";
import { PRODUCT_CONDITIONS } from "@/lib/constants";

interface ConditionBadgeProps {
  condition: string;
}

const ConditionBadge = ({ condition }: ConditionBadgeProps) => {
  const cond = PRODUCT_CONDITIONS.find(c => c.value === condition);
  if (!cond) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cond.color}`}>
      {cond.label}
    </span>
  );
};

export default ConditionBadge;
