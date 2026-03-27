"use client";

import { useActionState, useState } from "react";
import { signInAction, signUpAction } from "@/domain/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      if (mode === "signin") {
        return signInAction(prevState, formData);
      } else {
        return signUpAction(prevState, formData);
      }
    },
    { ok: false, error: "" } as any
  );

  const title = mode === "signin" ? "Inicia Sesión" : "Crea una cuenta";
  const description = mode === "signin" 
    ? "Accede a tus currículos y programaciones." 
    : "Únete a Program Planner para gestionar tus clases.";

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md animate-in slide-in-from-bottom-10 duration-500">
      <CardHeader className="space-y-2 pb-6">
        <div className="flex justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/20 group hover:scale-110 transition-transform">
            <span className="text-2xl font-black text-white italic tracking-tighter">P</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center tracking-tight text-zinc-900 dark:text-zinc-50">{title}</CardTitle>
        <CardDescription className="text-center text-zinc-500 dark:text-zinc-400 font-medium">
          {description}
        </CardDescription>
      </CardHeader>
      
      <form action={formAction}>
        <CardContent className="space-y-5">
           {state.error && !state.ok && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-semibold">{state.error}</p>
            </div>
          )}

          {state.ok && state.message && (
            <div className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="font-semibold">{state.message}</p>
            </div>
          )}

          <div className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-zinc-700 dark:text-zinc-300">Nombre Completo</Label>
                <Input 
                  id="full_name" 
                  name="full_name" 
                  placeholder="Ej: David García" 
                  required={mode === "signup"}
                  defaultValue={state.fields?.full_name}
                  className="h-10 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300">Correo Electrónico</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="nombre@ejemplo.com" 
                required 
                defaultValue={state.fields?.email}
                className="h-10 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password text-zinc-700 dark:text-zinc-300">Contraseña</Label>
                {mode === "signin" && (
                  <Link href="#" className="text-xs font-semibold text-zinc-500 hover:text-emerald-600 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                )}
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                className="h-10 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500"
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-5 pt-0">
          <Button 
            type="submit" 
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-600/10 active:scale-95" 
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              mode === "signin" ? "Continuar" : "Crear mi cuenta"
            )}
          </Button>
          
          <div className="text-sm text-center text-zinc-500 dark:text-zinc-400 font-medium">
            {mode === "signin" ? (
              <>
                ¿No tienes una cuenta?{" "}
                <button 
                  type="button" 
                  onClick={() => setMode("signup")}
                  className="font-bold text-emerald-600 dark:text-emerald-500 underline underline-offset-4 decoration-current/30 hover:decoration-current transition-all"
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes una cuenta?{" "}
                <button 
                  type="button" 
                  onClick={() => setMode("signin")}
                  className="font-bold text-emerald-600 dark:text-emerald-500 underline underline-offset-4 decoration-current/30 hover:decoration-current transition-all"
                >
                  Identifícate
                </button>
              </>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
