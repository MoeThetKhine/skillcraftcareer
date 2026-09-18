import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, MapPin, Clock, Loader2, type LucideIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { formatJobType, formatSalary, type ApplicationStatus, type JobDto } from "@/lib/api/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SkillBadge({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "match" | "missing"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        tone === "default" && "border-border bg-secondary text-secondary-foreground",
        tone === "match" && "border-success/40 bg-success/15 text-success",
        tone === "missing" && "border-destructive/40 bg-destructive/15 text-destructive",
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  Applied: "bg-info/15 text-info border-info/40",
  Shortlisted: "bg-primary/15 text-primary border-primary/40",
  Interview: "bg-warning/15 text-warning border-warning/40",
  Hired: "bg-success/15 text-success border-success/40",
  Rejected: "bg-destructive/15 text-destructive border-destructive/40",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[status])}>{status}</span>;
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon?: LucideIcon; hint?: string }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-primary" />}
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = Briefcase }: { title: string; description?: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-accent text-primary">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</div>;
}

export function MatchRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          strokeLinecap="round"
          className={cn("fill-none transition-all", value >= 70 ? "stroke-success" : value >= 40 ? "stroke-primary" : "stroke-destructive")}
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-bold">{value}%</span>
    </div>
  );
}

export function JobCard({ job }: { job: JobDto }) {
  return (
    <Link
      to="/jobs/$id"
      params={{ id: String(job.id) }}
      className="surface-card group flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold group-hover:text-primary">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company}</p>
        </div>
        <span className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-medium">{formatJobType(job.jobType)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {job.location}</span>
        <span className="inline-flex items-center gap-1"><Briefcase className="size-3.5" /> {job.experienceRequired ?? "Any experience"}</span>
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {job.skills.slice(0, 5).map((s) => (
          <SkillBadge key={s}>{s}</SkillBadge>
        ))}
        {job.skills.length > 5 && <SkillBadge>+{job.skills.length - 5}</SkillBadge>}
      </div>
      <p className="mt-auto text-sm font-semibold text-primary">{formatSalary(job.salaryMin, job.salaryMax)}</p>
    </Link>
  );
}
