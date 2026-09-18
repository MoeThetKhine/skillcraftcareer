import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { listSkills, type JobInputData } from "@/lib/api/jobs.functions";
import { JOB_TYPES, formatJobType, type JobType } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkillBadge } from "@/components/shared";

export type JobFormValues = {
  title: string;
  description: string;
  responsibilities: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  jobType: JobType;
  experienceRequired: string;
  skillIds: number[];
};

export const emptyJobForm: JobFormValues = { title: "", description: "", responsibilities: "", location: "", salaryMin: "", salaryMax: "", jobType: "FullTime", experienceRequired: "", skillIds: [] };

export function toJobInput(v: JobFormValues): JobInputData {
  return {
    title: v.title,
    description: v.description,
    responsibilities: v.responsibilities || undefined,
    location: v.location,
    salaryMin: v.salaryMin ? Number(v.salaryMin) : null,
    salaryMax: v.salaryMax ? Number(v.salaryMax) : null,
    jobType: v.jobType,
    experienceRequired: v.experienceRequired || undefined,
    skillIds: v.skillIds,
  };
}

export function JobForm({ initial, onSubmit, submitLabel, busy }: { initial: JobFormValues; onSubmit: (v: JobFormValues) => void; submitLabel: string; busy: boolean }) {
  const [v, setV] = useState(initial);
  const [skillSearch, setSkillSearch] = useState("");
  const { data: skills = [] } = useQuery({ queryKey: ["skills"], queryFn: () => listSkills() });
  const set = (k: keyof JobFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const selected = skills.filter((s) => v.skillIds.includes(s.id));
  const suggestions = skills.filter((s) => !v.skillIds.includes(s.id) && s.name.toLowerCase().includes(skillSearch.toLowerCase())).slice(0, 12);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="surface-card space-y-5 p-6"
    >
      <F id="title" label="Job title"><Input id="title" required value={v.title} onChange={set("title")} placeholder="Backend Developer" /></F>
      <F id="desc" label="Description"><Textarea id="desc" required rows={5} value={v.description} onChange={set("description")} /></F>
      <F id="resp" label="Responsibilities" hint="One per line"><Textarea id="resp" rows={4} value={v.responsibilities} onChange={set("responsibilities")} /></F>
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="loc" label="Location"><Input id="loc" required value={v.location} onChange={set("location")} placeholder="Bangalore / Remote" /></F>
        <F id="type" label="Job type">
          <Select value={v.jobType} onValueChange={(t) => setV({ ...v, jobType: t as JobType })}>
            <SelectTrigger id="type"><SelectValue /></SelectTrigger>
            <SelectContent>{JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{formatJobType(t)}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F id="smin" label="Salary min (₹ / year)"><Input id="smin" type="number" min={0} value={v.salaryMin} onChange={set("salaryMin")} /></F>
        <F id="smax" label="Salary max (₹ / year)"><Input id="smax" type="number" min={0} value={v.salaryMax} onChange={set("salaryMax")} /></F>
        <F id="exp" label="Experience required"><Input id="exp" value={v.experienceRequired} onChange={set("experienceRequired")} placeholder="2-4 years" /></F>
      </div>
      <div className="space-y-2">
        <Label>Required skills</Label>
        <div className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-input bg-surface p-2">
          {selected.length === 0 && <span className="text-sm text-muted-foreground">No skills selected yet</span>}
          {selected.map((s) => (
            <SkillBadge key={s.id} tone="match" className="gap-1 py-1">
              {s.name}
              <button type="button" aria-label={`Remove ${s.name}`} onClick={() => setV({ ...v, skillIds: v.skillIds.filter((id) => id !== s.id) })}><X className="size-3" /></button>
            </SkillBadge>
          ))}
        </div>
        <Input value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="Search skills to add…" />
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s.id} type="button" onClick={() => setV({ ...v, skillIds: [...v.skillIds, s.id] })} className="rounded-md border border-border px-2 py-0.5 text-xs transition-colors hover:border-primary hover:text-primary">
              + {s.name}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
    </form>
  );
}

function F({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
