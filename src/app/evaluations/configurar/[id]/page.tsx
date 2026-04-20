import { getEvaluationContext, listPublishedPlans } from "@/domain/evaluation/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MoveLeft, Settings } from "lucide-react";
import { ContextSettingsPanel } from "@/app/evaluations/[id]/_components/ContextSettingsPanel";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Configurar contexto - Program Planner",
  description: "Ajusta el nombre, el curso y las programaciones asociadas de un contexto de evaluación.",
};

interface ConfigurePageProps {
  params: Promise<{ id: string }>;
}

export default async function ConfigureContextPage({ params }: ConfigurePageProps) {
  const { id } = await params;
  const contextResult = await getEvaluationContext(id);

  if (!contextResult.ok || !contextResult.data) {
    return notFound();
  }

  const plansResult = await listPublishedPlans();
  const context = contextResult.data;

  return (
    <div className="app-content max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Configuración</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {context.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/evaluations"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1 text-sm")}
          >
            <MoveLeft className="h-4 w-4" />
            Volver a contextos
          </Link>
          <Link
            href={`/evaluations/${context.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex items-center gap-1 text-sm")}
          >
            <Settings className="h-4 w-4" />
            Ver evaluación
          </Link>
        </div>
      </div>

      <ContextSettingsPanel
        context={context}
        availablePlans={plansResult.ok ? plansResult.data : []}
      />
    </div>
  );
}
