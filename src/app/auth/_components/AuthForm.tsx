"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { signInAction } from "@/domain/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type AuthState = {
  ok: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

interface AuthFormProps {
  readonly initialError?: string | null;
}

export function AuthForm({ initialError }: AuthFormProps) {
  const initialState: AuthState = { ok: false, error: initialError ?? undefined };

  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md animate-in slide-in-from-bottom-10 duration-500">
      <CardHeader className="space-y-2 pb-6">
        <div className="flex justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/20 group hover:scale-110 transition-transform">
            <span className="text-2xl font-black text-white italic tracking-tighter">P</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center tracking-tight text-zinc-900 dark:text-zinc-50">Inicia sesion</CardTitle>
        <CardDescription className="text-center text-zinc-500 dark:text-zinc-400 font-medium">
          Accede a tus currículos y programaciones.
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700 dark:text-zinc-300">
                Correo electrónico
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                required
                defaultValue={state.fields?.email ?? ""}
                className="h-10 border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300">
                  Contraseña
                </Label>
                <Link href="/auth/forgot-password" className="text-xs font-semibold text-zinc-500 hover:text-emerald-600 transition-colors">
                  Olvidé mi contraseña
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="********"
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
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continuar"}
          </Button>

          <div className="text-sm text-center text-zinc-500 dark:text-zinc-400 font-medium">
            No tienes una cuenta?{" "}
            <Link
              href="/request-access"
              className="font-bold text-emerald-600 dark:text-emerald-500 underline underline-offset-4 decoration-current/30 hover:decoration-current transition-all"
            >
              Solicitar acceso
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
