import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CHENNAI_AREAS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "signin" | "signup";
type AuthStep = "details" | "otp";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<AuthStep>("details");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState<(typeof CHENNAI_AREAS)[number]>("Other");
  const [gender, setGender] = useState("female");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const resetForModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep("details");
    setOtp("");
  };

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    if (mode === "signup" && !fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === "signup",
        emailRedirectTo: window.location.origin,
        data:
          mode === "signup"
            ? {
                full_name: fullName.trim(),
                area,
                gender,
              }
            : undefined,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setStep("otp");
    toast.success("OTP sent. Please check your email inbox.");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    const verificationTypes = mode === "signup" ? (["signup", "email"] as const) : (["email", "magiclink"] as const);
    let lastError: Error | null = null;
    let verified = false;

    for (const type of verificationTypes) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type,
      });

      if (!error) {
        verified = true;
        break;
      }

      lastError = error;
    }

    setLoading(false);

    if (!verified) {
      toast.error(lastError?.message ?? "Invalid OTP. Please try again.");
      return;
    }

    toast.success(mode === "signup" ? "Account created successfully!" : "Signed in successfully!");
    navigate("/");
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-cta flex items-center justify-center shadow-beauty mx-auto mb-4 text-3xl">
            ✿
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Chennai Beauty Swap</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "signup" ? "Create your account with OTP verification" : "Sign in with OTP verification"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-beauty p-6 animate-fade-in">
          <div className="flex rounded-xl bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => resetForModeChange("signin")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => resetForModeChange("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          {step === "details" ? (
            <form onSubmit={sendOtp} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">Area *</Label>
                    <select
                      id="area"
                      value={area}
                      onChange={(e) => setArea(e.target.value as (typeof CHENNAI_AREAS)[number])}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      {CHENNAI_AREAS.map((place) => (
                        <option key={place} value={place}>
                          {place}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-medium gradient-cta text-primary-foreground border-0"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label>Enter OTP *</Label>
                <p className="text-xs text-muted-foreground">
                  We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
                </p>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-medium gradient-cta text-primary-foreground border-0"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Verify OTP"
                )}
              </Button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setOtp("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change details
                </button>
                <button
                  type="button"
                  onClick={() => sendOtp()}
                  className="text-primary hover:opacity-80 transition-opacity"
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            Google sign-in has been removed. This app now uses manual OTP verification only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
