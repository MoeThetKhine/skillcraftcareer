import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/api/auth.functions";
import type { AppRole, MeDto } from "@/lib/api/types";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Exclude<AppRole, "admin">;
  company?: { name: string; description?: string; website?: string; location?: string };
}

interface AuthContextValue {
  session: Session | null;
  user: MeDto | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<MeDto>;
  register: (input: RegisterInput) => Promise<MeDto>;
  signOut: () => Promise<void>;
  refresh: () => Promise<MeDto | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function roleHome(role: AppRole | null | undefined) {
  if (role === "employer") return "/employer/dashboard" as const;
  if (role === "admin") return "/admin/dashboard" as const;
  return "/job-seeker/dashboard" as const;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchMe = useServerFn(getMe);

  const loadUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      return me;
    } catch (err) {
      console.error("Failed to load profile", err);
      setUser(null);
      return null;
    }
  }, [fetchMe]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadUser();
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUser]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      const me = await loadUser();
      if (!me) throw new Error("Could not load your profile. Please try again.");
      if (!me.isActive) {
        await supabase.auth.signOut();
        throw new Error("Your account has been deactivated. Contact support.");
      }
      return me;
    },
    [loadUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { error, data } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { name: input.name, role: input.role, company: input.company } },
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error("Check your email to confirm your account, then log in.");
      const me = await loadUser();
      if (!me) throw new Error("Account created, but the profile could not be loaded. Please log in.");
      return me;
    },
    [loadUser],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ session, user, loading, signIn, register, signOut, refresh: loadUser }),
    [session, user, loading, signIn, register, signOut, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
