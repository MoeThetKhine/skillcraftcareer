import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, Building2 } from "lucide-react";
import { toast } from "sonner";
import { roleHome, useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — SkillCraft" },
      { name: "description", content: "Register as a job seeker or employer on SkillCraft." },
      { property: "og:title", content: "Create an account — SkillCraft" },
      { property: "og:description", content: "Register as a job seeker or employer on SkillCraft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"job_seeker" | "employer">("job_seeker");
  const [f, setF] = useState({ name: "", email: "", password: "", companyName: "", companyDescription: "", companyWebsite: "", companyLocation: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (role === "employer" && f.companyName.trim().length < 2) return toast.error("Company name is required for employers.");
    setBusy(true);
    try {
      const me = await register({
        name: f.name.trim(),
        email: f.email.trim(),
        password: f.password,
        role,
        company:
          role === "employer"
            ? { name: f.companyName.trim(), description: f.companyDescription.trim() || undefined, website: f.companyWebsite.trim() || undefined, location: f.companyLocation.trim() || undefined }
            : undefined,
      });
      toast.success("Account created — welcome to SkillCraft!");
      navigate({ to: roleHome(me.role) });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="surface-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {(
            [
              { v: "job_seeker", label: "Job Seeker", desc: "Find jobs that match my skills", icon: Briefcase },
              { v: "employer", label: "Employer", desc: "Post jobs and hire talent", icon: Building2 },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setRole(o.v)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                role === o.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
              )}
            >
              <o.icon className={cn("size-5", role === o.v ? "text-primary" : "text-muted-foreground")} />
              <p className="mt-2 text-sm font-semibold">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field id="name" label="Full name"><Input id="name" required value={f.name} onChange={set("name")} /></Field>
          <Field id="email" label="Email"><Input id="email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></Field>
          <Field id="password" label="Password" hint="At least 8 characters"><Input id="password" type="password" required autoComplete="new-password" value={f.password} onChange={set("password")} /></Field>

          {role === "employer" && (
            <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-semibold">Company details</p>
              <Field id="cname" label="Company name"><Input id="cname" required value={f.companyName} onChange={set("companyName")} /></Field>
              <Field id="cdesc" label="Description"><Textarea id="cdesc" rows={3} value={f.companyDescription} onChange={set("companyDescription")} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="cweb" label="Website"><Input id="cweb" type="url" placeholder="https://" value={f.companyWebsite} onChange={set("companyWebsite")} /></Field>
                <Field id="cloc" label="Location"><Input id="cloc" value={f.companyLocation} onChange={set("companyLocation")} /></Field>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating account…" : `Register as ${role === "employer" ? "Employer" : "Job Seeker"}`}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
