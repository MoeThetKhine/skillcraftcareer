import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { roleHome, useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Navbar";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Login — SkillCraft" },
      { name: "description", content: "Sign in to SkillCraft to apply for jobs, manage postings, or administer the platform." },
      { property: "og:title", content: "Login — SkillCraft" },
      { property: "og:description", content: "Sign in to SkillCraft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

const DEMO = [
  { label: "Job Seeker", email: "seeker@skillcraft.com" },
  { label: "Employer", email: "employer@skillcraft.com" },
  { label: "Admin", email: "admin@skillcraft.com" },
];

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const me = await signIn(email.trim(), password);
      toast.success(`Welcome back, ${me.name.split(" ")[0]}!`);
      navigate({ to: redirect && redirect.startsWith("/") ? redirect : roleHome(me.role) });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <Logo className="text-2xl" />
        <h1 className="mt-8 text-5xl font-extrabold leading-tight">
          Welcome back to <span className="text-gradient-amber">SkillCraft</span>
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">Pick up where you left off — track applications, review candidates, or keep the platform humming.</p>
      </div>
      <div className="surface-card mx-auto w-full max-w-md p-6 sm:p-8">
        <h2 className="text-2xl font-bold">Log in</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New here? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <div className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo accounts · password SkillCraft123!</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                className="rounded-md border border-border px-2 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("SkillCraft123!");
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
