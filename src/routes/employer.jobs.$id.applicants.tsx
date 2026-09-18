import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { listJobApplicants, updateApplicationStatus } from "@/lib/api/applications.functions";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState, MatchRing, PageHeader, SkillBadge, StatusBadge } from "@/components/shared";

export const Route = createFileRoute("/employer/jobs/$id/applicants")({
  head: () => ({ meta: [{ title: "Applicants — SkillCraft" }] }),
  component: ApplicantsPage,
});

function ApplicantsPage() {
  const { id } = Route.useParams();
  const jobId = Number(id);
  const queryClient = useQueryClient();
  const fetch = useServerFn(listJobApplicants);
  const update = useServerFn(updateApplicationStatus);
  const { data, isLoading, error } = useQuery({ queryKey: ["applicants", jobId], queryFn: () => fetch({ data: { jobId } }) });

  const mutation = useMutation({
    mutationFn: (v: { id: number; status: ApplicationStatus }) => update({ data: v }),
    onSuccess: (_, v) => {
      toast.success(`Application marked as ${v.status}`);
      queryClient.invalidateQueries({ queryKey: ["applicants", jobId] });
      queryClient.invalidateQueries({ queryKey: ["employer-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <LoadingState label="Loading applicants…" />;
  if (error || !data) return <div className="p-6"><ErrorState message={(error as Error)?.message ?? "Could not load applicants."} /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link to="/employer/jobs"><ArrowLeft className="size-4" /> My Jobs</Link>
      </Button>
      <PageHeader title={data.job.title} subtitle={`${data.applicants.length} applicant${data.applicants.length === 1 ? "" : "s"} · Required: ${data.job.skills.join(", ")}`} />
      {!data.applicants.length ? (
        <EmptyState icon={Users} title="No applicants yet" description="Candidates who apply will appear here with their skills and AI match." />
      ) : (
        <div className="space-y-4">
          {data.applicants.map((a) => (
            <div key={a.id} className="surface-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <MatchRing value={a.match.percentage} />
                  <div>
                    <h3 className="text-lg font-semibold">{a.candidate.name}</h3>
                    <p className="text-sm text-muted-foreground">{a.candidate.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[a.candidate.location, a.candidate.experience, a.candidate.education].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={a.status} />
                  <Select value={a.status} onValueChange={(s) => mutation.mutate({ id: a.id, status: s as ApplicationStatus })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Candidate skills</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {a.skills.length ? a.skills.map((s) => <SkillBadge key={s.name}>{s.name} · {s.level}</SkillBadge>) : <span className="text-sm text-muted-foreground">No skills listed</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI match · {a.match.percentage}%</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {a.match.matchingSkills.map((s) => <SkillBadge key={s} tone="match">✓ {s}</SkillBadge>)}
                    {a.match.missingSkills.map((s) => <SkillBadge key={s} tone="missing">✗ {s}</SkillBadge>)}
                  </div>
                </div>
              </div>

              {a.coverLetter && <p className="mt-4 rounded-md bg-surface p-3 text-sm text-muted-foreground">“{a.coverLetter}”</p>}

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Applied {format(new Date(a.appliedAt), "d MMM yyyy")}</span>
                {a.history.filter((h) => h.old_status).map((h) => (
                  <span key={`${h.application_id}-${h.changed_at}`}>{h.old_status} → {h.new_status} · {format(new Date(h.changed_at), "d MMM")}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
