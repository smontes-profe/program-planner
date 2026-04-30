import { createAdminClient, createClient } from "@/lib/supabase";
import { getSupabaseEnv } from "@/lib/supabase-env";

function mask(value: string): string {
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

async function checkClient(label: string, factory: () => Promise<unknown> | unknown) {
  try {
    await factory();
    return { label, ok: true as const };
  } catch (error) {
    return {
      label,
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function DebugSupabasePage() {
  const envResult = (() => {
    try {
      const env = getSupabaseEnv();
      return {
        ok: true as const,
        url: mask(env.url),
        key: mask(env.key),
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })();

  const createClientResult = await checkClient("createClient", () => createClient());
  const createAdminClientResult = await checkClient("createAdminClient", () => createAdminClient());

  return (
    <div className="app-content">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Debug Supabase
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Página temporal para verificar qué ve Vercel en runtime.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Variables
          </h2>
          {envResult.ok ? (
            <ul className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
              <li><span className="font-medium">URL:</span> {envResult.url}</li>
              <li><span className="font-medium">Public key:</span> {envResult.key}</li>
            </ul>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">{envResult.error}</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Client
          </h2>
          <p className={`text-sm ${createClientResult.ok ? "text-emerald-600" : "text-red-600"} dark:${createClientResult.ok ? "text-emerald-400" : "text-red-400"}`}>
            {createClientResult.ok ? "createClient() OK" : `createClient() ERROR: ${createClientResult.error}`}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Admin
          </h2>
          <p className={`text-sm ${createAdminClientResult.ok ? "text-emerald-600" : "text-red-600"} dark:${createAdminClientResult.ok ? "text-emerald-400" : "text-red-400"}`}>
            {createAdminClientResult.ok ? "createAdminClient() OK" : `createAdminClient() ERROR: ${createAdminClientResult.error}`}
          </p>
        </div>
      </div>
    </div>
  );
}
