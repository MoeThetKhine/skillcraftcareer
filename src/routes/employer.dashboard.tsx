import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, CalendarCheck, CheckCircle2, Star, Users } from "lucide-react";
import { getEmployerDashboard } from "@/lib/api/dashboard.functions";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from "@/components/shared";

export const Route = createFileRoute("/employer/dashboard")({
  head: () => ({ meta: [{ title: "Employer Dashboard — SkillCraft" }] }),
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const { user } = useAuth();
  const fetch = useServerFn(getEmployerDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["employer-dashboard", user?.id], queryFn: () => fetch() });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <div className="p-6"><ErrorState message="Could not load your dashboard." /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Welcome, ${user?.name.split(" ")[0]}!`}
        subtitle={data.company ? `Hiring for ${data.company.name}` : "Set up your company to start posting jobs."}
        action={
          data.company ? (
            <Button asChild><Link to="/employer/jobs/create">Create Job</Link></Button>
          ) : (
            <Button asChild><Link to="/employer/company">Create company profile</Link></Button>
          )
        }
      />
      {!data.company ? (
        <EmptyState title="No company yet" description="Create your company profile first — jobs are posted under your company." action={<Button asChild><Link to="/employer/company">Create company</Link></Button>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total Jobs" value={data.totalJobs} icon={Briefcase} />
            <StatCard label="Active Jobs" value={data.activeJobs} icon={Briefcase} />
            <StatCard label="Total Applicants" value={data.applicants} icon={Users} />
            <StatCard label="Shortlisted" value={data.shortlisted} icon={Star} />
            <StatCard label="Interviews" value={data.interviews} icon={CalendarCheck} />
            <StatCard label="Hired" value={data.hired} icon={CheckCircle2} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <QuickLink to="/employer/jobs" title="My Jobs" text="Edit, deactivate, and review applicants per job." />
            <QuickLink to="/employer/jobs/create" title="Post a new job" text="Add required skills so candidates see their AI match." />
            <QuickLink to="/employer/company" title="Company profile" text="Keep your description, website and location current." />
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({ to, title, text }: { to: "/employer/jobs" | "/employer/jobs/create" | "/employer/company"; title: string; text: string }) {
  return (
    <Link to={to} className="surface-card p-5 transition-colors hover:border-primary/50">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </Link>
  );
}
