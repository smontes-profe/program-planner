"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const emailSchema = z.string().trim().email("Email no valido");
const passwordSchema = z
  .string()
  .min(8, "La contrasena debe tener al menos 8 caracteres")
  .max(128, "La contrasena es demasiado larga");
const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Indica nombre y apellidos.").max(160, "El nombre es demasiado largo."),
});

type AuthActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

function getStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getAppBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";

  if (host) return `${protocol}://${host}`;
  if (envUrl) {
    const withProtocol = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
    return withProtocol;
  }

  return "http://localhost:3000";
}

/**
 * Sign in with email and password
 */
export async function signInAction(prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const emailRaw = getStringField(formData, "email");
  const password = getStringField(formData, "password");

  const parsedEmail = emailSchema.safeParse(emailRaw);
  if (!parsedEmail.success) {
    return {
      ok: false,
      error: "Introduce un email valido.",
      fields: { email: emailRaw },
    };
  }

  if (!password) {
    return {
      ok: false,
      error: "La contrasena es obligatoria.",
      fields: { email: emailRaw },
    };
  }

  const email = parsedEmail.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      error: "Credenciales invalidas o cuenta no confirmada.",
      fields: { email },
    };
  }

  revalidatePath("/");
  redirect("/curriculum");
}

/**
 * Sign up with email and password
 */
export async function signUpAction(_prevState: AuthActionState, _formData: FormData): Promise<AuthActionState> {
  void _prevState;
  void _formData;
  return {
    ok: false,
    error: "El registro directo esta deshabilitado. Usa 'Solicitar acceso'.",
  };
}

/**
 * Request password reset email
 */
export async function requestPasswordResetAction(
  prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const emailRaw = getStringField(formData, "email");
  const parsedEmail = emailSchema.safeParse(emailRaw);
  if (!parsedEmail.success) {
    return {
      ok: false,
      error: "Introduce un email valido.",
      fields: { email: emailRaw },
    };
  }

  const supabase = await createClient();
  const baseUrl = await getAppBaseUrl();
  const redirectTo = `${baseUrl}/auth/confirm?next=/auth/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
    redirectTo,
  });

  if (error) {
    return {
      ok: false,
      error: "No se pudo enviar el correo de recuperacion. Intentalo de nuevo.",
      fields: { email: parsedEmail.data },
    };
  }

  return {
    ok: true,
    message: "Si existe una cuenta para ese email, te hemos enviado instrucciones de recuperacion.",
    fields: { email: parsedEmail.data },
  };
}

/**
 * Update password from recovery flow
 */
export async function resetPasswordWithRecoveryAction(
  prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = getStringField(formData, "password");
  const confirmPassword = getStringField(formData, "confirm_password");

  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return {
      ok: false,
      error: parsedPassword.error.issues[0]?.message ?? "Contraseña no valida.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      error: "Las contraseñas no coinciden.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      ok: false,
      error: "No se pudo actualizar la contraseña. Solicita de nuevo el enlace de recuperacion.",
    };
  }

  return {
    ok: true,
    message: "Contraseña actualizada. Ya puedes iniciar sesion con la nueva contrasena.",
  };
}

/**
 * Update password for a logged user
 */
export async function updateOwnPasswordAction(
  prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const currentPassword = getStringField(formData, "current_password");
  const newPassword = getStringField(formData, "new_password");
  const confirmPassword = getStringField(formData, "confirm_password");

  if (!currentPassword) {
    return { ok: false, error: "Debes indicar tu contraseña actual." };
  }

  const parsedNewPassword = passwordSchema.safeParse(newPassword);
  if (!parsedNewPassword.success) {
    return {
      ok: false,
      error: parsedNewPassword.error.issues[0]?.message ?? "Contraseña no valida.",
    };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Las contraseñas nuevas no coinciden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return { ok: false, error: "Sesion no valida. Vuelve a iniciar sesion." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { ok: false, error: "No se pudo actualizar la contraseña." };
  }

  return { ok: true, message: "Contraseña actualizada correctamente." };
}

/**
 * Update the authenticated user's public profile data.
 */
export async function updateOwnProfileAction(
  prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  void prevState;

  const rawFullName = getStringField(formData, "full_name");
  const parsed = profileSchema.safeParse({ full_name: rawFullName });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del perfil.",
      fields: { full_name: rawFullName },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      error: "Sesion no valida. Vuelve a iniciar sesion.",
      fields: { full_name: parsed.data.full_name },
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    .eq("id", user.id)
    .select("id")
    .single();

  if (profileError) {
    return {
      ok: false,
      error: "No se pudo actualizar el perfil. Intentalo de nuevo.",
      fields: { full_name: parsed.data.full_name },
    };
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.full_name },
  });

  if (metadataError) {
    return {
      ok: false,
      error: "El nombre se guardo en el perfil, pero no se pudo sincronizar con la sesion.",
      fields: { full_name: parsed.data.full_name },
    };
  }

  revalidatePath("/account");

  return {
    ok: true,
    message: "Perfil actualizado correctamente.",
    fields: { full_name: parsed.data.full_name },
  };
}

/**
 * Sign out
 */
export async function signOutAction() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    redirect(`/auth?error=${encodeURIComponent("No se pudo cerrar la sesion. Intentalo de nuevo.")}`);
  }
  revalidatePath("/");
  redirect("/auth");
}
