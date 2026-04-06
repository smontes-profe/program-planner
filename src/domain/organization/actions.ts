"use server";

import { createClient, createAdminClient } from "@/lib/supabase";

/**
 * Result type for Server Actions
 */
type ActionResponse<T = any> = 
  | { ok: true; data: T } 
  | { ok: false; error: string; details?: any };

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

/**
 * Create a new organization and assign the user as org_manager
 */
export async function createOrganizationAction(name: string, code: string): Promise<ActionResponse<any>> {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  // 1. Create Organization with Admin Client (bypassing RLS)
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name, code, is_active: true })
    .select()
    .single();

  if (orgError) return { ok: false, error: `Error al crear organización: ${orgError.message}` };

  // 2. Add User as Manager with Admin Client
  const { error: memError } = await adminClient
    .from("organization_memberships")
    .insert({
      organization_id: org.id,
      profile_id: user.id,
      role_in_org: 'org_manager',
      is_active: true
    });

  if (memError) return { ok: false, error: `Error al crear membresía: ${memError.message}` };

  return { ok: true, data: org };
}

/**
 * Ensures the user has at least one organization. 
 * Used during first-time setup or demo purposes.
 */
export async function ensureUserHasOrganization(): Promise<ActionResponse<any>> {
  const orgs = await getUserOrganizations();
  if (orgs.ok && orgs.data && orgs.data.length > 0) return orgs;

  // Create a default personal organization
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Usuario no autenticado" };

  const result = await createOrganizationAction("Ilerna", "ILERNA");
  if (result.ok) {
    return { ok: true, data: [result.data] };
  }
  return result;
}
