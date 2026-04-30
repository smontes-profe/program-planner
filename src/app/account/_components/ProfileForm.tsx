"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { updateOwnProfileAction } from "@/domain/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileState = {
  ok: boolean;
  error?: string;
  message?: string;
  fields?: Record<string, string>;
};

const initialState: ProfileState = { ok: false };

type ProfileFormProps = {
  fullName: string;
};

export function ProfileForm({ fullName }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateOwnProfileAction, initialState);
  const currentFullName = state.fields?.full_name ?? fullName;

  return (
    <Card className="border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <CardHeader>
        <CardTitle>Datos personales</CardTitle>
        <CardDescription>Actualiza el nombre y los apellidos que se muestran en tu perfil.</CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && !state.ok && (
            <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-semibold">{state.error}</p>
            </div>
          )}

          {state.ok && state.message && (
            <div className="flex gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <p className="font-semibold">{state.message}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre y apellidos</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              minLength={3}
              maxLength={160}
              defaultValue={currentFullName}
              autoComplete="name"
              aria-invalid={Boolean(state.error && !state.ok)}
              aria-describedby={state.error && !state.ok ? "full_name_error" : undefined}
              placeholder="Ej: Laura Martinez Ruiz"
            />
            {state.error && !state.ok && (
              <p id="full_name_error" className="text-xs font-medium text-destructive">
                {state.error}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar datos"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
