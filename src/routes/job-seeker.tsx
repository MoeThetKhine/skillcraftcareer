import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireRole } from "@/components/RequireRole";

export const Route = createFileRoute("/job-seeker")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => (
    <RequireRole role="job_seeker">
      <Outlet />
    </RequireRole>
  ),
});
