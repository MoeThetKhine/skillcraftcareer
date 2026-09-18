import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./public-client.server";
import { JOB_TYPES, type JobDto } from "./types";

const JOB_SELECT =
  "id, title, location, salary_min, salary_max, job_type, experience_required, description, responsibilities, is_active, created_at, company_id, companies(name), job_skills(is_required, skills(name))";

type JobRow = {
  id: number;
  title: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  job_type: JobDto["jobType"];
  experience_required: string | null;
  description: string;
  responsibilities: string | null;
  is_active: boolean;
  created_at: string;
  company_id: number;
  companies: { name: string } | null;
  job_skills: { is_required: boolean; skills: { name: string } | null }[];
};

export function toJobDto(r: JobRow): JobDto {
  return {
    id: r.id,
    title: r.title,
    company: r.companies?.name ?? "Unknown company",
    companyId: r.company_id,
    location: r.location,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    jobType: r.job_type,
    experienceRequired: r.experience_required,
    description: r.description,
    responsibilities: r.responsibilities,
    skills: r.job_skills.map((s) => s.skills?.name).filter((n): n is string => Boolean(n)),
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

const SearchInput = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  jobType: z.string().optional(),
  skill: z.string().optional(),
  experience: z.string().optional(),
  salaryMin: z.number().optional(),
});
export type JobSearchInput = z.infer<typeof SearchInput>;

/** Public: search active jobs by keyword (title, company, skills, description, location) + filters. */
export const searchJobs = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SearchInput.parse(d ?? {}))
  .handler(async ({ data }): Promise<JobDto[]> => {
    const supabase = createPublicClient();
    let q = supabase.from("jobs").select(JOB_SELECT).eq("is_active", true).order("created_at", { ascending: false });
    if (data.jobType && (JOB_TYPES as string[]).includes(data.jobType)) q = q.eq("job_type", data.jobType as JobDto["jobType"]);
    if (data.location) q = q.ilike("location", `%${data.location}%`);
    if (data.salaryMin) q = q.gte("salary_max", data.salaryMin);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let jobs = (rows as unknown as JobRow[]).map(toJobDto);
    const kw = data.keyword?.trim().toLowerCase();
    if (kw) {
      jobs = jobs.filter((j) =>
        [j.title, j.company, j.description, j.location, ...j.skills].some((v) => v.toLowerCase().includes(kw)),
      );
    }
    if (data.skill) {
      const s = data.skill.toLowerCase();
      jobs = jobs.filter((j) => j.skills.some((k) => k.toLowerCase() === s));
    }
    if (data.experience) {
      const e = data.experience.toLowerCase();
      jobs = jobs.filter((j) => (j.experienceRequired ?? "").toLowerCase().includes(e));
    }
    return jobs;
  });

/** Public: single active job. */
export const getJob = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ data }): Promise<JobDto | null> => {
    const supabase = createPublicClient();
    const { data: row } = await supabase.from("jobs").select(JOB_SELECT).eq("id", data.id).eq("is_active", true).maybeSingle();
    return row ? toJobDto(row as unknown as JobRow) : null;
  });

/** Public: featured jobs for the home page. */
export const getFeaturedJobs = createServerFn({ method: "GET" }).handler(async (): Promise<JobDto[]> => {
  const supabase = createPublicClient();
  const { data: rows } = await supabase.from("jobs").select(JOB_SELECT).eq("is_active", true).order("created_at", { ascending: false }).limit(6);
  return ((rows ?? []) as unknown as JobRow[]).map(toJobDto);
});

/** Public: skills list. */
export const listSkills = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const { data } = await supabase.from("skills").select("id, name").order("name");
  return data ?? [];
});

// ---------- Employer job management ----------

