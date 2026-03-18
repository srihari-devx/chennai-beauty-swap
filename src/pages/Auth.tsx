import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CHENNAI_AREAS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, User, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "signin" | "signup";
type SignupStep = "details" | "otp";

const MIN_PASSWORD_LENGTH = 6;

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState<(typeof CHENNAI_AREAS)[number]>("Other");
  const [gender, setGender] = useState("female");

  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const normalizedEmail = email.trim().toLowerCase();

  const resetForModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSignupStep("details");
    setOtp("");
    setLoading(false);
  };

  const validateEmail = () => {
    if (!normalizedEmail) {
      toast.error("Please enter your email.");
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      toast.error("Please enter your password.");
      return false;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return false;
    }

    return true;
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateEmail() || !password) {
      if (!password) toast.error("Please enter your password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("email not confirmed") || errorMessage.includes("not confirmed")) {
        toast.error("Please complete signup verification first, then sign in.");
      } else {
        toast.error(error.message);
      }

      return;
    }

    toast.success("Signed in successfully!");
    navigate("/");
  };

  const sendSignupOtp = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!validateEmail()) return;

    if (!fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!validatePassword()) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName.trim(),
          area,
          gender,
        },
      },
    });
    setLoading(false);

    if (error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("already registered")) {
        toast.error("This email is already registered. Please use Sign In.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setSignupStep("otp");
    toast.success("OTP sent. Please check your email inbox.");
  };

  const verifySignupOtp = async (e: FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    const verificationTypes = ["signup", "email"] as const;
    let verified = false;
    let lastError: Error | null = null;

    for (const type of verificationTypes) {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type,
      });

      if (!error) {
        verified = true;
        break;
      }

      lastError = error;
    }

    if (!verified) {
      setLoading(false);
      toast.error(lastError?.message ?? "Invalid OTP. Please try again.");
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (passwordError) {
      toast.error("OTP verified, but setting password failed. Please try signup again.");
      return;
    }

    toast.success("Account created successfully!");
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
            {mode === "signup"
              ? signupStep === "details"
                ? "Create account with details + password, then verify with OTP"
                : "Enter OTP to finish signup"
              : "Sign in with email and password"}
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

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signinEmail">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signinEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signinPassword">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signinPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
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
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : signupStep === "details" ? (
            <form onSubmit={sendSignupOtp} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="signupEmail">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signupEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupPassword">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signupPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    className="pl-10"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="pl-10"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
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
                    Send Signup OTP
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifySignupOtp} className="space-y-4">
              <div className="space-y-2">
                <Label>Enter Signup OTP *</Label>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to <span className="text-foreground font-medium">{normalizedEmail}</span>
                </p>
                <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} containerClassName="justify-center">
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
                  "Verify OTP & Create Account"
                )}
              </Button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setSignupStep("details");
                    setOtp("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change details
                </button>
                <button
                  type="button"
                  onClick={() => sendSignupOtp()}
                  className="text-primary hover:opacity-80 transition-opacity"
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            Sign in uses password. OTP is only used during signup verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
