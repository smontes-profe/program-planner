"use server";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase";

type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

export interface AccessRequestRow {
  id: string;
  full_name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  is_platform_admin: boolean | null;
  created_at: string;
}

export interface OrganizationRow {
  id: string;
  code: string;
  name: string;
}

const requestAccessSchema = z.object({
  full_name: z.string().trim().min(3, "Indica nombre y apellidos."),
  email: z.string().trim().email("Email no valido."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
});

const approveRequestSchema = z.object({
  request_id: z.string().uuid(),
  account_type: z.enum(["admin", "user"]),
  organization_id: z.string().uuid(),
  assigned_password: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.length >= 8,
      "La contrasena de reemplazo debe tener al menos 8 caracteres."
    ),
  reviewer_notes: z.string().trim().max(500).optional(),
});

const rejectRequestSchema = z.object({
  request_id: z.string().uuid(),
  reviewer_notes: z.string().trim().max(500).optional(),
});

const updatePlatformRoleSchema = z.object({
  profile_id: z.string().uuid(),
  make_admin: z.enum(["true", "false"]),
});

const directCreateUserSchema = z.object({
  full_name: z.string().trim().min(3, "Indica nombre y apellidos."),
  email: z.string().trim().email("Email no valido."),
  assigned_password: z.string().min(8, "La contrasena asignada debe tener al menos 8 caracteres."),
  account_type: z.enum(["admin", "user"]),
  organization_id: z.string().uuid(),
});

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_admin) {
    redirect("/curriculum?error=Sin+permisos+de+administracion");
  }

  return { userId: user.id };
}

