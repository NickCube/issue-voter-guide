import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (mode === "signup") {
      toast.success("Account created. Signing you in…");
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        toast.message("Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        navigate({ to: "/admin" });
      }
    } else {
      navigate({ to: "/admin" });
    }
  };

  const sendMagicLink = async () => {
    if (!email) return toast.error("Enter your email first.");
    setMagicLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setMagicLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for a sign-in link.");
  };

  const resetPassword = async () => {
    if (!email) return toast.error("Enter your email first.");
    setMagicLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMagicLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent.");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-md px-4 py-16">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin access is required to manage races, candidates, and claims.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          {mode === "signin" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={magicLoading}
                onClick={sendMagicLink}
              >
                Email me a link
              </Button>
              <Button type="button" variant="ghost" disabled={magicLoading} onClick={resetPassword}>
                Reset password
              </Button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          New accounts are created without admin rights. An existing admin must grant the admin role
          before management pages will load.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