const JobInput = z.object({
  title: z.string().trim().min(3, "Job title is required").max(120),
  description: z.string().trim().min(20, "Description must be at least 20 characters"),
  responsibilities: z.string().trim().optional(),
  location: z.string().trim().min(2, "Location is required"),
  salaryMin: z.number().int().nonnegative().nullable(),
  salaryMax: z.number().int().nonnegative().nullable(),
  jobType: z.enum(["FullTime", "PartTime", "Internship", "Contract", "Remote"]),
  experienceRequired: z.string().trim().optional(),
  skillIds: z.array(z.number()).min(1, "Add at least one required skill"),
});
export type JobInputData = z.infer<typeof JobInput>;

function validateSalary(d: JobInputData) {
  if (d.salaryMin != null && d.salaryMax != null && d.salaryMin > d.salaryMax) {
    throw new Error("Minimum salary cannot exceed maximum salary");
  }
}

async function requireEmployerCompany(ctx: { supabase: any; userId: string }) {
  const { data: ep } = await ctx.supabase.from("employer_profiles").select("company_id").eq("user_id", ctx.userId).maybeSingle();
  if (!ep) throw new Error("Only employers can manage jobs");
  if (!ep.company_id) throw new Error("Create your company profile before posting jobs");
  return ep.company_id as number;
}

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const companyId = await requireEmployerCompany(context);
    const { data: rows, error } = await context.supabase
      .from("jobs")
      .select(`${JOB_SELECT}, applications(count)`)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows as unknown as (JobRow & { applications: { count: number }[] })[]).map((r) => ({
      ...toJobDto(r),
      applicantCount: r.applications?.[0]?.count ?? 0,
    }));
  });

export const getMyJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number() }).parse(d))
  .handler(async ({ context, data }) => {
    const companyId = await requireEmployerCompany(context);
    const { data: row } = await context.supabase
      .from("jobs")
      .select(`${JOB_SELECT}, job_skills(skill_id)`)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!row) throw new Error("Job not found");
    const r = row as unknown as JobRow;
    const skillIds = ((row as unknown as { job_skills: { skill_id?: number }[] }).job_skills ?? []).map((s) => s.skill_id).filter((n): n is number => typeof n === "number");
    return { ...toJobDto(r), skillIds };
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => JobInput.parse(d))
  .handler(async ({ context, data }) => {
    validateSalary(data);
    const companyId = await requireEmployerCompany(context);
    const { data: job, error } = await context.supabase
      .from("jobs")
      .insert({
        company_id: companyId,
        created_by: context.userId,
        title: data.title,
        description: data.description,
        responsibilities: data.responsibilities || null,
        location: data.location,
        salary_min: data.salaryMin,
        salary_max: data.salaryMax,
        job_type: data.jobType,
        experience_required: data.experienceRequired || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: skErr } = await context.supabase
      .from("job_skills")
      .insert(data.skillIds.map((skill_id) => ({ job_id: job.id, skill_id, is_required: true })));
    if (skErr) throw new Error(skErr.message);
    return { id: job.id };
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => JobInput.extend({ id: z.number() }).parse(d))
  .handler(async ({ context, data }) => {
    validateSalary(data);
    const companyId = await requireEmployerCompany(context);
    const { data: updated, error } = await context.supabase
      .from("jobs")
      .update({
        title: data.title,
        description: data.description,
        responsibilities: data.responsibilities || null,
        location: data.location,
        salary_min: data.salaryMin,
        salary_max: data.salaryMax,
        job_type: data.jobType,
        experience_required: data.experienceRequired || null,
      })
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!updated?.length) throw new Error("You can only edit your own company's jobs");
    await context.supabase.from("job_skills").delete().eq("job_id", data.id);
    const { error: skErr } = await context.supabase
      .from("job_skills")
      .insert(data.skillIds.map((skill_id) => ({ job_id: data.id, skill_id, is_required: true })));
    if (skErr) throw new Error(skErr.message);
    return { id: data.id };
  });

export const setJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number(), isActive: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: updated, error } = await context.supabase
      .from("jobs")
      .update({ is_active: data.isActive })
      .eq("id", data.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!updated?.length) throw new Error("You are not allowed to change this job");
    return { ok: true };
  });
