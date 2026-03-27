"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Sign in with email and password
 */
export async function signInAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { 
      ok: false, 
      error: "Credenciales inválidas o error de red.",
      fields: { email } 
    };
  }

  revalidatePath("/");
  redirect("/curriculum");
}

/**
 * Sign up with email and password
 */
export async function signUpAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) {
    return { 
      ok: false, 
      error: `Error al registrarse: ${error.message}`,
      fields: { email, full_name: fullName }
    };
  }

  return { ok: true, message: "Usuario creado. Ya puedes iniciar sesión.", fields: { email, full_name: fullName } };
}

/**
 * Sign out
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
