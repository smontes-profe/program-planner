import { createClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { PublishButton } from "./_components/PublishButton";
import { AddRAButton } from "./_components/AddRAButton";
import { AddCEButton } from "./_components/AddCEButton";
import Link from "next/link";
import { MoveLeft, Edit, Trash2, MoreVertical } from "lucide-react";
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

  const isDraft = template.status === 'draft';

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
            {isDraft && (
              <>
                <Link 
                  href={`/curriculum/${id}/edit`} 
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex items-center")}
                >
                  <Edit className="mr-2 h-4 w-4" /> Editar Datos
                </Link>
                <PublishButton templateId={id} />
              </>
            )}
            <Button variant="destructive" size="sm" className="opacity-70 hover:opacity-100 h-9">
               <Trash2 className="h-4 w-4" />
            </Button>
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
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <Badge variant={template.status === 'published' ? 'success' : template.status === 'deprecated' ? 'warning' : 'neutral'}>
               {template.status === 'published' ? 'Publicado' : template.status === 'deprecated' ? 'Depreciado' : 'Borrador'}
            </Badge>
          </div>
        </div>

        <div className="grid gap-8 mt-4 text-zinc-900 dark:text-zinc-50">
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Resultados de Aprendizaje (RA)</h2>
              {isDraft && (
                <AddRAButton templateId={id} />
              )}
            </div>

            {template.ras && template.ras.length > 0 ? (
               <div className="space-y-6">
                 {template.ras.map((ra: any) => (
                    <Card key={ra.id} className="border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                      <div className="bg-zinc-50 px-6 py-3 flex justify-between items-center border-b border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800">
                        <div className="flex items-baseline gap-3">
                           <span className="text-lg font-bold font-mono text-zinc-400">RA {ra.code}</span>
                           <span className="text-xs font-semibold px-1.5 py-0.5 bg-zinc-200 rounded dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                             Peso: {ra.weight_in_template}%
                           </span>
                        </div>
                        {isDraft && (
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                              <MoreVertical className="h-4 w-4" />
                           </Button>
                        )}
                      </div>
                      <CardContent className="pt-4 space-y-4">
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                          {ra.description}
                        </p>
                        
                        <div className="pt-2 space-y-3">
                           <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Criterios de Evaluación</h4>
                              {isDraft && (
                                <AddCEButton templateId={id} raId={ra.id} />
                              )}
                           </div>
                           
                           {ra.ces && ra.ces.length > 0 ? (
                              <div className="grid gap-2">
                                {ra.ces.map((ce: any) => (
                                   <div key={ce.id} className="p-3 bg-white border border-zinc-100 rounded-lg flex gap-4 dark:bg-zinc-950 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors">
                                      <div className="font-mono text-zinc-400 text-sm font-bold pt-0.5">{ce.code}</div>
                                      <div className="flex-1 space-y-1">
                                         <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{ce.description}</p>
                                         <div className="text-[10px] uppercase font-bold text-zinc-400">
                                           Peso en RA: {ce.weight_in_ra}%
                                         </div>
                                      </div>
                                   </div>
                                ))}
                              </div>
                           ) : (
                              <p className="text-xs text-zinc-400 italic">No hay criterios definidos para este RA.</p>
                           )}
                        </div>
                      </CardContent>
                    </Card>
                 ))}
               </div>
            ) : (
              <Card className="bg-zinc-50/50 border-dashed border-2 dark:bg-zinc-900/20 py-12 flex flex-col items-center justify-center border-zinc-200 dark:border-zinc-800">
                 <p className="text-zinc-500 mb-4 font-medium">Empieza añadiendo tu primer Resultado de Aprendizaje.</p>
                 {isDraft && <AddRAButton templateId={id} />}
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
