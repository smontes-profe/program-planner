import { getRegions, ensureUserHasOrganization } from "@/domain/organization/actions";
import { CurriculumForm } from "../_components/CurriculumForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoveLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Nuevo Currículo - Program Planner",
  description: "Crea un nuevo borrador de currículo para tu organización.",
};

export default async function NewCurriculumPage() {
  const [regionsResult, orgsResult] = await Promise.all([
    getRegions(),
    ensureUserHasOrganization()
  ]);

  const regions = regionsResult.ok ? regionsResult.data : [];
  const organizations = orgsResult.ok ? orgsResult.data : [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <Link 
          href="/curriculum" 
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-zinc-500 hover:text-zinc-900")}
        >
          <MoveLeft className="mr-2 h-4 w-4" />
          Volver al listado
        </Link>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Nuevo Currículo</CardTitle>
          <CardDescription>
            Introduce los detalles básicos del módulo para empezar a añadir los Resultados de Aprendizaje.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurriculumForm regions={regions} organizations={organizations} />
        </CardContent>
      </Card>
    </div>
  );
}
