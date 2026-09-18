import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Building2, FileText, Users } from "lucide-react";
import { getAdminDashboard } from "@/lib/api/dashboard.functions";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState, PageHeader, StatCard } from "@/components/shared";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — SkillCraft" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetch = useServerFn(getAdminDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => fetch() });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <div className="p-6"><ErrorState message={(error as Error)?.message ?? "Could not load stats."} /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Platform overview" subtitle="Live statistics from the SkillCraft database." action={<Button asChild><Link to="/admin/jobs">Manage jobs</Link></Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={data.users} icon={Users} />
        <StatCard label="Job Seekers" value={data.jobSeekers} icon={Users} />
        <StatCard label="Employers" value={data.employers} icon={Users} />
        <StatCard label="Companies" value={data.companies} icon={Building2} />
        <StatCard label="Total Jobs" value={data.jobs} icon={Briefcase} />
        <StatCard label="Active Jobs" value={data.activeJobs} icon={Briefcase} />
        <StatCard label="Applications" value={data.applications} icon={FileText} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">User, company and application management pages arrive in the next update.</p>
    </div>
  );
}
