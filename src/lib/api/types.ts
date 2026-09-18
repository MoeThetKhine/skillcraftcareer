import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type JobType = Database["public"]["Enums"]["job_type"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type SkillLevel = Database["public"]["Enums"]["skill_level"];

export const JOB_TYPES: JobType[] = ["FullTime", "PartTime", "Internship", "Contract", "Remote"];
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Hired",
  "Rejected",
];

export interface JobDto {
  id: number;
  title: string;
  company: string;
  companyId: number;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: JobType;
  experienceRequired: string | null;
  description: string;
  responsibilities: string | null;
  skills: string[];
  isActive: boolean;
  createdAt: string;
}

export interface MeDto {
  id: string;
  name: string;
  email: string;
  role: AppRole | null;
  isActive: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function formatJobType(t: JobType) {
  return { FullTime: "Full-time", PartTime: "Part-time", Internship: "Internship", Contract: "Contract", Remote: "Remote" }[t];
}

export function formatSalary(min: number | null, max: number | null) {
  const f = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L` : `${Math.round(n / 1000)}k`);
  if (min && max) return `₹${f(min)} – ₹${f(max)}`;
  if (min) return `From ₹${f(min)}`;
  if (max) return `Up to ₹${f(max)}`;
  return "Not disclosed";
}