function protectRequestedPassword(password: string) {
  const secretSeed = process.env.ACCESS_REQUEST_PASSWORD_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretSeed) {
    throw new Error("Missing password encryption secret.");
  }

  const key = createHash("sha256").update(secretSeed).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc_v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function getRequestedPasswordIfRecoverable(serializedPassword: string | null | undefined): string | null {
  if (!serializedPassword) {
    return null;
  }
  if (!serializedPassword.startsWith("enc_v1:")) {
    return null;
  }

  const [, ivPart, tagPart, encryptedPart] = serializedPassword.split(":");
  if (!ivPart || !tagPart || !encryptedPart) {
    return null;
  }

  const secretSeed = process.env.ACCESS_REQUEST_PASSWORD_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretSeed) {
    return null;
  }

  try {
    const key = createHash("sha256").update(secretSeed).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function toAdminRedirect(urlSafeMessage: string, isError = false): never {
  const key = isError ? "error" : "message";
  return redirect(`/admin?${key}=${encodeURIComponent(urlSafeMessage)}`);
}

export async function getAdminDashboardData(): Promise<{
  accessRequests: AccessRequestRow[];
  users: AdminUserRow[];
  organizations: OrganizationRow[];
}> {
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const [{ data: requests }, { data: users }, { data: organizations }] = await Promise.all([
    adminClient
      .from("access_requests")
      .select("id, full_name, email, status, reviewer_notes, created_at, reviewed_at")
      .order("created_at", { ascending: false }),
    adminClient
      .from("profiles")
      .select("id, email, full_name, is_platform_admin, created_at")
      .order("created_at", { ascending: false }),
    adminClient
      .from("organizations")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  return {
    accessRequests: (requests ?? []) as AccessRequestRow[],
    users: (users ?? []) as AdminUserRow[],
    organizations: (organizations ?? []) as OrganizationRow[],
  };
}

export async function submitAccessRequestAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  void prevState;
  const raw = {
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const validated = requestAccessSchema.safeParse(raw);
  if (!validated.success) {
    return {
      ok: false,
      error: validated.error.issues[0]?.message ?? "Datos no validos.",
      fields: {
        full_name: raw.full_name,
        email: raw.email,
      },
    };
  }

  const adminClient = createAdminClient();
  const payload = validated.data;

  const { error } = await adminClient.from("access_requests").insert({
    full_name: payload.full_name,
    email: payload.email.toLowerCase(),
    requested_password_hash: protectRequestedPassword(payload.password),
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Ya existe una solicitud pendiente para ese email.",
        fields: { full_name: payload.full_name, email: payload.email },
      };
    }
    return {
      ok: false,
      error: "No se pudo guardar la solicitud. Intentalo de nuevo.",
      fields: { full_name: payload.full_name, email: payload.email },
    };
  }

  return {
    ok: true,
    message: "Solicitud enviada. Un administrador revisara tu acceso.",
    fields: { full_name: payload.full_name, email: payload.email },
  };
}

export async function approveAccessRequestAction(formData: FormData) {
  const { userId } = await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const rawPayload = {
    request_id: String(formData.get("request_id") ?? ""),
    account_type: String(formData.get("account_type") ?? ""),
    organization_id: String(formData.get("organization_id") ?? ""),
    assigned_password: String(formData.get("assigned_password") ?? ""),
    reviewer_notes: String(formData.get("reviewer_notes") ?? ""),
  };

  const validated = approveRequestSchema.safeParse(rawPayload);
  if (!validated.success) {
    return toAdminRedirect(validated.error.issues[0]?.message ?? "No se pudo aprobar la solicitud.", true);
  }

  const data = validated.data;
  const { data: request, error: requestError } = await adminClient
    .from("access_requests")
    .select("id, email, full_name, status, requested_password_hash")
    .eq("id", data.request_id)
    .maybeSingle();

  if (requestError || !request) {
    return toAdminRedirect("Solicitud no encontrada.", true);
  }
  if (request.status !== "pending") {
    return toAdminRedirect("La solicitud ya fue revisada.", true);
  }

  let passwordToApply = data.assigned_password;
  if (!passwordToApply) {
    const recoveredPassword = getRequestedPasswordIfRecoverable(request.requested_password_hash);
    if (!recoveredPassword) {
      return toAdminRedirect(
        "No se pudo recuperar la contrasena solicitada. Escribe una contrasena en el campo de reemplazo para aprobar esta solicitud.",
        true
      );
    }
    passwordToApply = recoveredPassword;
  }

  let profileId: string | null = null;

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email: request.email.toLowerCase(),
    password: passwordToApply,
    email_confirm: true,
    user_metadata: { full_name: request.full_name },
  });

  if (createError) {
    const maybeAlreadyExists = createError.message.toLowerCase().includes("already");
    if (!maybeAlreadyExists) {
      return toAdminRedirect(`Error creando usuario: ${createError.message}`, true);
    }

    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", request.email.toLowerCase())
      .maybeSingle();

    if (!existingProfile?.id) {
      return toAdminRedirect("El usuario ya existia, pero no se encontro su perfil.", true);
    }

    const existingProfileId = existingProfile.id;
    profileId = existingProfileId;
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(existingProfileId, {
      password: passwordToApply,
      email_confirm: true,
      user_metadata: { full_name: request.full_name },
    });
    if (updateAuthError) {
      return toAdminRedirect(`No se pudo actualizar la clave del usuario existente: ${updateAuthError.message}`, true);
    }
  } else {
    profileId = createdUser.user?.id ?? null;
  }

  if (!profileId) {
    return toAdminRedirect("No se pudo resolver el usuario final para aprobar la solicitud.", true);
  }

  const makePlatformAdmin = data.account_type === "admin";
  const orgRole = makePlatformAdmin ? "org_manager" : "teacher";

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      full_name: request.full_name,
      is_platform_admin: makePlatformAdmin,
    })
    .eq("id", profileId);
  if (profileError) {
    return toAdminRedirect(`No se pudo actualizar el perfil: ${profileError.message}`, true);
  }

  const { error: membershipError } = await adminClient.from("organization_memberships").upsert(
    {
      organization_id: data.organization_id,
      profile_id: profileId,
      role_in_org: orgRole,
      is_active: true,
    },
    { onConflict: "organization_id,profile_id" }
  );
  if (membershipError) {
    return toAdminRedirect(`No se pudo crear la membresia: ${membershipError.message}`, true);
  }

  const { error: statusError } = await adminClient
    .from("access_requests")
    .update({
      status: "approved",
      reviewer_notes: data.reviewer_notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by_profile_id: userId,
      updated_at: new Date().toISOString(),
      requested_password_hash: "redacted",
    })
    .eq("id", data.request_id);
  if (statusError) {
    return toAdminRedirect(`No se pudo cerrar la solicitud: ${statusError.message}`, true);
  }

  revalidatePath("/admin");
  return toAdminRedirect(`Solicitud aprobada para ${request.email}.`);
}

