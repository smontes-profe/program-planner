import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type EvaluationContextFull } from "@/domain/evaluation/types";
import { linkPlanAction, unlinkPlanAction, updateContextAction } from "../actions";

interface ContextSettingsPanelProps {
  readonly context: EvaluationContextFull;
  readonly availablePlans: { id: string; title: string; module_code: string; academic_year: string }[];
}

export function ContextSettingsPanel({ context, availablePlans }: ContextSettingsPanelProps) {
  const linkedPlanIds = new Set(context.plans.map((plan) => plan.id));
  const linkablePlans = availablePlans.filter((plan) => !linkedPlanIds.has(plan.id));

  return (
    <section id="context-settings" className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 p-6 mb-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Configuración del contexto</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Puedes cambiar el nombre, el curso y las programaciones asociadas.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form action={updateContextAction} className="space-y-4">
          <input type="hidden" name="context_id" value={context.id} />
          <div>
            <label htmlFor="context-title" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Nombre del contexto
            </label>
            <Input
              id="context-title"
              name="title"
              defaultValue={context.title}
              required
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="context-year" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Curso académico
            </label>
            <Input
              id="context-year"
              name="academic_year"
              defaultValue={context.academic_year}
              required
              pattern="\d{4}/\d{4}"
              placeholder="2026/2027"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="mt-1">Guardar cambios</Button>
        </form>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Programaciones vinculadas
            </p>
            {context.plans.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Aún no hay ninguna programación asociada a este contexto.
              </p>
            ) : (
              <div className="space-y-2">
                {context.plans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-md bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-100">
                      {plan.module_code} - {plan.title}
                    </div>
                    <form action={unlinkPlanAction}>
                      <input type="hidden" name="context_id" value={context.id} />
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <Button variant="ghost" size="sm" type="submit">
                        Desvincular
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form action={linkPlanAction} className="space-y-2">
            <input type="hidden" name="context_id" value={context.id} />
            <label htmlFor="link-plan" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Vincular nueva programación
            </label>
            <select
              id="link-plan"
              name="plan_id"
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              defaultValue=""
              disabled={linkablePlans.length === 0}
              required
            >
              <option value="" disabled>
                {linkablePlans.length === 0 ? "No hay programaciones disponibles" : "Seleccionar programación"}
              </option>
              {linkablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.module_code} — {plan.title}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={linkablePlans.length === 0}>Vincular</Button>
          </form>
        </div>
      </div>
    </section>
  );
}
