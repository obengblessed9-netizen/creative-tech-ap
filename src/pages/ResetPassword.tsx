import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event from URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/");
    }
    setLoading(false);
  };

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex items-center justify-center pt-28 pb-20">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8" role="region" aria-labelledby="reset-heading">
          <h1 id="reset-heading" className="font-display text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRecovery ? "Enter your new password below." : "Waiting for recovery link verification..."}
          </p>

          {isRecovery ? (
            <form onSubmit={handleReset} className="mt-6 space-y-4" noValidate>
              <div>
                <Label htmlFor="password" className="text-foreground">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 bg-secondary border-border text-foreground"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-describedby="password-hint"
                />
                <p id="password-hint" className="mt-1 text-xs text-muted-foreground">
                  At least 6 characters.
                </p>
              </div>
              <div>
                <Label htmlFor="confirm" className="text-foreground">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 bg-secondary border-border text-foreground"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={mismatch}
                  aria-describedby={mismatch ? "confirm-error" : undefined}
                />
                <div aria-live="assertive" aria-atomic="true" role="alert">
                  {mismatch && (
                    <p id="confirm-error" className="mt-1 text-xs text-destructive">
                      Passwords do not match.
                    </p>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || mismatch}
                aria-busy={loading}
                className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <p className="mt-6 text-muted-foreground text-sm" role="status" aria-live="polite">
              If you arrived here from an email link, your session should be verified shortly.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
