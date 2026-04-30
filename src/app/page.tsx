import Link from "next/link";
import { BookOpen, Table, GraduationCap, ChevronRight, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans p-6 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <main className="app-content flex flex-col items-center text-center gap-12 z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-full text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest shadow-sm">
            <GraduationCap className="h-4 w-4" />
            Program Planner v0.1.2
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1]">
            Simplifica tu <span className="text-emerald-600 dark:text-emerald-500">Planificación</span> Académica
          </h1>
          <p className="max-w-2xl text-lg md:text-xl leading-relaxed text-zinc-600 dark:text-zinc-400 mt-2 font-medium">
            Gestiona resultados de aprendizaje, criterios de evaluación y programaciones didácticas en una plataforma unificada y profesional.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <Link 
            href="/curriculum" 
            className="group flex flex-col items-start p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all text-left"
          >
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
               <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Plantillas de Currículo</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-4">
              Crea y publica las bases oficiales de tus módulos, incluyendo RAs y CEs detallados.
            </p>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-bold text-sm">
              Acceder <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link 
            href="/plans" 
            className="group flex flex-col items-start p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all text-left"
          >
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
               <Table className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Programaciones</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-4">
              Crea planes de enseñanza con pesos, UTs e instrumentos de evaluación basados en currículos publicados.
            </p>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-bold text-sm">
              Acceder <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            href="/evaluations"
            className="group flex flex-col items-start p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all text-left"
          >
            <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
               <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Evaluaciones</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-4">
              Registra notas por alumno e instrumento, calcula calificaciones por RA y trimestre automáticamente.
            </p>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-bold text-sm">
              Acceder <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        <div className="flex flex-col gap-4 text-sm font-medium pt-8 border-t border-zinc-200 dark:border-zinc-800 w-full max-w-sm mt-4 text-zinc-500 dark:text-zinc-400 italic">
          <p>Potenciado por el sistema de plantillas de Phase 2.</p>
        </div>
      </main>
    </div>
  );
}
