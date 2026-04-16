import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/curriculum", "/plans", "/evaluations", "/account", "/admin"];
const AUTH_PATH_PREFIX = "/auth";
const AUTH_PATHS_ALLOWED_WHEN_LOGGED = ["/auth/reset-password", "/auth/confirm"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPath = pathname.startsWith(AUTH_PATH_PREFIX);
  const isAllowedAuthPathWhenLogged = AUTH_PATHS_ALLOWED_WHEN_LOGGED.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (user && isAuthPath && !isAllowedAuthPathWhenLogged) {
    return NextResponse.redirect(new URL("/curriculum", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/curriculum/:path*", "/plans/:path*", "/evaluations/:path*", "/account/:path*", "/admin/:path*", "/auth", "/auth/:path*"],
};
