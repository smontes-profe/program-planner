"use server";

import { createClient } from "@/lib/supabase";

/**
 * Result type for Server Actions
 */
type ActionResponse<T = any> = 
  | { ok: true; data: T } 
  | { ok: false; error: string };

/**
 * Get all organizations where the current user is an active member
 */
export async function getUserOrganizations(): Promise<ActionResponse<any[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  const { data, error } = await supabase
    .from("organizations")
    .select(`
      id,
      code,
      name,
      membership:organization_memberships!inner (
        role_in_org,
        is_active
      )
    `)
    .eq("organization_memberships.profile_id", user.id)
    .eq("organization_memberships.is_active", true);

  if (error) return { ok: false, error: `Error al cargar organizaciones: ${error.message}` };
  return { ok: true, data: data || [] };
}

/**
 * Get all active regions in the catalog
 */
export async function getRegions(): Promise<ActionResponse<any[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regions")
    .select("code, name")
    .eq("is_active", true)
    .order("name");

  if (error) return { ok: false, error: `Error al cargar regiones: ${error.message}` };
  return { ok: true, data: data || [] };
}
