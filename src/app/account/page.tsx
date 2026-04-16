import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChangePasswordForm } from "./_components/ChangePasswordForm";

export const metadata = {
  title: "Mi cuenta - Program Planner",
  description: "Gestiona la seguridad de tu cuenta.",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Mi cuenta</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Usuario conectado: <span className="font-medium">{user.email}</span>
        </p>
      </header>

      <ChangePasswordForm />
    </div>
  );
}

