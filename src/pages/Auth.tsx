import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Eye, EyeOff, Sparkles, ArrowLeft, Mail } from "lucide-react";
import { CHENNAI_AREAS } from "@/lib/constants";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [showOtp, setShowOtp] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState("T Nagar");
  const [gender, setGender] = useState("female");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/");
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, area, gender },
          },
        });
        if (error) throw error;

        if (data.user) {
          toast.success("A 6-digit code has been sent to your email! 📧");
          setShowOtp(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpValue,
        type: "signup",
      });
      if (error) throw error;
      toast.success("Welcome to Chennai Beauty Swap! 🌸");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      toast.success("A new code has been sent to your email!");
    } catch (err: any) {
      toast.error(err.message || "Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  // OTP verification screen
  if (showOtp) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-1">
              Verify Your Email
            </h1>
            <p className="text-muted-foreground text-sm">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-beauty p-6 animate-fade-in">
            <div className="flex flex-col items-center space-y-6">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
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

              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otpValue.length !== 6}
                className="w-full gradient-cta border-0 text-primary-foreground rounded-xl h-11 font-medium"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? "Verifying..." : "Verify & Join"}
              </Button>

              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-primary hover:underline font-medium"
                >
                  Resend code
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  onClick={() => { setShowOtp(false); setOtpValue(""); }}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Check your spam folder if you don't see the email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-cta flex items-center justify-center shadow-beauty mx-auto mb-4 text-3xl">
            ✿
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Chennai Beauty Swap
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "Welcome back! Sign in to continue." : "Join Chennai's beauty community."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-beauty p-6 animate-fade-in">
          {/* Tab Toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === "login" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === "signup" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Your name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="rounded-xl border-border"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="rounded-xl border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-xl border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="gender">I am</Label>
                <div className="flex gap-2">
                  {[
                    { value: "female", label: "🌸 Female" },
                    { value: "male", label: "💙 Male" },
                    { value: "other", label: "✨ Other" },
                  ].map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-all ${
                        gender === g.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="area">Area in Chennai</Label>
                <select
                  id="area"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  required
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CHENNAI_AREAS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">We're currently available only in Chennai 🌸</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-cta border-0 text-primary-foreground rounded-xl h-11 font-medium mt-2"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Join Beauty Swap")}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            By joining, you agree to meet sellers only in public places and use the platform responsibly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
