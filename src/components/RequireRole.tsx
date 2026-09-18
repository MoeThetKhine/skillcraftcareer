import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth, roleHome } from "@/lib/auth/AuthContext";
import type { AppRole } from "@/lib/api/types";
import { Loader2 } from "lucide-react";

/** Client-side route guard: redirects to login when signed out, or home when the role does not match. */
export function RequireRole({ role, children }: { role: AppRole; children: ReactNode }) {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", search: { redirect: pathname }, replace: true });
      return;
    }
    if (user && user.role !== role) navigate({ to: roleHome(user.role), replace: true });
  }, [loading, session, user, role, navigate, pathname]);

  if (loading || !session || !user || user.role !== role) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading…
      </div>
    );
  }
  return <>{children}</>;
}
