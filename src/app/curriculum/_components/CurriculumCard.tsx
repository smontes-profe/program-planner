import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Globe, Lock } from "lucide-react";

const CURRICULUM_TITLE_MAX_LENGTH = 28;

function truncateCurriculumTitle(title: string): string {
  if (title.length <= CURRICULUM_TITLE_MAX_LENGTH) return title;
  return `${title.slice(0, CURRICULUM_TITLE_MAX_LENGTH).trimEnd()}...`;
}

interface BadgeProps {
  readonly label: string;
  readonly variant: "success" | "neutral" | "warning";
}

function BadgeLocal({ label, variant }: BadgeProps) {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    neutral: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  };

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", styles[variant])}>
      {label}
    </span>
  );
}

// Component for individual curriculum card
export function CurriculumCard({ template }: { template: any }) {
  const isPublished = template.status === "published";
  const isDeprecated = template.status === "deprecated";

  let statusColor = "bg-zinc-300 dark:bg-zinc-700";
  let badgeVariant: "success" | "warning" | "neutral" = "neutral";
  let label = "Borrador";

  if (isPublished) {
    statusColor = "bg-emerald-500";
    badgeVariant = "success";
    label = "Publicado";
  } else if (isDeprecated) {
    statusColor = "bg-amber-500";
    badgeVariant = "warning";
    label = "Deprecado";
  }

  return (
    <Link href={`/curriculum/${template.id}`} className="block group">
      <Card className="hover:shadow-md transition-shadow overflow-hidden border-zinc-200 dark:border-zinc-800 h-full">
        <div className={cn("h-1 w-full", statusColor)} />
        <CardHeader className="space-y-1 pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-semibold tracking-tight leading-snug text-zinc-900 dark:text-zinc-50" title={template.module_name}>
              {truncateCurriculumTitle(template.module_name)}
            </CardTitle>
            <div className="flex gap-2 shrink-0">
              <BadgeLocal label={label} variant={badgeVariant} />
              {template.visibility_scope === "organization" && <Globe className="h-4 w-4" aria-label="Ambito: Publico" />}
              {template.visibility_scope === "private" && <Lock className="h-4 w-4" aria-label="Ambito: Privado" />}
            </div>
          </div>
          <CardDescription className="font-mono text-zinc-500 dark:text-zinc-400 text-xs">
            {template.program_code ? `${template.program_code} · ` : ""}
            {template.program_course && template.program_course !== "NA" ? `${template.program_course} · ` : ""}
            {template.module_code} · {template.academic_year}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {template.is_owner ? (
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">Creado por: Tu</p>
            ) : (
              <p>Creado por: <span className="font-medium text-zinc-700 dark:text-zinc-300">Otro creador</span></p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
