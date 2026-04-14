import { listEvaluationContexts, listPublishedPlans, createEvaluationContext, deleteEvaluationContext, linkTeachingPlan } from "@/domain/evaluation/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BookOpen, AlertCircle, Users, CalendarDays, Trash2, Plus } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DeleteContextButton } from "./_components/DeleteContextButton";

export const metadata = {
  title: "Evaluaciones - Program Planner",
  description: "Gestiona las evaluaciones de tus módulos y alumnos.",
};

export default async function EvaluationsPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const [contextsResult, plansResult] = await Promise.all([
    listEvaluationContexts(),
    listPublishedPlans(),
  ]);

  if (!contextsResult.ok) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar las evaluaciones
            </CardTitle>
            <CardDescription>{contextsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const contexts = contextsResult.data;
  const publishedPlans = plansResult.ok ? plansResult.data : [];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Evaluaciones
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Contextos de evaluación para registrar notas y calcular calificaciones.
          </p>
        </div>
        <CreateContextButton publishedPlans={publishedPlans} />
      </div>

      {params?.error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 mb-6">
          <CardContent className="py-4">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              Error al crear contexto: {decodeURIComponent(params.error)}
            </p>
          </CardContent>
        </Card>
      )}

      {contexts.length === 0 ? (
        <Card className="bg-zinc-50/50 border-dashed border-2 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-full mb-5">
              <BookOpen className="h-12 w-12 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Aún no tienes contextos de evaluación
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-6 text-sm">
              Crea tu primer contexto de evaluación para empezar a registrar notas de tus alumnos.
            </p>
            <CreateContextButton publishedPlans={publishedPlans} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contexts.map((ctx) => {
            const statusColors = {
              draft: "bg-zinc-300 dark:bg-zinc-700",
              active: "bg-emerald-500",
              closed: "bg-blue-500",
            };
            const statusLabels = {
              draft: "Borrador",
              active: "Activo",
              closed: "Cerrado",
            };

            return (
              <Card
                key={ctx.id}
                className="hover:shadow-md transition-shadow group overflow-hidden border-zinc-200 dark:border-zinc-800"
              >
                <div className={cn("h-1 w-full", statusColors[ctx.status])} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                    )}>
                      {statusLabels[ctx.status]}
                    </span>
                  </div>
                  <CardTitle className="mt-2 text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
                    {ctx.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 font-mono text-zinc-500 dark:text-zinc-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {ctx.academic_year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-zinc-400 mb-3">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {ctx.plan_count} módulo{ctx.plan_count !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {ctx.student_count} alumno{ctx.student_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                    <div className="flex justify-between items-center text-sm pt-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/evaluations/${ctx.id}`}
                          className={cn(buttonVariants({ variant: "default", size: "sm" }), "bg-emerald-600 hover:bg-emerald-700 text-white")}
                        >
                          Abrir
                        </Link>
                        <Link
                          href={`/evaluations/configurar/${ctx.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-zinc-900 dark:text-zinc-50")}
                        >
                          Configurar
                        </Link>
                      </div>
                      <DeleteContextButton contextId={ctx.id} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

function CreateContextButton({ publishedPlans }: { publishedPlans: { id: string; title: string; module_code: string; academic_year: string }[] }) {
  async function createAction(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const academic_year = formData.get("academic_year") as string;
    const planId = formData.get("plan_id") as string;

    if (!title || !academic_year) {
      redirect(`/evaluations?error=faltan_campos`);
    }

    const result = await createEvaluationContext({ title, academic_year });

    if (!result.ok) {
      const errMsg = encodeURIComponent(result.error);
      redirect(`/evaluations?error=${errMsg}`);
    }

    if (planId) {
      await linkTeachingPlan(result.data.id, planId);
    }

    revalidatePath("/evaluations");
    redirect(`/evaluations/${result.data.id}`);
  }

  return (
    <form action={createAction}>
      <div className="flex items-center gap-2">
        <input name="title" placeholder="Nombre del contexto" className="h-9 w-56 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" required />
        <input name="academic_year" placeholder="2026/2027" className="h-9 w-28 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" required pattern="\d{4}/\d{4}" />
        {publishedPlans.length > 0 && (
          <select name="plan_id" className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" defaultValue="">
            <option value="" disabled>Seleccionar módulo...</option>
            {publishedPlans.map(p => (
              <option key={p.id} value={p.id}>{p.module_code} - {p.title}</option>
            ))}
          </select>
        )}
        <button type="submit" className={cn(buttonVariants({ variant: "default", size: "sm" }), "bg-emerald-600 hover:bg-emerald-700 text-white")}>
          <Plus className="h-4 w-4 mr-1" />
          Crear
        </button>
      </div>
    </form>
  );
}
