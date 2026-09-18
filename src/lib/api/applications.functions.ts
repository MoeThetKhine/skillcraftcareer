import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ApplicationStatus } from "./types";

/** Job seeker: apply to a job. Enforces role, active job, and no duplicates. */
export const applyToJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.number(), coverLetter: z.string().trim().max(2000).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((r) => r.role === "job_seeker")) throw new Error("Only job seekers can apply for jobs");

    const { data: job } = await supabase.from("jobs").select("id, is_active").eq("id", data.jobId).maybeSingle();
    if (!job) throw new Error("Job not found");
    if (!job.is_active) throw new Error("This job is no longer accepting applications");

    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", data.jobId)
      .eq("job_seeker_id", userId)
      .maybeSingle();
    if (existing) throw new Error("You have already applied for this job.");

    const { data: seeker } = await supabase.from("job_seeker_profiles").select("resume_url").eq("user_id", userId).maybeSingle();

    const { data: app, error } = await supabase
      .from("applications")
      .insert({ job_id: data.jobId, job_seeker_id: userId, cover_letter: data.coverLetter || null, resume_url: seeker?.resume_url ?? null })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("You have already applied for this job.");
      throw new Error(error.message);
    }
    await supabase
      .from("application_status_history")
      .insert({ application_id: app.id, old_status: null, new_status: "Applied", changed_by: userId });
    return { id: app.id };
  });

/** Job seeker: my applications with job + company info. */
export const listMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("applications")
      .select("id, status, applied_at, updated_at, cover_letter, jobs(id, title, location, job_type, is_active, companies(name))")
      .eq("job_seeker_id", context.userId)
      .order("applied_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((a) => {
      const j = a.jobs as unknown as { id: number; title: string; location: string; job_type: string; is_active: boolean; companies: { name: string } | null } | null;
      return {
        id: a.id,
        status: a.status,
        appliedAt: a.applied_at,
        updatedAt: a.updated_at,
        jobId: j?.id ?? 0,
        jobTitle: j?.title ?? "Job removed",
        company: j?.companies?.name ?? "",
        location: j?.location ?? "",
        jobType: j?.job_type ?? "",
        jobActive: j?.is_active ?? false,
      };
    });
  });

/** Job seeker: context for a job detail page (applied? saved?). */
export const getMyJobContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.number() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ data: app }, { data: saved }] = await Promise.all([
      supabase.from("applications").select("id, status").eq("job_id", data.jobId).eq("job_seeker_id", userId).maybeSingle(),
      supabase.from("saved_jobs").select("id").eq("job_id", data.jobId).eq("user_id", userId).maybeSingle(),
    ]);
    return { application: app ?? null, saved: Boolean(saved) };
  });

/** Employer: applicants for one of my jobs, with skills and history. */
export const listJobApplicants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.number() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: job } = await supabase
      .from("jobs")
      .select("id, title, is_active, job_skills(skills(name))")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job) throw new Error("Job not found");

    const { data: apps, error } = await supabase
      .from("applications")
      .select("id, status, applied_at, updated_at, cover_letter, resume_url, job_seeker_id")
      .eq("job_id", data.jobId)
      .order("applied_at", { ascending: false });
    if (error) throw new Error(error.message);

    const seekerIds = (apps ?? []).map((a) => a.job_seeker_id);
    const [{ data: profiles }, { data: skills }, { data: seekerProfiles }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("id, name, email").in("id", seekerIds),
      supabase.from("user_skills").select("user_id, skill_level, skills(name)").in("user_id", seekerIds),
      supabase.from("job_seeker_profiles").select("user_id, education, experience, location, bio, resume_url").in("user_id", seekerIds),
      supabase
        .from("application_status_history")
        .select("application_id, old_status, new_status, changed_at")
        .in("application_id", (apps ?? []).map((a) => a.id))
        .order("changed_at", { ascending: true }),
    ]);

    const jobSkills = (job.job_skills as unknown as { skills: { name: string } | null }[]).map((s) => s.skills?.name).filter(Boolean) as string[];

    return {
      job: { id: job.id, title: job.title, isActive: job.is_active, skills: jobSkills },
      applicants: (apps ?? []).map((a) => {
        const p = profiles?.find((x) => x.id === a.job_seeker_id);
        const sp = seekerProfiles?.find((x) => x.user_id === a.job_seeker_id);
        const mySkills = (skills ?? [])
          .filter((s) => s.user_id === a.job_seeker_id)
          .map((s) => ({ name: (s.skills as unknown as { name: string } | null)?.name ?? "", level: s.skill_level }))
          .filter((s) => s.name);
        const names = new Set(mySkills.map((s) => s.name.toLowerCase()));
        const matching = jobSkills.filter((s) => names.has(s.toLowerCase()));
        const missing = jobSkills.filter((s) => !names.has(s.toLowerCase()));
        return {
          id: a.id,
          status: a.status,
          appliedAt: a.applied_at,
          coverLetter: a.cover_letter,
          resumeUrl: a.resume_url ?? sp?.resume_url ?? null,
          candidate: {
            id: a.job_seeker_id,
            name: p?.name ?? "Candidate",
            email: p?.email ?? "",
            education: sp?.education ?? null,
            experience: sp?.experience ?? null,
            location: sp?.location ?? null,
            bio: sp?.bio ?? null,
          },
          skills: mySkills,
          match: {
            percentage: jobSkills.length ? Math.round((matching.length / jobSkills.length) * 100) : 0,
            matchingSkills: matching,
            missingSkills: missing,
          },
          history: (history ?? []).filter((h) => h.application_id === a.id),
        };
      }),
    };
  });

/** Employer: update application status, recording history. */
export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.number(), status: z.enum(["Applied", "Shortlisted", "Interview", "Hired", "Rejected"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: current } = await supabase.from("applications").select("id, status").eq("id", data.id).maybeSingle();
    if (!current) throw new Error("Application not found");
    if (current.status === data.status) return { ok: true };
    const { data: updated, error } = await supabase.from("applications").update({ status: data.status }).eq("id", data.id).select("id");
    if (error) throw new Error(error.message);
    if (!updated?.length) throw new Error("You are not allowed to update this application");
    await supabase.from("application_status_history").insert({
      application_id: data.id,
      old_status: current.status as ApplicationStatus,
      new_status: data.status,
      changed_by: userId,
    });
    return { ok: true };
  });
