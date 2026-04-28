import { AlertTriangle, CheckCircle2, Shield, Users } from "lucide-react";
import {
  approveAccessRequestAction,
  createDirectUserAction,
  getAdminDashboardData,
  rejectAccessRequestAction,
  updateUserPlatformAdminAction,
} from "@/domain/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminPageProps {
  searchParams?: {
    message?: string;
    error?: string;
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const data = await getAdminDashboardData();
  const message = searchParams?.message ? decodeURIComponent(searchParams.message) : null;
  const error = searchParams?.error ? decodeURIComponent(searchParams.error) : null;

  const pendingRequests = data.accessRequests.filter((req) => req.status === "pending");
  const reviewedRequests = data.accessRequests.filter((req) => req.status !== "pending");

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Panel de administracion</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gestion de solicitudes de acceso y privilegios de usuarios.
        </p>
      </header>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/50 dark:bg-emerald-900/20 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/50 dark:bg-rose-900/20 dark:text-rose-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Alta directa de usuario</CardTitle>
          <CardDescription>
            Crea cuentas sin pasar por solicitud previa. Puedes asignar rol y organizacion inicial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createDirectUserAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="direct-full-name">Nombre y apellidos</Label>
              <Input id="direct-full-name" name="full_name" required placeholder="Ej: Laura Martinez Ruiz" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="direct-email">Email</Label>
              <Input id="direct-email" name="email" type="email" required placeholder="usuario@centro.com" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="direct-password">Contraseña inicial</Label>
              <Input id="direct-password" name="assigned_password" type="text" minLength={8} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="direct-account-type">Tipo de cuenta</Label>
              <select
                id="direct-account-type"
                name="account_type"
                defaultValue="user"
                aria-label="Tipo de cuenta"
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="user">Usuario normal</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="direct-organization">Organizacion</Label>
              <select
                id="direct-organization"
                name="organization_id"
                required
                aria-label="Organizacion"
                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {data.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Crear usuario
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Solicitudes pendientes ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            Aprueba o rechaza nuevas solicitudes. Al aprobar, asigna rol y organizacion, y opcionalmente reemplaza la contrasena solicitada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay solicitudes pendientes.</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{request.full_name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{request.email}</p>
                    <p className="text-xs text-zinc-500">
                      Solicitado: {new Date(request.created_at).toLocaleString("es-ES")}
                    </p>
                  </div>

                  <form action={approveAccessRequestAction} className="grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="request_id" value={request.id} />

                    <div className="space-y-1">
                      <Label htmlFor={`account-type-${request.id}`}>Tipo de cuenta</Label>
                      <select
                        id={`account-type-${request.id}`}
                        name="account_type"
                        defaultValue="user"
                        aria-label="Tipo de cuenta"
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        <option value="user">Usuario normal</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`organization-${request.id}`}>Organizacion</Label>
                      <select
                        id={`organization-${request.id}`}
                        name="organization_id"
                        required
                        aria-label="Organizacion"
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        {data.organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name} ({org.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor={`assigned-password-${request.id}`}>Reemplazar contrasena solicitada</Label>
                      <Input
                        id={`assigned-password-${request.id}`}
                        name="assigned_password"
                        type="text"
                        minLength={8}
                        placeholder="Dejar en blanco para respetar la contrasena solicitada"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor={`approve-notes-${request.id}`}>Notas de revision (opcional)</Label>
                      <Input id={`approve-notes-${request.id}`} name="reviewer_notes" placeholder="Comentario interno" />
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                        Aprobar solicitud
                      </Button>
                    </div>
                  </form>

                  <form action={rejectAccessRequestAction} className="flex flex-col gap-2">
                    <input type="hidden" name="request_id" value={request.id} />
                    <Label htmlFor={`reject-notes-${request.id}`}>Motivo de rechazo (opcional)</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input id={`reject-notes-${request.id}`} name="reviewer_notes" placeholder="Motivo interno o para soporte" />
                      <Button type="submit" variant="destructive">
                        Rechazar
                      </Button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Usuarios del sistema ({data.users.length})
          </CardTitle>
          <CardDescription>
            Cambia privilegios de administrador del sistema para usuarios existentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Accion</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-3">{user.full_name || "-"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{user.email}</td>
                  <td className="py-2 pr-3">
                    {user.is_platform_admin ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Usuario
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <form action={updateUserPlatformAdminAction}>
                      <input type="hidden" name="profile_id" value={user.id} />
                      <input type="hidden" name="make_admin" value={user.is_platform_admin ? "false" : "true"} />
                      <Button type="submit" variant="outline" size="sm">
                        {user.is_platform_admin ? "Quitar admin" : "Hacer admin"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Historial de solicitudes</CardTitle>
          <CardDescription>Ultimas solicitudes ya revisadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {reviewedRequests.length === 0 ? (
            <p className="text-sm text-zinc-500">Aun no hay solicitudes revisadas.</p>
          ) : (
            reviewedRequests.slice(0, 20).map((request) => (
              <div
                key={request.id}
                className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-1 text-sm"
              >
                <div className="font-medium">{request.full_name} - {request.email}</div>
                <div className="text-xs text-zinc-500">
                  Estado: {request.status === "approved" ? "Aprobada" : "Rechazada"} | Revisada:{" "}
                  {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString("es-ES") : "-"}
                </div>
                {request.reviewer_notes && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Notas: {request.reviewer_notes}</div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
