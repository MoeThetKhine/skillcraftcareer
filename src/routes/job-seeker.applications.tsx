import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { listMyApplications } from "@/lib/api/applications.functions";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/shared";
import { APPLICATION_STATUSES } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/job-seeker/applications")({
  head: () => ({ meta: [{ title: "My Applications — SkillCraft" }] }),
  component: ApplicationsPage,
});

const PIPELINE = ["Applied", "Shortlisted", "Interview", "Hired"] as const;

function ApplicationsPage() {
  const { user } = useAuth();
  const fetch = useServerFn(listMyApplications);
  const { data, isLoading, error } = useQuery({ queryKey: ["applications", "mine", user?.id], queryFn: () => fetch() });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader title="My Applications" subtitle="Track every application from Applied to Hired." />
      {isLoading ? (
        <LoadingState label="Loading applications…" />
      ) : error ? (
        <ErrorState message="Could not load your applications." />
      ) : !data?.length ? (
        <EmptyState
          icon={FileText}
          title="You haven't applied for any jobs yet."
          description="Find a role that matches your skills and apply in one click."
          action={<Button asChild><Link to="/jobs">Browse jobs</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((a) => {
            const idx = PIPELINE.indexOf(a.status as (typeof PIPELINE)[number]);
            return (
              <div key={a.id} className="surface-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to="/jobs/$id" params={{ id: String(a.jobId) }} className="text-lg font-semibold hover:text-primary">
                      {a.jobTitle}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {a.company} · {a.location} · Applied {format(new Date(a.appliedAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                {a.status !== "Rejected" ? (
                  <ol className="mt-4 grid grid-cols-4 gap-1">
                    {PIPELINE.map((step, i) => (
                      <li key={step} className="text-center">
                        <div className={cn("h-1.5 rounded-full", i <= idx ? "bg-primary" : "bg-muted")} />
                        <span className={cn("mt-1 block text-[11px]", i <= idx ? "text-foreground" : "text-muted-foreground")}>{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">This application was not taken forward. Keep going — {APPLICATION_STATUSES.length - 1} other outcomes await.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
