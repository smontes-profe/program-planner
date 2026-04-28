import { getPlan, getPlanWarnings } from "@/domain/teaching-plan/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MoveLeft, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanTabs } from "./_components/PlanTabs";
import { PlanHoursEditor } from "./_components/PlanHoursEditor";
import { PlanStatusControls } from "./_components/PlanStatusControls";
import { PlanWarnings } from "./_components/PlanWarnings";
import { PlanSettingsEditor } from "./_components/PlanSettingsEditor";
import { ClonePlanButton } from "../_components/ClonePlanButton";

interface PlanDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params }: PlanDetailPageProps) {
  const { id } = await params;
  const result = await getPlan(id);

  if (!result.ok || !result.data) {
    return notFound();
  }

  const plan = result.data;
  const canEdit = Boolean(plan.can_edit);
  const warningsResult = await getPlanWarnings(id);
  const warnings = warningsResult.ok ? warningsResult.data.warnings : [];

  let badgeVariant: "neutral" | "success" = "neutral";
  let badgeLabel = "Borrador";

  if (plan.status === "published") { badgeVariant = "success"; badgeLabel = "Publicada"; }

  return (
    <div className="app-content">
      <div className="flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex justify-between items-start">
          <Link
            href="/plans"
            className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            <MoveLeft className="mr-2 h-4 w-4" />
            Mis Programaciones
          </Link>
          <div className="flex items-center gap-3">
            {canEdit ? <PlanSettingsEditor plan={plan} /> : null}
            {!canEdit ? (
              <ClonePlanButton
                sourcePlanId={plan.id}
                sourcePlanTitle={plan.title}
                academicYear={plan.academic_year}
              />
            ) : null}
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
            {!canEdit ? (
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3.5 w-3.5" />
                Solo lectura
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {plan.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500 text-sm font-medium mt-2">
            <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {plan.module_code}
            </span>
            <span>•</span>
            <span>{plan.academic_year}</span>
            <span>•</span>
            <span className="capitalize">{plan.region_code}</span>
            <span>•</span>
            {plan.owner_name ? (
              <>
                <span>Creada por {plan.owner_name}</span>
                <span>•</span>
              </>
            ) : null}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <PlanHoursEditor planId={plan.id} initialHours={plan.hours_total || 0} readOnly={!canEdit} />
            </div>
            {plan.source_template_id && (
              <>
                <span>•</span>
                <span className="text-xs text-zinc-400">
                  Basada en {plan.source_template_name || "currículo base"} · v{plan.source_version}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status controls and warnings */}
        <PlanStatusControls planId={plan.id} initialStatus={plan.status} readOnly={!canEdit} />
        {warnings.length > 0 && <PlanWarnings warnings={warnings} />}

        {/* Tab content */}
        <PlanTabs plan={plan} readOnly={!canEdit} />
      </div>
    </div>
  );
}
