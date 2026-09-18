import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Job seeker dashboard stats + profile. */
export const getSeekerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: skills }, { data: apps }, { count: saved }] = await Promise.all([
      supabase.from("job_seeker_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_skills").select("skill_id, skill_level, skills(name)").eq("user_id", userId),
      supabase.from("applications").select("id, status").eq("job_seeker_id", userId),
      supabase.from("saved_jobs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    const fields = [profile?.education, profile?.experience, profile?.bio, profile?.location, profile?.resume_url];
    const filled = fields.filter(Boolean).length + (skills?.length ? 1 : 0);
    return {
      profile,
      skills: (skills ?? []).map((s) => ({ id: s.skill_id, name: (s.skills as unknown as { name: string } | null)?.name ?? "", level: s.skill_level })),
      profileCompletion: Math.round((filled / 6) * 100),
      applied: apps?.length ?? 0,
      interviews: apps?.filter((a) => a.status === "Interview").length ?? 0,
      saved: saved ?? 0,
    };
  });

/** Employer dashboard stats. */
export const getEmployerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ep } = await supabase.from("employer_profiles").select("company_id, position, companies(*)").eq("user_id", userId).maybeSingle();
    if (!ep) throw new Error("Employer profile not found");
    const company = ep.companies as unknown as { id: number; name: string; description: string | null; website: string | null; location: string | null } | null;
    if (!ep.company_id) return { company: null, totalJobs: 0, activeJobs: 0, applicants: 0, shortlisted: 0, interviews: 0, hired: 0 };
    const { data: jobs } = await supabase.from("jobs").select("id, is_active").eq("company_id", ep.company_id);
    const jobIds = (jobs ?? []).map((j) => j.id);
    const { data: apps } = jobIds.length
      ? await supabase.from("applications").select("id, status").in("job_id", jobIds)
      : { data: [] as { id: number; status: string }[] };
    const count = (s: string) => (apps ?? []).filter((a) => a.status === s).length;
    return {
      company,
      totalJobs: jobs?.length ?? 0,
      activeJobs: jobs?.filter((j) => j.is_active).length ?? 0,
      applicants: apps?.length ?? 0,
      shortlisted: count("Shortlisted"),
      interviews: count("Interview"),
      hired: count("Hired"),
    };
  });

const CompanyInput = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().url("Enter a valid website URL").or(z.literal("")).optional(),
  location: z.string().trim().max(120).optional(),
});

/** Employer: create or update own company. */
export const saveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: ep } = await supabase.from("employer_profiles").select("id, company_id").eq("user_id", userId).maybeSingle();
    if (!ep) throw new Error("Only employers can manage a company");
    const payload = { name: data.name, description: data.description || null, website: data.website || null, location: data.location || null };
    if (ep.company_id) {
      const { error } = await supabase.from("companies").update(payload).eq("id", ep.company_id);
      if (error) throw new Error(error.message);
      return { id: ep.company_id };
    }
    const { data: c, error } = await supabase.from("companies").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    const { error: linkErr } = await supabase.from("employer_profiles").update({ company_id: c.id }).eq("id", ep.id);
    if (linkErr) throw new Error(linkErr.message);
    return { id: c.id };
  });

/** Admin dashboard stats. */
export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Admin access required");
    const [{ data: allRoles }, { count: companies }, { data: jobs }, { count: applications }] = await Promise.all([
      supabase.from("user_roles").select("role"),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id, is_active"),
      supabase.from("applications").select("id", { count: "exact", head: true }),
    ]);
    return {
      users: allRoles?.length ?? 0,
      jobSeekers: allRoles?.filter((r) => r.role === "job_seeker").length ?? 0,
      employers: allRoles?.filter((r) => r.role === "employer").length ?? 0,
      companies: companies ?? 0,
      jobs: jobs?.length ?? 0,
      activeJobs: jobs?.filter((j) => j.is_active).length ?? 0,
      applications: applications ?? 0,
    };
  });

/** Admin: all jobs (active + inactive). */
export const adminListJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jobs")
      .select("id, title, location, job_type, is_active, created_at, companies(name), applications(count)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((j) => ({
      id: j.id,
      title: j.title,
      location: j.location,
      jobType: j.job_type,
      isActive: j.is_active,
      createdAt: j.created_at,
      company: (j.companies as unknown as { name: string } | null)?.name ?? "",
      applicants: (j.applications as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));
  });
