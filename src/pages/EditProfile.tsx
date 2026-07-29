import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { INDIAN_STATES } from "@/lib/constants";

const parseArea = (areaString: string) => {
  if (!areaString) return { city: "", state: "" };
  const parts = areaString.split(",");
  if (parts.length >= 2) {
    const statePart = parts[parts.length - 1].trim();
    const cityPart = parts.slice(0, parts.length - 1).join(",").trim();
    return { city: cityPart, state: statePart };
  }
  return { city: areaString.trim(), state: "" };
};

const EditProfile = () => {
  const { user, profile, fetchProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      const { city: parsedCity, state: parsedState } = parseArea(profile.area || "");
      setCity(parsedCity);
      setState(parsedState);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) {
      toast.error("Full Name is required");
      return;
    }

    if (!city.trim()) {
      toast.error("City is required");
      return;
    }

    if (!state) {
      toast.error("State is required");
      return;
    }

    setLoading(true);
    const fullArea = `${city.trim()}, ${state}`;
    // @ts-ignore — custom RPC not in generated types
    const { data: res, error: rpcError } = await supabase.rpc("fn_update_profile", {
      p_user_id: user.id,
      p_full_name: fullName.trim(),
      p_area: fullArea,
    });
    const result = res as { error?: string } | null;
    const error = rpcError || (result?.error ? { message: result.error } : null);

    setLoading(false);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
    } else {
      toast.success("Profile updated successfully!");
      if (fetchProfile) {
        await fetchProfile(); // Update context
      }
      navigate("/dashboard");
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display font-semibold text-lg text-foreground">Edit Profile</h1>
      </div>

      <div className="container max-w-md mx-auto px-4 py-8">
        <div className="bg-card border border-border shadow-card rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bangalore, Mumbai"
                className="bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">State</Label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="" disabled>Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              className="w-full gradient-cta text-primary-foreground border-0 rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
