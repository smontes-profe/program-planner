import { listPlans, listPublishedTemplates } from "@/domain/teaching-plan/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BookCopy, AlertCircle, Lock, Globe, Search } from "lucide-react";
import { CreatePlanButton } from "./_components/CreatePlanButton";
import { ClonePlanButton } from "./_components/ClonePlanButton";

const PLAN_TITLE_MAX_LENGTH = 35;

function truncatePlanTitle(title: string): string {
  if (title.length <= PLAN_TITLE_MAX_LENGTH) {
    return title;
  }

  return `${title.slice(0, PLAN_TITLE_MAX_LENGTH).trimEnd()}…`;
}

export const metadata = {
  title: "Programaciones - Program Planner",
  description: "Gestiona tus programaciones didácticas por módulo y curso académico.",
};

interface PlansPageProps {
  readonly searchParams?: Promise<{
    q?: string;
    owner?: string;
    template?: string;
    year?: string;
    title?: string;
    code?: string;
    level?: string;
    course?: string;
  }>;
}

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const filters = (await searchParams) ?? {};
  const [plansResult, templatesResult] = await Promise.all([
    listPlans(),
    listPublishedTemplates(),
  ]);

  if (!plansResult.ok) {
    return (
      <div className="app-content">
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
  const query = filters.q?.trim().toLowerCase() ?? "";
  const ownerFilter = filters.owner?.trim().toLowerCase() ?? "";
  const templateFilter = filters.template?.trim().toLowerCase() ?? "";
  const yearFilter = filters.year?.trim() ?? "";
  const titleFilter = filters.title?.trim() ?? "";
  const codeFilter = filters.code?.trim() ?? "";
  const levelFilter = filters.level?.trim() ?? "";
  const courseFilter = filters.course?.trim() ?? "";
  const publishedTemplates = templatesResult.ok ? templatesResult.data : [];
  
  const ownerOptions = Array.from(new Set(plans.map((plan) => plan.owner_name).filter(Boolean))) as string[];
  const templateOptions = Array.from(new Set(plans.map((plan) => plan.source_template_name).filter(Boolean))) as string[];
  const yearOptions = Array.from(new Set(plans.map((plan) => plan.academic_year).filter(Boolean))) as string[];
  const titleOptions = Array.from(new Set(plans.map((plan) => plan.program_title).filter(Boolean))) as string[];
  const codeOptions = Array.from(new Set(plans.map((plan) => plan.program_code).filter(Boolean))) as string[];
  const levelOptions = Array.from(new Set(plans.map((plan) => plan.program_level).filter(Boolean))) as string[];
  const courseOptions = Array.from(new Set(plans.map((plan) => plan.program_course).filter(Boolean))) as string[];
  
  const filteredPlans = plans.filter((plan) => {
    const matchesQuery = !query || [plan.title, plan.owner_name, plan.source_template_name].some((value) =>
      value?.toLowerCase().includes(query)
    );
    const matchesOwner = !ownerFilter || (plan.owner_name ?? "").toLowerCase() === ownerFilter;
    const matchesTemplate = !templateFilter || (plan.source_template_name ?? "").toLowerCase() === templateFilter;
    const matchesYear = !yearFilter || (plan.academic_year ?? "") === yearFilter;
    const matchesTitle = !titleFilter || (plan.program_title ?? "") === titleFilter;
    const matchesCode = !codeFilter || (plan.program_code ?? "") === codeFilter;
    const matchesLevel = !levelFilter || (plan.program_level ?? "") === levelFilter;
    const matchesCourse = !courseFilter || (plan.program_course ?? "") === courseFilter;
    return matchesQuery && matchesOwner && matchesTemplate && matchesYear && matchesTitle && matchesCode && matchesLevel && matchesCourse;
  });

  return (
    <div className="app-content">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Programaciones
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Programaciones propias y compartidas de tu organización.
          </p>
        </div>
        <CreatePlanButton publishedTemplates={publishedTemplates} />
      </div>

      <form className="mb-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 md:grid-cols-[minmax(0,2fr)_repeat(auto-fit,minmax(120px,1fr))_auto] lg:grid-cols-[minmax(0,2fr)_repeat(6,minmax(0,1fr))_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar programaciones</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Buscar por nombre, dueño o currículo"
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
          />
        </label>
        <select
          name="year"
          defaultValue={filters.year ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los años</option>
          {yearOptions.sort().map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          name="title"
          defaultValue={filters.title ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los títulos</option>
          {titleOptions.map((title) => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>
        <select
          name="code"
          defaultValue={filters.code ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los IDs</option>
          {codeOptions.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        <select
          name="level"
          defaultValue={filters.level ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los niveles</option>
          {levelOptions.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
        <select
          name="course"
          defaultValue={filters.course ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los cursos</option>
          {courseOptions.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
        <select
          name="template"
          defaultValue={filters.template ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los currículos</option>
          {templateOptions.map((template) => (
            <option key={template} value={template}>{template}</option>
          ))}
        </select>
        <select
          name="owner"
          defaultValue={filters.owner ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
        >
          <option value="">Todos los dueños</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>
        <button className={buttonVariants({ variant: "outline" })} type="submit">
          Filtrar
        </button>
      </form>

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
      ) : filteredPlans.length === 0 ? (
        <Card className="bg-zinc-50/50 border-dashed dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No hay programaciones que coincidan con los filtros actuales.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => {
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
                      {plan.visibility_scope === "organization" && <Globe className="h-4 w-4" aria-label="Público" />}
                      {plan.visibility_scope === "private" && <Lock className="h-4 w-4" aria-label="Privado" />}
                    </div>
                  </div>
                  <CardTitle
                    className="mt-2 text-base font-semibold tracking-tight leading-snug text-zinc-900 dark:text-zinc-50 md:text-lg wrap-break-word"
                    title={plan.title}
                  >
                    {truncatePlanTitle(plan.title)}
                  </CardTitle>
                  <CardDescription className="font-mono text-zinc-500 dark:text-zinc-400">
                    {plan.program_code ? `${plan.program_code} • ` : ''}
                    {plan.program_course && plan.program_course !== 'NA' ? `${plan.program_course} • ` : ''}
                    {plan.module_code} • {plan.academic_year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <p>Creada por: <span className="font-medium text-zinc-700 dark:text-zinc-300">{plan.owner_name || "Desconocido"}</span></p>
                      <p>Currículo usado: <span className="font-medium text-zinc-700 dark:text-zinc-300">{plan.source_template_name || "No disponible"}</span></p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-zinc-400 text-xs">{plan.region_code}</span>
                      <div className="flex items-center gap-2">
                        {!plan.is_owner ? (
                          <ClonePlanButton
                            sourcePlanId={plan.id}
                            sourcePlanTitle={plan.title}
                            academicYear={plan.academic_year}
                            variant="ghost"
                            size="sm"
                          />
                        ) : null}
                        <Link
                          href={`/plans/${plan.id}`}
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          Abrir
                        </Link>
                      </div>
                    </div>
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
