import { getRegions, ensureUserHasOrganization } from "@/domain/organization/actions";
import { CurriculumForm } from "../../_components/CurriculumForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoveLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";

interface EditCurriculumPageProps {
  readonly params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditCurriculumPageProps) {
  const { id } = await params;
  return {
    title: `Editar Currículo ${id} - Program Planner`,
  };
}

export default async function EditCurriculumPage({ params }: EditCurriculumPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch initial data
  const { data: template, error } = await supabase
    .from("curriculum_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !template) {
    return notFound();
  }

  if (!user || template.created_by_profile_id !== user.id) {
    redirect(`/curriculum/${id}`);
  }

  const [regionsResult, orgsResult] = await Promise.all([
    getRegions(),
    ensureUserHasOrganization()
  ]);

  const regions = regionsResult.ok ? regionsResult.data : [];
  const organizations = orgsResult.ok ? orgsResult.data : [];

  return (
    <div className="app-content max-w-2xl">
      <div className="mb-6">
        <Link 
          href={`/curriculum/${id}`} 
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-zinc-500 hover:text-zinc-900")}
        >
          <MoveLeft className="mr-2 h-4 w-4" />
          Volver al currículo
        </Link>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Editar Datos del Currículo</CardTitle>
          <CardDescription>
            Modifica la información básica del módulo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurriculumForm 
            regions={regions} 
            organizations={organizations} 
            templateId={id}
            initialData={template}
          />
        </CardContent>
      </Card>
    </div>
  );
}
