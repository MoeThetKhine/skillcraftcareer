import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { listMyJobs, setJobStatus } from "@/lib/api/jobs.functions";
import { formatJobType } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/employer/jobs/")({
  head: () => ({ meta: [{ title: "My Jobs — SkillCraft" }] }),
  component: MyJobsPage,
});

function MyJobsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetch = useServerFn(listMyJobs);
  const toggle = useServerFn(setJobStatus);
  const { data, isLoading, error } = useQuery({ queryKey: ["employer-jobs", user?.id], queryFn: () => fetch() });

  const mutation = useMutation({
    mutationFn: (v: { id: number; isActive: boolean }) => toggle({ data: v }),
    onSuccess: (_, v) => {
      toast.success(v.isActive ? "Job activated" : "Job deactivated");
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="My Jobs" subtitle="Manage postings and review applicants." action={<Button asChild><Link to="/employer/jobs/create">Create Job</Link></Button>} />
      {isLoading ? (
        <LoadingState label="Loading jobs…" />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : !data?.length ? (
        <EmptyState title="No jobs posted yet" description="Create your first job and add the skills you need." action={<Button asChild><Link to="/employer/jobs/create">Create Job</Link></Button>} />
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="hidden px-4 py-3 md:table-cell">Type</th>
                <th className="hidden px-4 py-3 md:table-cell">Posted</th>
                <th className="px-4 py-3">Applicants</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((j) => (
                <tr key={j.id} className={cn(!j.isActive && "opacity-60")}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{j.location}</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">{formatJobType(j.jobType)}</td>
                  <td className="hidden px-4 py-3 md:table-cell">{format(new Date(j.createdAt), "d MMM yyyy")}</td>
                  <td className="px-4 py-3 font-semibold">{j.applicantCount}</td>
                  <td className="px-4 py-3">
                    <Switch checked={j.isActive} onCheckedChange={(v) => mutation.mutate({ id: j.id, isActive: v })} aria-label="Toggle active" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/employer/jobs/$id/applicants" params={{ id: String(j.id) }}><Users className="size-4" /> <span className="hidden sm:inline">Applicants</span></Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/employer/jobs/$id/edit" params={{ id: String(j.id) }}><Pencil className="size-4" /> <span className="hidden sm:inline">Edit</span></Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
