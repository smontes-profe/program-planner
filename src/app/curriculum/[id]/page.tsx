import { createClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { PublishButton } from "./_components/PublishButton";
import { AddRAButton } from "./_components/AddRAButton";
import { BulkAddRAButton } from "./_components/BulkAddRAButton";
import { DeleteCurriculumButton } from "./_components/DeleteCurriculumButton";
import { CurriculumSortableList } from "./_components/CurriculumSortableList";
import { TemplateHoursEditor } from "./_components/TemplateHoursEditor";
import Link from "next/link";
import { MoveLeft, Edit } from "lucide-react";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";

interface TemplatePageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function TemplateDetailsPage({ params }: TemplatePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from("curriculum_templates")
    .select(`
      *,
      ras:template_ra (
        *,
        ces:template_ce (*)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !template) {
    return notFound();
  }

  // Sort relations manually
  if (template.ras) {
    template.ras.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    template.ras.forEach((ra: any) => {
      if (ra.ces) {
        ra.ces.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
      }
    });
  }

  const isDraft = template.status === 'draft';

  let badgeVariant: 'success' | 'warning' | 'neutral' = 'neutral';
  let badgeLabel = 'Borrador';

  if (template.status === 'published') {
    badgeVariant = 'success';
    badgeLabel = 'Publicado';
  } else if (template.status === 'deprecated') {
    badgeVariant = 'warning';
    badgeLabel = 'Depreciado';
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <Link 
            href="/curriculum" 
            className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            <MoveLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
          <div className="flex gap-2">
            <Link 
              href={`/curriculum/${id}/edit`} 
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex items-center")}
            >
              <Edit className="mr-2 h-4 w-4" /> Editar Datos
            </Link>
            {isDraft && <PublishButton templateId={id} />}
            <DeleteCurriculumButton templateId={id} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6 text-zinc-900 dark:text-zinc-50">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {template.module_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-zinc-500 text-sm font-medium">
              <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {template.module_code}
              </span>
              <span>•</span>
              <span>{template.academic_year}</span>
              <span>•</span>
              <span className="capitalize">{template.region_code}</span>
              <span>•</span>
              <span className="bg-zinc-100 px-1.5 py-0.5 rounded dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                v{template.version}
              </span>
              <span>•</span>
              <TemplateHoursEditor templateId={id} initialHours={template.hours_total || 0} />
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <Badge variant={badgeVariant}>
               {badgeLabel}
            </Badge>
          </div>
        </div>

        <div className="grid gap-8 mt-4 text-zinc-900 dark:text-zinc-50">
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Resultados de Aprendizaje (RA)</h2>
              <div className="flex items-center gap-2">
                <BulkAddRAButton templateId={id} />
                <AddRAButton templateId={id} />
              </div>
            </div>

            {template.ras && template.ras.length > 0 ? (
               <CurriculumSortableList template={template} isDraft={isDraft} />
            ) : (
               <Card className="bg-zinc-50/50 border-dashed border-2 dark:bg-zinc-900/20 py-12 flex flex-col items-center justify-center border-zinc-200 dark:border-zinc-800 text-center">
                  <p className="text-zinc-500 mb-4 font-medium">No hay RAs definidos en este currículo.</p>
                  <AddRAButton templateId={id} />
               </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
