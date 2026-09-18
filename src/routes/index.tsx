import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Search, Sparkles, Target, Workflow } from "lucide-react";
import { getFeaturedJobs } from "@/lib/api/jobs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/shared";

const featuredQuery = queryOptions({ queryKey: ["jobs", "featured"], queryFn: () => getFeaturedJobs() });

const POPULAR_SKILLS = ["React", "C#", ".NET", "Python", "SQL", "Docker", "AWS", "Cyber Security", "Machine Learning", "Java"];
const CATEGORIES = [
  { name: "Backend", keyword: "Backend", count: "C# · .NET · Java" },
  { name: "Frontend", keyword: "React", count: "React · TypeScript" },
  { name: "Data & AI", keyword: "Data", count: "SQL · Python · ML" },
  { name: "Security", keyword: "Security", count: "Network · Pen-testing" },
  { name: "Cloud & DevOps", keyword: "DevOps", count: "Docker · Kubernetes" },
  { name: "Internships", keyword: "Intern", count: "Entry level" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillCraft — Build Skills. Find Opportunities." },
      { name: "description", content: "Discover jobs that match your skills with intelligent, explainable job recommendations." },
      { property: "og:title", content: "SkillCraft — Build Skills. Find Opportunities." },
      { property: "og:description", content: "Discover jobs that match your skills with intelligent, explainable job recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery),
  component: Index,
});

function Index() {
  const { data: featured } = useSuspenseQuery(featuredQuery);
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/jobs", search: { keyword: keyword || undefined, location: location || undefined } });
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" /> AI-powered skill matching
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] sm:text-7xl">
            Build Skills.
            <br />
            <span className="text-gradient-amber">Find Opportunities.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Discover jobs that match your skills with intelligent job recommendations.
          </p>
          <form onSubmit={search} className="surface-card mx-auto mt-10 flex max-w-2xl flex-col gap-2 p-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search jobs, skills, companies" className="h-12 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0" />
            </div>
            <div className="relative flex-1 sm:border-l sm:border-border">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="h-12 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0" />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6 font-semibold">
              Find Jobs
            </Button>
          </form>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Popular skills</span>
            {POPULAR_SKILLS.map((s) => (
              <Link key={s} to="/jobs" search={{ keyword: s }} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary">
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, title: "Add your skills", text: "Tell SkillCraft what you know — from C# to Kubernetes — with a skill level for each." },
            { icon: Sparkles, title: "See why a job matches", text: "Every job shows a match percentage plus exactly which skills match and which are missing." },
            { icon: Workflow, title: "Apply and track", text: "Apply in one click and follow your application from Applied to Interview to Hired." },
          ].map((f) => (
            <div key={f.title} className="surface-card p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured jobs */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Featured Jobs</h2>
            <p className="text-sm text-muted-foreground">Fresh openings from companies hiring right now.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/jobs">
              All jobs <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Popular Job Categories</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Link key={c.name} to="/jobs" search={{ keyword: c.keyword }} className="surface-card flex items-center justify-between p-5 transition-colors hover:border-primary/50">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.count}</p>
                </div>
                <ArrowRight className="size-4 text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
