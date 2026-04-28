import { listTemplates } from "@/domain/curriculum/actions";
import { ensureUserHasOrganization } from "@/domain/organization/actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, FileText, Globe, Lock, AlertCircle, Search } from "lucide-react";

export const metadata = {
  title: "Currículos - Program Planner",
  description: "Gestiona los borradores y plantillas curriculares de tu organización.",
};

const CURRICULUM_TITLE_MAX_LENGTH = 34;

function truncateCurriculumTitle(title: string): string {
  if (title.length <= CURRICULUM_TITLE_MAX_LENGTH) return title;
  return `${title.slice(0, CURRICULUM_TITLE_MAX_LENGTH).trimEnd()}…`;
}

interface CurriculumPageProps {
  readonly searchParams?: Promise<{
    q?: string;
    owner?: string;
  }>;
}

export default async function CurriculumPage({ searchParams }: CurriculumPageProps) {
  const filters = (await searchParams) ?? {};
  // Ensure the user has an organization to work on (auto-create if empty during Phase 1.5)
  await ensureUserHasOrganization();
  
  const result = await listTemplates();

  if (!result.ok) {
    return (
    <div className="app-content">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar currículos
            </CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/curriculum" className={buttonVariants({ variant: "outline" })}>
              Reintentar
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const templates = result.data;
  const query = filters.q?.trim().toLowerCase() ?? "";
  const ownerFilter = filters.owner?.trim().toLowerCase() ?? "";
  const ownerOptions = Array.from(new Set(templates.map((template) => template.creator_name).filter(Boolean))) as string[];
  const filteredTemplates = templates.filter((template) => {
    const matchesQuery = !query || [template.module_name, template.creator_name].some((value) =>
      value?.toLowerCase().includes(query)
    );
    const matchesOwner = !ownerFilter || (template.creator_name ?? "").toLowerCase() === ownerFilter;
    return matchesQuery && matchesOwner;
  });

  return (
    <div className="app-content">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Currículos</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Borradores y plantillas oficiales para tus planes de clase.
          </p>
        </div>
        <Link 
          href="/curriculum/new" 
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Plus className="h-4 w-4" /> Nuevo Currículo
        </Link>
      </div>

      <form className="mb-6 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Buscar currículos</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Buscar por nombre o dueño"
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-zinc-800"
          />
        </label>
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

      {templates.length === 0 ? (
        <Card className="bg-zinc-50/50 border-dashed dark:bg-zinc-900/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-zinc-100 p-4 rounded-full mb-4 dark:bg-zinc-800">
              <FileText className="h-12 w-12 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">No hay currículos todavía</h3>
            <p className="text-zinc-500 text-center max-w-sm mb-6 dark:text-zinc-400">
              Empieza creando un borrador manual o importando uno para tu organización.
            </p>
            <Link 
              href="/curriculum/new" 
              className={buttonVariants({ variant: "outline" })}
            >
              Crear el primero
            </Link>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card className="bg-zinc-50/50 border-dashed dark:bg-zinc-900/20">
          <CardContent className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No hay currículos que coincidan con los filtros actuales.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const isPublished = template.status === 'published';
            const isDeprecated = template.status === 'deprecated';
            
            let statusColor = "bg-zinc-300 dark:bg-zinc-700";
            let badgeVariant: 'success' | 'warning' | 'neutral' = 'neutral';
            let label = 'Borrador';

            if (isPublished) {
              statusColor = "bg-emerald-500";
              badgeVariant = 'success';
              label = 'Publicado';
            } else if (isDeprecated) {
              statusColor = "bg-amber-500";
              badgeVariant = 'warning';
              label = 'Depreciado';
            }

            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow group overflow-hidden border-zinc-200 dark:border-zinc-800">
                <div className={cn("h-1 w-full", statusColor)} />
                <CardHeader className="space-y-2 pb-1">
                  <div className="flex justify-between items-start">
                    <BadgeLocal 
                      label={label}
                      variant={badgeVariant}
                    />
                    <div className="flex gap-2 text-zinc-400">
                      {template.visibility_scope === 'organization' && <Globe className="h-4 w-4" aria-label="Ámbito: Público" />}
                      {template.visibility_scope === 'private' && <Lock className="h-4 w-4" aria-label="Ámbito: Privado" />}
                    </div>
                  </div>
                  <CardTitle className="text-base font-semibold tracking-tight leading-snug text-zinc-900 dark:text-zinc-50 md:text-lg" title={template.module_name}>
                    {truncateCurriculumTitle(template.module_name)}
                  </CardTitle>
                  <CardDescription className="font-mono text-zinc-500 dark:text-zinc-400">
                    {template.module_code} • {template.academic_year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm pt-1">
                    <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <p>Versión: <span className="font-semibold">{template.version}</span></p>
                      <p>Creado por: <span className="font-medium text-zinc-700 dark:text-zinc-300">{template.creator_name || "Desconocido"}</span></p>
                    </div>
                    <div className="flex justify-end">
                      <Link 
                        href={`/curriculum/${template.id}`} 
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Ver detalles
                      </Link>
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

interface BadgeProps {
  readonly label: string;
  readonly variant: 'success' | 'neutral' | 'warning';
}

function BadgeLocal({ label, variant }: BadgeProps) {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    neutral: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  };
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
      styles[variant]
    )}>
      {label}
    </span>
  );
}
