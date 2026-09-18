import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyJob, updateJob } from "@/lib/api/jobs.functions";
import { JobForm, toJobInput, type JobFormValues } from "@/components/employer/JobForm";
import { ErrorState, LoadingState, PageHeader } from "@/components/shared";
import { friendly } from "./employer.jobs.create";

export const Route = createFileRoute("/employer/jobs/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Job — SkillCraft" }] }),
  component: EditJobPage,
});

function EditJobPage() {
  const { id } = Route.useParams();
  const jobId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetch = useServerFn(getMyJob);
  const update = useServerFn(updateJob);
  const { data, isLoading, error } = useQuery({ queryKey: ["employer-job", jobId], queryFn: () => fetch({ data: { id: jobId } }) });

  const mutation = useMutation({
    mutationFn: (v: JobFormValues) => update({ data: { ...toJobInput(v), id: jobId } }),
    onSuccess: () => {
      toast.success("Job updated");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-job", jobId] });
      navigate({ to: "/employer/jobs" });
    },
    onError: (e: Error) => toast.error(friendly(e.message)),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <div className="p-6"><ErrorState message="Job not found or you do not have access." /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title={`Edit: ${data.title}`} />
      <JobForm
        initial={{
          title: data.title,
          description: data.description,
          responsibilities: data.responsibilities ?? "",
          location: data.location,
          salaryMin: data.salaryMin?.toString() ?? "",
          salaryMax: data.salaryMax?.toString() ?? "",
          jobType: data.jobType,
          experienceRequired: data.experienceRequired ?? "",
          skillIds: data.skillIds,
        }}
        submitLabel="Save changes"
        busy={mutation.isPending}
        onSubmit={(v) => mutation.mutate(v)}
      />
    </div>
  );
}
