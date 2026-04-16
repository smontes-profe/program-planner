import { ForgotPasswordForm } from "./_components/ForgotPasswordForm";

export const metadata = {
  title: "Recuperar contrasena - Program Planner",
  description: "Solicita el enlace de recuperacion de contrasena.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6">
      <div className="w-full max-w-[420px]">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

