"use client";

import { useState } from "react";
import { type TeachingPlanFull } from "@/domain/teaching-plan/types";
import { CurriculumTab } from "./CurriculumTab";
import { WeightsTab } from "./WeightsTab";
import { UnitsTab } from "./UnitsTab";
import { InstrumentsTab } from "./InstrumentsTab";
import { RaInstrumentMatrixTab } from "./RaInstrumentMatrixTab";
import { cn } from "@/lib/utils";
import { BookOpen, BarChart3, LayoutList, Microscope, Grid3x3 } from "lucide-react";

interface PlanTabsProps {
  readonly plan: TeachingPlanFull;
}

type TabId = "curriculum" | "weights" | "units" | "instruments" | "ra-matrix";

const TABS: { id: TabId; label: string; icon: React.ReactNode; available: boolean }[] = [
  { id: "curriculum", label: "Currículo", icon: <BookOpen className="h-4 w-4" />, available: true },
  { id: "weights", label: "Pesos", icon: <BarChart3 className="h-4 w-4" />, available: true },
  { id: "units", label: "Unidades de Trabajo", icon: <LayoutList className="h-4 w-4" />, available: true },
  { id: "instruments", label: "Instrumentos", icon: <Microscope className="h-4 w-4" />, available: true },
  { id: "ra-matrix", label: "RAs vs Instrumentos", icon: <Grid3x3 className="h-4 w-4" />, available: true },
];

export function PlanTabs({ plan }: PlanTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("curriculum");

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex gap-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`plan-tab-${tab.id}`}
            onClick={() => tab.available && setActiveTab(tab.id)}
            disabled={!tab.available}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
              !tab.available && "opacity-40 cursor-not-allowed hover:text-zinc-500"
            )}
          >
            {tab.icon}
            {tab.label}
            {!tab.available && (
              <span className="ml-1 text-[9px] font-bold uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                Próx.
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {activeTab === "curriculum" && <CurriculumTab plan={plan} />}
        {activeTab === "weights" && <WeightsTab plan={plan} />}
        {activeTab === "units" && <UnitsTab plan={plan} />}
        {activeTab === "instruments" && <InstrumentsTab plan={plan} />}
        {activeTab === "ra-matrix" && <RaInstrumentMatrixTab plan={plan} />}
      </div>
    </div>
  );
}
