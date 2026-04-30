import { getEvaluationContext, computeStudentGrades, getScoresForContext, listEvaluationShares } from "@/domain/evaluation/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MoveLeft } from "lucide-react";
import { EvalTabs } from "./_components/EvalTabs";
import { getPlan } from "@/domain/teaching-plan/actions";
import type { TeachingPlanFull } from "@/domain/teaching-plan/types";

interface EvalDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: { error?: string };
}

export default async function EvalDetailPage({ params, searchParams }: EvalDetailPageProps) {
  const { id } = await params;
  const result = await getEvaluationContext(id);

  if (!result.ok || !result.data) return notFound();

  const context = result.data;
  const planResults = await Promise.all(
    (context.plan_ids || []).map(planId => getPlan(planId))
  );
  const linkedPlans: TeachingPlanFull[] = planResults.filter(pr => pr.ok).map(pr => pr.data);
  const scoresResult = await getScoresForContext(id);
  const scoresForMatrix = scoresResult.ok ? scoresResult.data : [];
  const sharesResult = context.is_owner ? await listEvaluationShares(id) : { ok: true as const, data: [] };
  const gradesResult = await computeStudentGrades(id, {
    plans: linkedPlans,
    scores: scoresResult.ok ? scoresResult.data : undefined,
  });
  
    const errorMessage = searchParams?.error ? decodeURIComponent(searchParams.error) : null;

  return (
    <div className="app-content">
      <div className="flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex justify-between items-start">
          <Link
            href="/evaluations"
            className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            <MoveLeft className="mr-2 h-4 w-4" />
            Evaluaciones
          </Link>
                  </div>

        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {context.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500 text-sm font-medium mt-2">
            <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {context.academic_year}
            </span>
            {context.plans.length > 0 && (
              <>
                <span>•</span>
                <span className="text-xs text-zinc-400">
                  {context.plans.length} módulo{context.plans.length > 1 ? "s" : ""}: {context.plans.map(p => p.module_code).join(", ")}
                </span>
              </>
            )}
            <span>•</span>
            <span className="text-xs text-zinc-400">
              {context.students.length} alumno{context.students.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/60 dark:bg-rose-900/40 dark:text-rose-200">
            {errorMessage}
          </div>
        )}

        {/* Tab content */}
        <EvalTabs
          context={context}
          gradesResult={gradesResult.ok ? gradesResult.data : null}
          plans={linkedPlans}
          scores={scoresForMatrix}
          scoreError={scoresResult.ok ? undefined : scoresResult.error}
          shares={sharesResult.ok ? sharesResult.data : []}
        />
      </div>
    </div>
  );
}
