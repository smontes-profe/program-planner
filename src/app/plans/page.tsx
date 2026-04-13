import { listPlans, listPublishedTemplates } from "@/domain/teaching-plan/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BookCopy, AlertCircle, Lock, Globe, Shield } from "lucide-react";
import { CreatePlanButton } from "./_components/CreatePlanButton";

export const metadata = {
  title: "Programaciones - Program Planner",
  description: "Gestiona tus programaciones didácticas por módulo y curso académico.",
};

export default async function PlansPage() {
  const [plansResult, templatesResult] = await Promise.all([
    listPlans(),
    listPublishedTemplates(),
  ]);

  if (!plansResult.ok) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar las programaciones
            </CardTitle>
            <CardDescription>{plansResult.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const plans = plansResult.data;
  const publishedTemplates = templatesResult.ok ? templatesResult.data : [];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mis Programaciones
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Programaciones didácticas basadas en las plantillas de currículo publicadas.
          </p>
        </div>
        <CreatePlanButton publishedTemplates={publishedTemplates} />
      </div>

      {plans.length === 0 ? (
        <Card className="bg-zinc-50/50 border-dashed border-2 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-full mb-5">
              <BookCopy className="h-12 w-12 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Aún no tienes programaciones
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-6 text-sm">
              Crea tu primera programación importando un currículo publicado como base.
            </p>
            <CreatePlanButton publishedTemplates={publishedTemplates} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isPublished = plan.status === "published";
            const statusColor = isPublished ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700";
            const statusLabel = isPublished ? "Publicada" : "Borrador";

            return (
              <Card
                key={plan.id}
                className="hover:shadow-md transition-shadow group overflow-hidden border-zinc-200 dark:border-zinc-800"
              >
                <div className={cn("h-1 w-full", statusColor)} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                    )}>
                      {statusLabel}
                    </span>
                    <div className="text-zinc-400">
                      {plan.visibility_scope === "company" && <Shield className="h-4 w-4" aria-label="Compañía" />}
                      {plan.visibility_scope === "organization" && <Globe className="h-4 w-4" aria-label="Organización" />}
                      {plan.visibility_scope === "private" && <Lock className="h-4 w-4" aria-label="Privado" />}
                    </div>
                  </div>
                  <CardTitle className="mt-2 text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
                    {plan.title}
                  </CardTitle>
                  <CardDescription className="font-mono text-zinc-500 dark:text-zinc-400">
                    {plan.module_code} • {plan.academic_year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm pt-2">
                    <span className="text-zinc-400 text-xs">{plan.region_code}</span>
                    <Link
                      href={`/plans/${plan.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Abrir
                    </Link>
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
