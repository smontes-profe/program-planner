import { listEvaluationContexts, listPublishedPlans, createEvaluationContext, linkTeachingPlan } from "@/domain/evaluation/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BookOpen, AlertCircle, CalendarDays, Plus, Search } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase";

export const metadata = {
  title: "Evaluaciones - Program Planner",
  description: "Gestiona las evaluaciones de tus módulos y alumnos.",
};

export default async function EvaluationsPage({ 
  searchParams 
}: { 
  searchParams?: Promise<{ 
    error?: string
    q?: string
    year?: string
    status?: string
    module?: string
    owner?: string
  }> 
}) {
  const params = await searchParams;
  
  // Get current user info for creator highlighting
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserProfileId = user?.id;
  
  const [contextsResult, plansResult] = await Promise.all([
    listEvaluationContexts(),
    listPublishedPlans(),
  ]);

  if (!contextsResult.ok) {
    return (
      <div className="app-content">
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

  // Enrich contexts with creator names and module information
  const adminClient = createAdminClient();
  const creatorIds = Array.from(new Set(contexts.map(c => c.created_by_profile_id).filter(Boolean)));
  const { data: creators } = creatorIds.length > 0
    ? await adminClient.from("profiles").select("id, full_name").in("id", creatorIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const creatorNameById = new Map((creators ?? []).map(creator => [creator.id, creator.full_name]));

  const enrichedContexts = contexts.map(ctx => ({
    ...ctx,
    creator_name: creatorNameById.get(ctx.created_by_profile_id) ?? null,
  }));

  // Extract filter options and apply filters
  const query = params?.q?.trim().toLowerCase() ?? "";
  const yearFilter = params?.year?.trim() ?? "";
  const statusFilter = params?.status?.trim() ?? "";
  const moduleFilter = params?.module?.trim() ?? "";
  const ownerFilter = params?.owner?.trim().toLowerCase() ?? "";

  const yearOptions = Array.from(new Set(enrichedContexts.map(c => c.academic_year).filter(Boolean))) as string[];
  const moduleOptions = Array.from(new Set(
    enrichedContexts
      .flatMap(c => c.plan_ids || [])
      .map(planId => publishedPlans.find(p => p.id === planId)?.module_code)
      .filter(Boolean)
  )) as string[];
  const ownerOptions = Array.from(new Set(enrichedContexts.map(c => c.creator_name).filter(Boolean))) as string[];

  const filteredContexts = enrichedContexts.filter(ctx => {
    const matchesQuery = !query || [ctx.title, ctx.creator_name].some(value =>
      value?.toLowerCase().includes(query)
    );
    const matchesYear = !yearFilter || ctx.academic_year === yearFilter;
    const matchesStatus = !statusFilter || ctx.status === statusFilter;
    const matchesModule = !moduleFilter || (ctx.plan_ids || []).some(
      planId => publishedPlans.find(p => p.id === planId)?.module_code === moduleFilter
    );
    const matchesOwner = !ownerFilter || (ctx.creator_name ?? "").toLowerCase() === ownerFilter;
    return matchesQuery && matchesYear && matchesStatus && matchesModule && matchesOwner;
  });

  return (
    <div className="app-content">
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

      <form className="mb-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 md:grid-cols-[minmax(0,2fr)_repeat(auto-fit,minmax(120px,1fr))_auto] lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar evaluaciones</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            name="q"
            defaultValue={params?.q ?? ""}
            placeholder="Buscar por título o creador"
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
          />
        </label>
        <select
          name="year"
          defaultValue={params?.year ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los años</option>
          {yearOptions.sort().reverse().map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params?.status ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="active">Activo</option>
          <option value="closed">Cerrado</option>
        </select>
        <select
          name="module"
          defaultValue={params?.module ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los módulos</option>
          {moduleOptions.map((module) => (
            <option key={module} value={module}>{module}</option>
          ))}
        </select>
        <select
          name="owner"
          defaultValue={params?.owner ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los creadores</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>
        <button className={buttonVariants({ variant: "outline" })} type="submit">
          Filtrar
        </button>
      </form>

      {filteredContexts.length === 0 ? (
        <Card className="bg-zinc-50/50 border-dashed border-2 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-full mb-5">
              <BookOpen className="h-12 w-12 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {contexts.length === 0 
                ? "Aún no tienes contextos de evaluación"
                : "No hay contextos que coincidan con los filtros"
              }
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm mb-6 text-sm">
              {contexts.length === 0
                ? "Crea tu primer contexto de evaluación para empezar a registrar notas de tus alumnos."
                : "Intenta cambiar los filtros para ver más resultados."
              }
            </p>
            {contexts.length === 0 && <CreateContextButton publishedPlans={publishedPlans} />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContexts.map((ctx) => {
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
              <Link key={ctx.id} href={`/evaluations/${ctx.id}`} className="block group">
                <Card className="hover:shadow-md transition-shadow overflow-hidden border-zinc-200 dark:border-zinc-800 h-full">
                  <div className={cn("h-1 w-full", statusColors[ctx.status])} />
                  <CardHeader className="space-y-1 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {ctx.title}
                      </CardTitle>
                      <div className="flex gap-2 shrink-0">
                        <span className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                          "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                        )}>
                          {statusLabels[ctx.status]}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                      <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
                      {ctx.academic_year}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {ctx.created_by_profile_id === currentUserProfileId ? (
                        <p className="text-emerald-600 dark:text-emerald-400 font-medium">Creado por: Tú</p>
                      ) : (
                        <p>Creado por: <span className="font-medium text-zinc-700 dark:text-zinc-300">{ctx.creator_name || "Desconocido"}</span></p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
