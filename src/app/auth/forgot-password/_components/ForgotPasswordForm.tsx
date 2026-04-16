"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { requestPasswordResetAction } from "@/domain/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthState = {
  ok: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

const initialState: AuthState = { ok: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 shadow-xl bg-white/90 dark:bg-zinc-900/85">
      <CardHeader>
        <CardTitle>Recuperar contrasena</CardTitle>
        <CardDescription>
          Te enviaremos un enlace para crear una nueva contrasena.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && !state.ok && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-semibold">{state.error}</p>
            </div>
          )}

          {state.ok && state.message && (
            <div className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs p-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="font-semibold">{state.message}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="nombre@ejemplo.com"
              defaultValue={state.fields?.email ?? ""}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar enlace"}
          </Button>
          <Link href="/auth" className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 text-center">
            Volver a inicio de sesion
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

