import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamBrand } from "@/components/team-brand";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { accountDestination } from "@/lib/account-session";
import { recoverSession } from "@/lib/session-recovery";
import { boundedRequest, SESSION_TIMEOUT_MS } from "@/lib/request-recovery";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TEAM SHAHIN" },
      {
        name: "description",
        content: "Sign in to TEAM SHAHIN to access your private lead workspace.",
      },
      { property: "og:title", content: "Sign in — TEAM SHAHIN" },
      { property: "og:description", content: "Access your TEAM SHAHIN lead workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;
    recoverSession().then(({ data }) => {
      if (active && data.session) goHome(data.session.user.id);
    }).catch(() => { /* Keep the sign-in form available if restoring a session fails. */ });
    return () => { active = false; };
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await boundedRequest(() => supabase.auth.signInWithPassword({ email: email.trim(), password }), SESSION_TIMEOUT_MS);
      if (error) throw error;
      if (!data.user) throw new Error("Login hoyni. Abar try korun.");
      await goHome(data.user.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login hoyni — internet check kore abar try korun.");
    } finally {
      setLoading(false);
    }
  };

  const goHome = async (userId?: string) => {
    if (!userId) return navigate({ to: "/leads" });
    await navigate({ to: await accountDestination(userId) });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    const { data } = await recoverSession();
    await goHome(data.session?.user.id);
  };

  return (
    <main className="auth-page flex min-h-screen flex-col px-5 py-8">
      <header className="mx-auto w-full max-w-7xl"><TeamBrand compact /></header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
      <section className="auth-form w-full">
        <div className="pb-6">
          <img src="/team-shahin-logo-v2.png" alt="TEAM SHAHIN" width={76} height={76} className="auth-emblem" />
          <p className="mb-3 text-xs font-semibold uppercase text-primary">Private workspace</p>
          <h1 className="text-4xl font-semibold">Welcome back<span className="text-primary">.</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">TEAM SHAHIN-e sign in korun.</p>
        </div>
        <div>
                <form onSubmit={signIn} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative"><Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="pr-12" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-8 -translate-y-1/2" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Please wait…" : "Login"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Account dorkar hole admin-er sathe jogajog korun.</p>
                </form>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>
      </section>
      <p className="mt-6 text-center text-xs text-muted-foreground">TEAM SHAHIN · Private workspace</p>
      </div>
    </main>
  );
}
