import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search, SlidersHorizontal } from "lucide-react";
import { searchJobs, type JobSearchInput } from "@/lib/api/jobs.functions";
import { JOB_TYPES, formatJobType } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, JobCard, LoadingState, PageHeader } from "@/components/shared";

const searchSchema = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  jobType: z.string().optional(),
  skill: z.string().optional(),
  experience: z.string().optional(),
  salaryMin: z.coerce.number().optional(),
});

const jobsQuery = (input: JobSearchInput) => queryOptions({ queryKey: ["jobs", "search", input], queryFn: () => searchJobs({ data: input }) });

export const Route = createFileRoute("/jobs/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Browse Jobs — SkillCraft" },
      { name: "description", content: "Search jobs by keyword, location, skill, job type, experience and salary." },
      { property: "og:title", content: "Browse Jobs — SkillCraft" },
      { property: "og:description", content: "Search jobs by keyword, location, skill, job type, experience and salary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs" });
  const [form, setForm] = useState({ keyword: params.keyword ?? "", location: params.location ?? "", skill: params.skill ?? "", experience: params.experience ?? "", salaryMin: params.salaryMin?.toString() ?? "" });
  const { data, isLoading, error } = useQuery(jobsQuery(params));

  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate({
      search: {
        keyword: form.keyword || undefined,
        location: form.location || undefined,
        jobType: params.jobType,
        skill: form.skill || undefined,
        experience: form.experience || undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      },
    });
  };

  const setType = (v: string) => navigate({ search: (prev) => ({ ...prev, jobType: v === "all" ? undefined : v }) });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Find your next role" subtitle={data ? `${data.length} open position${data.length === 1 ? "" : "s"}` : "Search across titles, companies, skills and locations"} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <form onSubmit={apply} className="surface-card h-fit space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" /> Filters
          </div>
          <Field label="Keyword">
            <Input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="React, backend, Tech Solutions" />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bangalore, Remote" />
          </Field>
          <Field label="Job type">
            <Select value={params.jobType ?? "all"} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{formatJobType(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Skill">
            <Input value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} placeholder="e.g. Docker" />
          </Field>
          <Field label="Experience">
            <Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 2-4 years" />
          </Field>
          <Field label="Minimum salary (₹ / year)">
            <Input type="number" min={0} value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} placeholder="600000" />
          </Field>
          <Button type="submit" className="w-full">
            <Search className="size-4" /> Search
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setForm({ keyword: "", location: "", skill: "", experience: "", salaryMin: "" });
              navigate({ search: {} });
            }}
          >
            Clear filters
          </Button>
        </form>

        <div>
          {isLoading ? (
            <LoadingState label="Loading jobs…" />
          ) : error ? (
            <ErrorState message="Could not load jobs. Please try again." />
          ) : !data?.length ? (
            <EmptyState title="No jobs found." description="Try changing your search or filters." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
