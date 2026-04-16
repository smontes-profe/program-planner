import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next") ?? "/curriculum";
  const safeNext = next.startsWith("/") ? next : "/curriculum";

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent("Enlace no valido.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent("Enlace caducado o invalido.")}`
    );
  }

  return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
}

