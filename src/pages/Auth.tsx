import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User, ArrowRight, Lock, MapPin, Users, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { INDIAN_STATES } from "@/lib/constants";

type AuthMode = "signin" | "signup";

const MIN_PASSWORD_LENGTH = 8; // L-5 fix: increased from 6 to 8 (NIST SP 800-63B minimum)

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
  const [area, setArea] = useState<string>("");
  const [state, setState] = useState<string>("");
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

  /* ───────── GOOGLE SIGN IN ───────── */
  const handleGoogleSignIn = async () => {
    setLoading(true);

    // Check if Google Identity Services is loaded
    if (!window.google?.accounts?.id) {
      toast.error("Google Sign-In is still loading. Please try again in a moment.");
      setLoading(false);
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error("Google Client ID is not configured.");
      setLoading(false);
      return;
    }

    // Use the ID token callback flow
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
          });
          if (error) {
            toast.error(error.message);
          } else {
            toast.success("Signed in with Google!");
            navigate("/");
          }
        } catch {
          toast.error("Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
      },
      auto_select: false,
      context: "signin",
      ux_mode: "popup",
    });

    // Trigger the Google account chooser
    window.google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason?: () => string }) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap was blocked — fall back to Supabase OAuth redirect as last resort
        // This can happen due to browser settings, cooldown, or missing origin config
        console.warn("Google One Tap blocked:", notification.getNotDisplayedReason?.());
        setLoading(false);

        // Fallback: use Supabase OAuth redirect (shows supabase.co domain but at least works)
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        }).then(({ error }) => {
          if (error) toast.error(error.message);
        });
      }
    });
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
          area: `${area}${state ? ', ' + state : ''}`,
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
          <h1 className="font-display text-3xl font-extrabold text-foreground mb-2">Swaptics</h1>
          <p className="text-muted-foreground text-sm">
            {signupDone
              ? "Check your email to verify your account"
              : mode === "signup"
                ? "Create your account"
                : "Welcome back! Sign in to continue"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-beauty p-6 animate-fade-in flex flex-col gap-4">

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
              <div className="flex rounded-xl bg-muted p-1 mb-2">
                <button
                  type="button"
                  onClick={() => resetForm("signin")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "signin"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                    }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => resetForm("signup")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "signup"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                    }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Google Auth Button */}
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base font-medium relative hover:bg-muted/50 transition-colors border-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  * By continuing, you agree to our{" "}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                    Terms of Service
                  </Link>
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with email</span>
                </div>
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

                  <div className="flex flex-col gap-1.5">
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
                    <p className="text-[11px] text-muted-foreground text-center">
                      * By signing in, you agree to our{" "}
                      <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                        Terms of Service
                      </Link>
                    </p>
                  </div>
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

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="area">
                        <MapPin className="inline w-3.5 h-3.5 mr-1" />
                        City
                      </Label>
                      <Input
                        id="area"
                        type="text"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="e.g. Mumbai, Bangalore"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">
                        <MapPin className="inline w-3.5 h-3.5 mr-1" />
                        State
                      </Label>
                      <select
                        id="state"
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

                  <div className="flex flex-col gap-1.5">
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
                    <p className="text-[11px] text-muted-foreground text-center">
                      * By signing up, you agree to our{" "}
                      <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                        Terms of Service
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {!signupDone && (
          <p className="text-center text-xs text-muted-foreground mt-6 leading-relaxed bg-card/50 p-3 rounded-xl border border-border pb-safe">
            {mode === "signin"
              ? "Don't have an account? Switch to Sign Up above to get started."
              : "Make sure to complete your profile after signing in via Google so others know your area!"}
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