export async function rejectAccessRequestAction(formData: FormData) {
  const { userId } = await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const rawPayload = {
    request_id: String(formData.get("request_id") ?? ""),
    reviewer_notes: String(formData.get("reviewer_notes") ?? ""),
  };

  const validated = rejectRequestSchema.safeParse(rawPayload);
  if (!validated.success) {
    return toAdminRedirect(validated.error.issues[0]?.message ?? "No se pudo rechazar la solicitud.", true);
  }

  const data = validated.data;

  const { error } = await adminClient
    .from("access_requests")
    .update({
      status: "rejected",
      reviewer_notes: data.reviewer_notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by_profile_id: userId,
      updated_at: new Date().toISOString(),
      requested_password_hash: "redacted",
    })
    .eq("id", data.request_id)
    .eq("status", "pending");

  if (error) {
    return toAdminRedirect(`No se pudo rechazar la solicitud: ${error.message}`, true);
  }

  revalidatePath("/admin");
  return toAdminRedirect("Solicitud rechazada.");
}

export async function updateUserPlatformAdminAction(formData: FormData) {
  const { userId } = await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const rawPayload = {
    profile_id: String(formData.get("profile_id") ?? ""),
    make_admin: String(formData.get("make_admin") ?? ""),
  };

  const validated = updatePlatformRoleSchema.safeParse(rawPayload);
  if (!validated.success) {
    return toAdminRedirect(validated.error.issues[0]?.message ?? "No se pudo actualizar el rol.", true);
  }

  const data = validated.data;
  const makeAdmin = data.make_admin === "true";

  if (!makeAdmin && data.profile_id === userId) {
    return toAdminRedirect("No puedes quitarte a ti mismo permisos de admin del sistema.", true);
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ is_platform_admin: makeAdmin })
    .eq("id", data.profile_id);

  if (error) {
    return toAdminRedirect(`No se pudo actualizar permisos: ${error.message}`, true);
  }

  revalidatePath("/admin");
  return toAdminRedirect(makeAdmin ? "Usuario promovido a admin." : "Usuario cambiado a usuario normal.");
}

export async function createDirectUserAction(formData: FormData) {
  await requirePlatformAdmin();
  const adminClient = createAdminClient();

  const rawPayload = {
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    assigned_password: String(formData.get("assigned_password") ?? ""),
    account_type: String(formData.get("account_type") ?? ""),
    organization_id: String(formData.get("organization_id") ?? ""),
  };

  const validated = directCreateUserSchema.safeParse(rawPayload);
  if (!validated.success) {
    return toAdminRedirect(validated.error.issues[0]?.message ?? "No se pudo crear el usuario.", true);
  }

  const data = validated.data;
  const normalizedEmail = data.email.toLowerCase();

  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile?.id) {
    return toAdminRedirect("Ya existe un usuario con ese email.", true);
  }

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: data.assigned_password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  });

  if (createError) {
    return toAdminRedirect(`No se pudo crear el usuario: ${createError.message}`, true);
  }

  const profileId = createdUser.user?.id;
  if (!profileId) {
    return toAdminRedirect("Usuario creado sin identificador de perfil.", true);
  }

  const makePlatformAdmin = data.account_type === "admin";
  const orgRole = makePlatformAdmin ? "org_manager" : "teacher";

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      full_name: data.full_name,
      is_platform_admin: makePlatformAdmin,
    })
    .eq("id", profileId);
  if (profileError) {
    return toAdminRedirect(`No se pudo actualizar el perfil: ${profileError.message}`, true);
  }

  const { error: membershipError } = await adminClient.from("organization_memberships").upsert(
    {
      organization_id: data.organization_id,
      profile_id: profileId,
      role_in_org: orgRole,
      is_active: true,
    },
    { onConflict: "organization_id,profile_id" }
  );
  if (membershipError) {
    return toAdminRedirect(`No se pudo crear la membresia: ${membershipError.message}`, true);
  }

  revalidatePath("/admin");
  return toAdminRedirect(`Usuario creado correctamente: ${normalizedEmail}.`);
}
