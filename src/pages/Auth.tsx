import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Check, X } from "lucide-react";
import { Link } from "react-router-dom";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

interface PasswordRules {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

interface GlobalSettings {
  disable_public_signup: boolean;
  min_password_length: number;
  require_uppercase: boolean;
  require_number: boolean;
  require_special_char: boolean;
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupDisabled, setSignupDisabled] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [hasAnyUsers, setHasAnyUsers] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({
    minLength: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSpecialChar: false,
  });

  // Check for invite token or password reset in URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type === "recovery") {
      setMode("reset");
    }
    
    const inviteToken = searchParams.get("invite");
    if (inviteToken) {
      setIsInvite(true);
      setMode("signup");
    }
  }, [searchParams]);

  // Fetch global settings for signup control and password rules
  useEffect(() => {
    const fetchSettings = async () => {
      // Check if there are any users (first user can always sign up)
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const hasUsers = (count ?? 0) > 0;
      setHasAnyUsers(hasUsers);

      if (!hasUsers) {
        // First user - allow signup
        setSignupDisabled(false);
        setLoadingSettings(false);
        return;
      }

      // Fetch global settings
      const { data: settings } = await supabase
        .from("global_settings")
        .select("disable_public_signup, min_password_length, require_uppercase, require_number, require_special_char")
        .limit(1)
        .maybeSingle();

      if (settings) {
        setSignupDisabled(settings.disable_public_signup ?? false);
        setPasswordRules({
          minLength: settings.min_password_length ?? 8,
          requireUppercase: settings.require_uppercase ?? true,
          requireNumber: settings.require_number ?? true,
          requireSpecialChar: settings.require_special_char ?? false,
        });
      }

      setLoadingSettings(false);
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (user && !loading && mode !== "reset") {
      navigate("/dashboard");
    }
  }, [user, loading, navigate, mode]);

  // Redirect to sign-in if sign-ups are disabled and user tries to access sign-up page
  useEffect(() => {
    if (!loadingSettings && mode === "signup" && !canSignUp) {
      setMode("signin");
      toast.error("Registration is by invitation only. Please contact an administrator.");
    }
  }, [mode, canSignUp, loadingSettings]);

  const validatePassword = (pwd: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (pwd.length < passwordRules.minLength) {
      errors.push(`At least ${passwordRules.minLength} characters`);
    }
    if (passwordRules.requireUppercase && !/[A-Z]/.test(pwd)) {
      errors.push("One uppercase letter");
    }
    if (passwordRules.requireNumber && !/[0-9]/.test(pwd)) {
      errors.push("One number");
    }
    if (passwordRules.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      errors.push("One special character");
    }

    return { valid: errors.length === 0, errors };
  };

  const getPasswordStrength = () => {
    const checks = [
      { label: `${passwordRules.minLength}+ characters`, valid: password.length >= passwordRules.minLength },
      ...(passwordRules.requireUppercase ? [{ label: "Uppercase letter", valid: /[A-Z]/.test(password) }] : []),
      ...(passwordRules.requireNumber ? [{ label: "Number", valid: /[0-9]/.test(password) }] : []),
      ...(passwordRules.requireSpecialChar ? [{ label: "Special character", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) }] : []),
    ];
    return checks;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setMode("signin");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validatePassword(password);
    if (!validation.valid) {
      toast.error(`Password requirements not met: ${validation.errors.join(", ")}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully!");
        navigate("/dashboard");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      toast.error(`Password requirements not met: ${validation.errors.join(", ")}`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        // Check if sign-ups are allowed
        if (!canSignUp) {
          toast.error("Registration is by invitation only. Please contact an administrator.");
          setIsSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(error.message);
          }
        } else {
          // If this is the first user, make them admin
          if (!hasAnyUsers) {
            toast.success("Account created! You are the first user - setting up admin access...");
            // The trigger will create the profile, we just need to add admin role
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
              await supabase.from("user_roles").insert({
                user_id: userData.user.id,
                role: "admin",
              });
              // Enable signup restrictions by default
              await supabase.from("global_settings").update({
                disable_public_signup: true,
              }).neq("id", "00000000-0000-0000-0000-000000000000"); // Update any row
            }
          } else {
            toast.success("Account created! You're now signed in.");
          }
          navigate("/dashboard");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const canSignUp = !signupDisabled || isInvite || !hasAnyUsers;

  const getTitle = () => {
    if (!hasAnyUsers && mode === "signup") return "Create Admin Account";
    switch (mode) {
      case "signup": return "Create your account";
      case "forgot": return "Reset your password";
      case "reset": return "Set new password";
      default: return "Welcome back";
    }
  };

  const getSubtitle = () => {
    if (!hasAnyUsers && mode === "signup") return "You'll be the first admin of this platform";
    switch (mode) {
      case "signup": return "Join the platform";
      case "forgot": return "Enter your email and we'll send you a reset link";
      case "reset": return "Enter your new password below";
      default: return "Sign in to manage your widgets";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{getTitle()}</h1>
            <p className="mt-2 text-muted-foreground">{getSubtitle()}</p>
          </div>

          {mode === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : mode === "reset" ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
                {password && (
                  <div className="space-y-1 mt-2">
                    {getPasswordStrength().map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {check.valid ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-destructive" />
                        )}
                        <span className={check.valid ? "text-green-500" : "text-muted-foreground"}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                  {mode === "signup" && password && (
                    <div className="space-y-1 mt-2">
                      {getPasswordStrength().map((check, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {check.valid ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-destructive" />
                          )}
                          <span className={check.valid ? "text-green-500" : "text-muted-foreground"}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : mode === "signup" ? (
                    !hasAnyUsers ? "Create Admin Account" : "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="text-center">
                {mode === "signup" ? (
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-primary hover:underline"
                  >
                    Already have an account? Sign in
                  </button>
                ) : canSignUp ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (canSignUp) {
                        setMode("signup");
                      } else {
                        toast.error("Registration is by invitation only. Please contact an administrator.");
                      }
                    }}
                    className="text-primary hover:underline"
                  >
                    Don't have an account? Sign up
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Registration is by invitation only
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}