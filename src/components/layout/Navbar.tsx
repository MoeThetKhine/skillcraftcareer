import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Hammer, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string };

const PUBLIC: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Jobs", to: "/jobs" },
];
const SEEKER: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Jobs", to: "/jobs" },
  { label: "Dashboard", to: "/job-seeker/dashboard" },
  { label: "Applications", to: "/job-seeker/applications" },
];
const EMPLOYER: NavItem[] = [
  { label: "Dashboard", to: "/employer/dashboard" },
  { label: "My Jobs", to: "/employer/jobs" },
  { label: "Company", to: "/employer/company" },
];
const ADMIN: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Jobs", to: "/admin/jobs" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display text-lg font-bold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground amber-glow">
        <Hammer className="size-4" />
      </span>
      SkillCraft
    </Link>
  );
}

export function Navbar() {
  const { user, session, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = !user ? PUBLIC : user.role === "employer" ? EMPLOYER : user.role === "admin" ? ADMIN : SEEKER;

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  const linkClass = "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const activeProps = { className: "rounded-md px-3 py-2 text-sm font-medium text-foreground bg-accent" };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className={linkClass} activeProps={activeProps} activeOptions={{ exact: i.to === "/" }}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {loading && session ? null : user ? (
            <>
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="size-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
        <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col py-2">
            {items.map((i) => (
              <Link key={i.to} to={i.to} className="rounded-md px-3 py-2.5 text-sm font-medium" onClick={() => setOpen(false)}>
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-2 pt-2">
            {user ? (
              <Button variant="secondary" className="flex-1" onClick={handleSignOut}>
                <LogOut className="size-4" /> Logout
              </Button>
            ) : (
              <>
                <Button variant="secondary" className="flex-1" asChild>
                  <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link to="/register" onClick={() => setOpen(false)}>Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
