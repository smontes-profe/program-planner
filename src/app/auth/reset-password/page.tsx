import { ResetPasswordForm } from "./_components/ResetPasswordForm";

export const metadata = {
  title: "Nueva contrasena - Program Planner",
  description: "Actualiza tu contrasena tras recuperar acceso.",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6">
      <div className="w-full max-w-[420px]">
        <ResetPasswordForm />
      </div>
    </div>
  );
}

