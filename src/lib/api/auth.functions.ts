import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, MeDto } from "./types";

/**
 * Returns the signed-in user's profile + role. On first call after registration it
 * provisions the profile, role, and role-specific records from the sign-up metadata.
 * Admin can never be self-assigned: the role is restricted here and by database policy.
 */
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MeDto> => {
    const { supabase, userId, claims } = context;
    const meta = (claims as { user_metadata?: Record<string, unknown> }).user_metadata ?? {};
    const email = String((claims as { email?: string }).email ?? "");

    let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (!profile) {
      const name = String(meta["name"] ?? email.split("@")[0] ?? "User").slice(0, 80);
      const { data: inserted, error } = await supabase
        .from("profiles")
        .insert({ id: userId, name, email })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      profile = inserted;

      const requested = meta["role"] === "employer" ? "employer" : "job_seeker";
      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: userId, role: requested });
      if (roleErr) throw new Error(roleErr.message);

      if (requested === "job_seeker") {
        await supabase.from("job_seeker_profiles").insert({ user_id: userId });
      } else {
        const company = (meta["company"] ?? {}) as Record<string, string | undefined>;
        let companyId: number | null = null;
        if (company["name"]) {
          const { data: c } = await supabase
            .from("companies")
            .insert({
              name: company["name"],
              description: company["description"] ?? null,
              website: company["website"] ?? null,
              location: company["location"] ?? null,
            })
            .select("id")
            .single();
          companyId = c?.id ?? null;
        }
        await supabase.from("employer_profiles").insert({ user_id: userId, company_id: companyId });
      }
    }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const role = (roles?.[0]?.role as AppRole | undefined) ?? null;

    return { id: profile.id, name: profile.name, email: profile.email, role, isActive: profile.is_active };
  });
