import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getEmployerDashboard, saveCompany } from "@/lib/api/dashboard.functions";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState, PageHeader } from "@/components/shared";

export const Route = createFileRoute("/employer/company")({
  head: () => ({ meta: [{ title: "Company Profile — SkillCraft" }] }),
  component: CompanyPage,
});

function CompanyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetch = useServerFn(getEmployerDashboard);
  const save = useServerFn(saveCompany);
  const { data, isLoading } = useQuery({ queryKey: ["employer-dashboard", user?.id], queryFn: () => fetch() });
  const [f, setF] = useState({ name: "", description: "", website: "", location: "" });

  useEffect(() => {
    if (data?.company) {
      setF({ name: data.company.name, description: data.company.description ?? "", website: data.company.website ?? "", location: data.company.location ?? "" });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => save({ data: f }),
    onSuccess: () => {
      toast.success("Company profile saved");
      queryClient.invalidateQueries({ queryKey: ["employer-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader title="Company Profile" subtitle={data?.company ? "Update how candidates see your company." : "Create your company to start posting jobs."} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="surface-card space-y-4 p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="web">Website</Label>
            <Input id="web" type="url" placeholder="https://" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Location</Label>
            <Input id="loc" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
          </div>
        </div>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : data?.company ? "Save changes" : "Create company"}</Button>
      </form>
    </div>
  );
}
