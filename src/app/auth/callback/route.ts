import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * OAuth / Magic Link callback. Supabase stuurt de browser hier terug met een `code`-param.
 * We ruilen de code in voor een sessie (zet cookies) en redirecten naar de oorspronkelijke
 * pagina (`?redirect=...`) of de werkbak.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?fout=inlog-mislukt`);
}
