import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createJob } from "@/lib/api/jobs.functions";
import { JobForm, emptyJobForm, toJobInput, type JobFormValues } from "@/components/employer/JobForm";
import { PageHeader } from "@/components/shared";

export const Route = createFileRoute("/employer/jobs/create")({
  head: () => ({ meta: [{ title: "Create Job — SkillCraft" }] }),
  component: CreateJobPage,
});

function CreateJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useServerFn(createJob);
  const mutation = useMutation({
    mutationFn: (v: JobFormValues) => create({ data: toJobInput(v) }),
    onSuccess: () => {
      toast.success("Job published — it is now visible in job listings.");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["employer-dashboard"] });
      navigate({ to: "/employer/jobs" });
    },
    onError: (e: Error) => toast.error(friendly(e.message)),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="Create Job" subtitle="Add the required skills so candidates see their AI match score." />
      <JobForm initial={emptyJobForm} submitLabel="Publish job" busy={mutation.isPending} onSubmit={(v) => mutation.mutate(v)} />
    </div>
  );
}

export function friendly(message: string) {
  try {
    const parsed = JSON.parse(message) as { message?: string }[];
    return parsed[0]?.message ?? message;
  } catch {
    return message;
  }
}
