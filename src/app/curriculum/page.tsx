import { listTemplates } from "@/domain/curriculum/actions";
import { ensureUserHasOrganization } from "@/domain/organization/actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, FileText, Globe, Lock, Shield, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Currículos - Program Planner",
  description: "Gestiona los borradores y plantillas curriculares de tu organización.",
};

export default async function CurriculumPage() {
  // Ensure the user has an organization to work on (auto-create if empty during Phase 1.5)
  await ensureUserHasOrganization();
  
  const result = await listTemplates();

  if (!result.ok) {
    return (
      <div className="container mx-auto py-8 px-4">
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

  return (
    <div className="container mx-auto py-8 px-4">
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
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
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <BadgeLocal 
                      label={label}
                      variant={badgeVariant}
                    />
                    <div className="flex gap-2 text-zinc-400">
                      {template.visibility_scope === 'company' && <Shield className="h-4 w-4" aria-label="Ámbito: Compañía" />}
                      {template.visibility_scope === 'organization' && <Globe className="h-4 w-4" aria-label="Ámbito: Organización" />}
                      {template.visibility_scope === 'private' && <Lock className="h-4 w-4" aria-label="Ámbito: Privado" />}
                    </div>
                  </div>
                  <CardTitle className="mt-2 text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
                    {template.module_name}
                  </CardTitle>
                  <CardDescription className="font-mono text-zinc-500 dark:text-zinc-400">
                    {template.module_code} • {template.academic_year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm pt-2">
                    <span className="text-zinc-500 dark:text-zinc-400">Versión: <span className="font-semibold">{template.version}</span></span>
                    <Link 
                      href={`/curriculum/${template.id}`} 
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Ver detalles
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
