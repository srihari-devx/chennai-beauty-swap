import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface PriceRangeFilterProps {
  value: number[];
  onChange: (range: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

const PRESETS = [
  { label: "Under ₹200", range: [0, 200] },
  { label: "₹200–500", range: [200, 500] },
  { label: "₹500–1K", range: [500, 1000] },
  { label: "₹1K–2K", range: [1000, 2000] },
  { label: "₹2K+", range: [2000, 5000] },
];

const PriceRangeFilter = ({
  value,
  onChange,
  min = 0,
  max = 5000,
  step = 50,
}: PriceRangeFilterProps) => {
  const [localMin, setLocalMin] = useState(String(value[0]));
  const [localMax, setLocalMax] = useState(String(value[1]));

  // Sync local inputs when external value changes (e.g. from slider or clear)
  useEffect(() => {
    setLocalMin(String(value[0]));
    setLocalMax(String(value[1]));
  }, [value[0], value[1]]);

  const handleSliderChange = (newValue: number[]) => {
    onChange(newValue);
  };

  const handleMinBlur = () => {
    let v = Math.max(min, Math.min(Number(localMin) || 0, value[1]));
    v = Math.round(v / step) * step;
    setLocalMin(String(v));
    onChange([v, value[1]]);
  };

  const handleMaxBlur = () => {
    let v = Math.min(max, Math.max(Number(localMax) || 0, value[0]));
    v = Math.round(v / step) * step;
    setLocalMax(String(v));
    onChange([value[0], v]);
  };

  const handleMinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleMinBlur();
  };

  const handleMaxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleMaxBlur();
  };

  const isPresetActive = (range: number[]) =>
    value[0] === range[0] && value[1] === range[1];

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">Price Range</p>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.range)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              isPresetActive(preset.range)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Min / Max Inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Min ₹</label>
          <Input
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={handleMinBlur}
            onKeyDown={handleMinKeyDown}
            min={min}
            max={value[1]}
            className="rounded-lg h-9 text-sm text-center"
          />
        </div>
        <div className="text-muted-foreground text-xs mt-4">–</div>
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1 block">Max ₹</label>
          <Input
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={handleMaxBlur}
            onKeyDown={handleMaxKeyDown}
            min={value[0]}
            max={max}
            className="rounded-lg h-9 text-sm text-center"
          />
        </div>
      </div>

      {/* Dual-Thumb Slider */}
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={handleSliderChange}
        className="mt-1"
      />

      {/* Range Label */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>₹{min}</span>
        <span className="text-primary font-semibold text-xs">
          ₹{value[0]} – ₹{value[1]}
        </span>
        <span>₹{max}</span>
      </div>
    </div>
  );
};

export default PriceRangeFilter;
