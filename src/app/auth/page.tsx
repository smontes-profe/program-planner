import { AuthForm } from "./_components/AuthForm";

export const metadata = {
  title: "Acceso - Program Planner",
  description: "Accede a tu cuenta de planificación académica.",
};

interface AuthPageProps {
  searchParams?: { error?: string };
}

export default function AuthPage({ searchParams }: AuthPageProps) {
  const initialError = searchParams?.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-5%] left-[-10%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>
      
      <div className="z-10 w-full max-w-[420px]">
        <AuthForm initialError={initialError} />
      </div>
    </div>
  );
}
