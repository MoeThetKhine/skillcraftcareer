import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { Briefcase, Building2, CalendarDays, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getJob } from "@/lib/api/jobs.functions";
import { applyToJob, getMyJobContext } from "@/lib/api/applications.functions";
import { formatJobType, formatSalary } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SkillBadge, StatusBadge } from "@/components/shared";

const jobQuery = (id: number) => queryOptions({ queryKey: ["jobs", id], queryFn: () => getJob({ data: { id } }) });

export const Route = createFileRoute("/jobs/$id")({
  loader: async ({ context, params }) => {
    const id = Number(params.id);
    if (!Number.isFinite(id)) throw notFound();
    const job = await context.queryClient.ensureQueryData(jobQuery(id));
    if (!job) throw notFound();
    return { job };
  },
  head: ({ loaderData }) => {
    const job = loaderData?.job;
    const title = job ? `${job.title} at ${job.company} — SkillCraft` : "Job — SkillCraft";
    const desc = job ? `${formatJobType(job.jobType)} · ${job.location} · Skills: ${job.skills.join(", ")}` : "Job details on SkillCraft";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(job ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const jobId = Number(id);
  const { data: job } = useSuspenseQuery(jobQuery(jobId));
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchContext = useServerFn(getMyJobContext);
  const apply = useServerFn(applyToJob);
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const isSeeker = user?.role === "job_seeker";
  const { data: ctx } = useQuery({
    queryKey: ["job-context", jobId, user?.id],
    queryFn: () => fetchContext({ data: { jobId } }),
    enabled: isSeeker,
  });

  const applyMutation = useMutation({
    mutationFn: () => apply({ data: { jobId, coverLetter } }),
    onSuccess: () => {
      toast.success("Application submitted! Track it under Applications.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["job-context", jobId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!job) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="space-y-8">
          <header className="surface-card p-6 sm:p-8">
            <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium">{formatJobType(job.jobType)}</span>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{job.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-lg text-muted-foreground">
              <Building2 className="size-4" /> {job.company}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Meta icon={MapPin} label="Location" value={job.location} />
              <Meta icon={Wallet} label="Salary" value={formatSalary(job.salaryMin, job.salaryMax)} />
              <Meta icon={Briefcase} label="Experience" value={job.experienceRequired ?? "Any"} />
              <Meta icon={CalendarDays} label="Posted" value={format(new Date(job.createdAt), "d MMM yyyy")} />
            </dl>
          </header>

          <Section title="About the role">
            <p className="whitespace-pre-line text-muted-foreground">{job.description}</p>
          </Section>
          {job.responsibilities && (
            <Section title="Responsibilities">
              <p className="whitespace-pre-line text-muted-foreground">{job.responsibilities}</p>
            </Section>
          )}
          <Section title="Required skills">
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <SkillBadge key={s} className="px-3 py-1 text-sm">{s}</SkillBadge>
              ))}
            </div>
          </Section>
        </article>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="surface-card p-5">
            {!user ? (
              <>
                <p className="text-sm text-muted-foreground">Log in as a job seeker to apply and see how well your skills match.</p>
                <Button className="mt-4 w-full" asChild>
                  <Link to="/login" search={{ redirect: `/jobs/${job.id}` }}>Login to apply</Link>
                </Button>
                <Button variant="ghost" className="mt-2 w-full" asChild>
                  <Link to="/register">Create an account</Link>
                </Button>
              </>
            ) : isSeeker ? (
              ctx?.application ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">You applied for this job</p>
                  <StatusBadge status={ctx.application.status} />
                  <Button variant="secondary" className="w-full" asChild>
                    <Link to="/job-seeker/applications">Track application</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Ready to take the next step?</p>
                  <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
                    Apply Now
                  </Button>
                </>
              )
            ) : (
              <p className="text-sm text-muted-foreground">You are signed in as {user.role === "employer" ? "an employer" : "an admin"}. Only job seekers can apply.</p>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
            <DialogDescription>Add a short cover letter (optional). Your profile and skills are shared with {job.company}.</DialogDescription>
          </DialogHeader>
          <Textarea rows={6} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Why are you a great fit for this role?" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground"><Icon className="size-3.5" /> {label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
