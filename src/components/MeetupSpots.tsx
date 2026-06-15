import { MapPin, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const MEETUP_SPOTS = [
  { name: "Phoenix Marketcity", area: "Mumbai", type: "Mall" },
  { name: "Select Citywalk", area: "Delhi", type: "Mall" },
  { name: "Orion Mall", area: "Bangalore", type: "Mall" },
  { name: "Express Avenue Mall", area: "Chennai", type: "Mall" },
  { name: "Inorbit Mall", area: "Hyderabad", type: "Mall" },
  { name: "South City Mall", area: "Kolkata", type: "Mall" },
  { name: "Lulu Mall", area: "Kochi", type: "Mall" },
  { name: "Elante Mall", area: "Chandigarh", type: "Mall" },
  { name: "Starbucks (any city)", area: "Pan India", type: "Café" },
  { name: "Metro Stations", area: "Pan India", type: "Metro" },
];

const MeetupSpots = () => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors border border-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          Suggested Safe Meetup Spots in India
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
          {MEETUP_SPOTS.map((spot, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm">
              <span className="text-primary">📍</span>
              <div>
                <p className="font-medium text-foreground text-xs">{spot.name}</p>
                <p className="text-[10px] text-muted-foreground">{spot.area} · {spot.type}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 px-1 italic">
          ⚠️ Always meet in busy, well-lit public places during daytime.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MeetupSpots;
