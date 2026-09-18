import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { toast } from "sonner";
import { adminListJobs } from "@/lib/api/dashboard.functions";
import { setJobStatus } from "@/lib/api/jobs.functions";
import { formatJobType, type JobType } from "@/lib/api/types";
import { Switch } from "@/components/ui/switch";
import { ErrorState, LoadingState, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/jobs")({
  head: () => ({ meta: [{ title: "Manage Jobs — SkillCraft" }] }),
  component: AdminJobs,
});

function AdminJobs() {
  const queryClient = useQueryClient();
  const fetch = useServerFn(adminListJobs);
  const toggle = useServerFn(setJobStatus);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-jobs"], queryFn: () => fetch() });
  const mutation = useMutation({
    mutationFn: (v: { id: number; isActive: boolean }) => toggle({ data: v }),
    onSuccess: (_, v) => {
      toast.success(v.isActive ? "Job activated" : "Job deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <LoadingState label="Loading jobs…" />;
  if (error || !data) return <div className="p-6"><ErrorState message="Could not load jobs." /></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="All Jobs" subtitle={`${data.length} jobs across the platform`} />
      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Company</th>
              <th className="hidden px-4 py-3 md:table-cell">Type</th>
              <th className="hidden px-4 py-3 md:table-cell">Posted</th>
              <th className="px-4 py-3">Applicants</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((j) => (
              <tr key={j.id} className={cn(!j.isActive && "opacity-60")}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{j.title}</p>
                  <p className="text-xs text-muted-foreground">{j.location}</p>
                </td>
                <td className="px-4 py-3">{j.company}</td>
                <td className="hidden px-4 py-3 md:table-cell">{formatJobType(j.jobType as JobType)}</td>
                <td className="hidden px-4 py-3 md:table-cell">{format(new Date(j.createdAt), "d MMM yyyy")}</td>
                <td className="px-4 py-3 font-semibold">{j.applicants}</td>
                <td className="px-4 py-3">
                  <Switch checked={j.isActive} onCheckedChange={(v) => mutation.mutate({ id: j.id, isActive: v })} aria-label="Toggle active" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
