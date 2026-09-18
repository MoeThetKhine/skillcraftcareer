import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, CalendarCheck, FileText, Sparkles } from "lucide-react";
import { getSeekerDashboard } from "@/lib/api/dashboard.functions";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ErrorState, LoadingState, PageHeader, SkillBadge, StatCard } from "@/components/shared";

export const Route = createFileRoute("/job-seeker/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — SkillCraft" }] }),
  component: SeekerDashboard,
});

function SeekerDashboard() {
  const { user } = useAuth();
  const fetch = useServerFn(getSeekerDashboard);
  const { data, isLoading, error } = useQuery({ queryKey: ["seeker-dashboard", user?.id], queryFn: () => fetch() });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <div className="p-6"><ErrorState message="Could not load your dashboard." /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}!`}
        subtitle="Here is a snapshot of your job search."
        action={
          <Button asChild>
            <Link to="/jobs">Browse jobs</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Applied Jobs" value={data.applied} icon={FileText} />
        <StatCard label="Interviews" value={data.interviews} icon={CalendarCheck} />
        <StatCard label="Saved Jobs" value={data.saved} icon={Bookmark} hint="Coming in the next update" />
        <StatCard label="AI Recommendations" value="—" icon={Sparkles} hint="Coming in the next update" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile completion</h2>
            <span className="font-display text-2xl font-bold text-primary">{data.profileCompletion}%</span>
          </div>
          <Progress value={data.profileCompletion} className="mt-3" />
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Row label="Location" value={data.profile?.location} />
            <Row label="Education" value={data.profile?.education} />
            <Row label="Experience" value={data.profile?.experience} />
            <Row label="Resume" value={data.profile?.resume_url ? "Added" : null} />
          </dl>
          {data.profile?.bio && <p className="mt-4 text-sm text-muted-foreground">{data.profile.bio}</p>}
        </div>
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold">My skills</h2>
          {data.skills.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <SkillBadge key={s.id} className="px-3 py-1 text-sm">
                  {s.name} <span className="ml-1.5 text-muted-foreground">· {s.level}</span>
                </SkillBadge>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Add skills to your profile to unlock AI match scores and recommendations.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Skill editing and AI matching arrive in the next update.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || <span className="text-muted-foreground">Not set</span>}</dd>
    </div>
  );
}
