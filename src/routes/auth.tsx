import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "./index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — InsightFlow AI" },
      { name: "description", content: "Sign in or create your InsightFlow AI account." },
      { property: "og:title", content: "Sign in — InsightFlow AI" },
      { property: "og:description", content: "Access your customer intelligence dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/dashboard" },
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="grid min-h-screen place-items-center px-6" style={{ backgroundImage: "var(--gradient-glow)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your feedback and insights are saved to your account.</p>
          <Button variant="secondary" className="mt-6 w-full" onClick={google}>
            Continue with Google
          </Button>
          <div className="my-5 text-center text-xs uppercase tracking-widest text-muted-foreground">or</div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "in" ? "Sign in" : "Sign up"}
            </Button>
          </form>
          <button
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
