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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({
      email,
      password,
      ...(mode === "signup"
        ? { options: { emailRedirectTo: `${window.location.origin}/admin` } }
        : {}),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (mode === "signup") {
      toast.success("Account created. Check your email to confirm, then sign in.");
      setMode("signin");
    } else {
      navigate({ to: "/admin" });
    }
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
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          New accounts are created without admin rights. An existing admin must grant the
          admin role before management pages will load.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
