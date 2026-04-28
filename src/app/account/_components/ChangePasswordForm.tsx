"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { updateOwnPasswordAction } from "@/domain/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthState = {
  ok: boolean;
  error?: string;
  message?: string;
};

const initialState: AuthState = { ok: false };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(updateOwnPasswordAction, initialState);

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
      <CardHeader>
        <CardTitle>Seguridad</CardTitle>
        <CardDescription>
          Cambia tu contrasena. Por seguridad, te pedimos la contrasena actual.
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
            <Label htmlFor="current_password">Contraseña actual</Label>
            <Input id="current_password" name="current_password" type="password" required placeholder="********" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">Nueva contraseña</Label>
            <Input id="new_password" name="new_password" type="password" required placeholder="********" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
            <Input id="confirm_password" name="confirm_password" type="password" required placeholder="********" />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar contrasena"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

