import { createClient } from "@/lib/supabase";
import { signOutAction } from "@/domain/auth/actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import Link from "next/link";
import { GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group transition-all">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 shadow-md shadow-emerald-500/10 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="hidden font-bold tracking-tight text-zinc-900 sm:inline-block dark:text-zinc-50">
                Program Planner
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                   <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{user.email}</span>
                   <span className="text-[10px] items-center gap-1 font-bold text-emerald-600 dark:text-emerald-500 flex uppercase tracking-wider">
                      <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Conectado
                   </span>
                </div>
                <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
                <form action={signOutAction}>
                  <Button variant="ghost" size="sm" className="h-9 gap-2 text-zinc-500 hover:text-destructive dark:hover:text-destructive-foreground">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/auth" 
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9")}
                >
                  Entrar
                </Link>
                <Link 
                  href="/auth" 
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9 bg-emerald-600 hover:bg-emerald-700")}
                >
                  Empezar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
