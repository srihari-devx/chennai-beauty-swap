import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CHENNAI_AREAS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User, ArrowRight, Lock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

type AuthMode = "signin" | "signup";

const MIN_PASSWORD_LENGTH = 6;

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);

  // Shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up only fields
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState<string>("Other");
  const [gender, setGender] = useState("female");

  // Post-signup state
  const [signupDone, setSignupDone] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const normalizedEmail = email.trim().toLowerCase();

  const resetForm = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSignupDone(false);
    setLoading(false);
  };

  /* ───────── SIGN IN ───────── */
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();

    if (!normalizedEmail) { toast.error("Please enter your email."); return; }
    if (!password) { toast.error("Please enter your password."); return; }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error("Your email is not verified yet. Please check your inbox and click the confirmation link first.");
      } else if (error.message.toLowerCase().includes("invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Signed in successfully!");
    navigate("/");
  };

  /* ───────── SIGN UP ───────── */
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) { toast.error("Please enter your full name."); return; }
    if (!normalizedEmail) { toast.error("Please enter your email."); return; }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          area,
          gender,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Supabase returns a user with no identities if the email is already registered
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      toast.error("This email is already registered. Please sign in instead.");
      return;
    }

    setSignupDone(true);
    toast.success("Account created! Please check your email to verify your account.");
  };

  /* ───────── UI ───────── */
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-cta flex items-center justify-center shadow-beauty mx-auto mb-4 text-3xl">
            ✿
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            Chennai Beauty Swap
          </h1>
          <p className="text-muted-foreground text-sm">
            {signupDone
              ? "Check your email to verify your account"
              : mode === "signup"
              ? "Create your account"
              : "Welcome back! Sign in to continue"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-beauty p-6 animate-fade-in">
          {/* Verify email screen after signup */}
          {signupDone ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Verify Your Email
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We've sent a verification link to{" "}
                <span className="text-foreground font-medium">{normalizedEmail}</span>.
                <br />
                Please click the link in the email to activate your account, then come back and sign in.
              </p>
              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => resetForm("signin")}
                  className="w-full h-12 rounded-xl text-base font-medium gradient-cta text-primary-foreground border-0"
                >
                  Go to Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setSignupDone(false);
                    toast.info("You can try signing up again.");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Didn't receive it? Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex rounded-xl bg-muted p-1 mb-6">
                <button
                  type="button"
                  onClick={() => resetForm("signin")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === "signin"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => resetForm("signup")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === "signup"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {mode === "signin" ? (
                /* ─── SIGN IN FORM ─── */
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signinEmail">Email</Label>
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
                    <Label htmlFor="signinPassword">Password</Label>
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
              ) : (
                /* ─── SIGN UP FORM ─── */
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
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
                    <Label htmlFor="signupEmail">Email</Label>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="area">
                        <MapPin className="inline w-3.5 h-3.5 mr-1" />
                        Area
                      </Label>
                      <select
                        id="area"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
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
                      <Label htmlFor="gender">
                        <Users className="inline w-3.5 h-3.5 mr-1" />
                        Gender
                      </Label>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
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
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                        Create Account
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
                {mode === "signin"
                  ? "Don't have an account? Switch to Sign Up above."
                  : "A verification email will be sent after signup. Verify first, then sign in."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
