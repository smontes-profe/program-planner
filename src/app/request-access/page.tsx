import { RequestAccessForm } from "./_components/RequestAccessForm";

export const metadata = {
  title: "Solicitar acceso - Program Planner",
  description: "Solicitud de alta gestionada por administracion.",
};

export default function RequestAccessPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6">
      <div className="w-full max-w-[460px]">
        <RequestAccessForm />
      </div>
    </div>
  );
}

