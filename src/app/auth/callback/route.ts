import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Auth-callback voor zowel OAuth (Google) als magic link.
 *
 * Drie scenarios:
 * 1. Supabase stuurt een error door (bv. expired token, denied scope): redirect naar
 *    /login met de echte fout-tekst, zodat we niet meer in het generieke "inlog-mislukt".
 * 2. `?code=...` (PKCE): OAuth + magic link in PKCE-flow. exchangeCodeForSession ruilt
 *    de auth-code in voor een sessie. Vereist code_verifier-cookie op dezelfde origin
 *    als waar signInWith* werd aangeroepen.
 * 3. `?token_hash=...&type=...` (token-hash flow): magic link in cross-device-veilige
 *    flow. verifyOtp valideert het token server-side, geen code_verifier nodig.
 *    Dit vereist wel dat de Supabase email-template wijst naar
 *    `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` (niet de
 *    default `{{ .ConfirmationURL }}`).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const errorCode = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const redirect = searchParams.get("redirect") ?? searchParams.get("next") ?? "/";

  function naarLoginMetFout(msg: string) {
    return NextResponse.redirect(`${origin}/login?fout=${encodeURIComponent(msg)}`);
  }

  if (errorCode || errorDescription) {
    return naarLoginMetFout(errorDescription || errorCode || "onbekende-fout");
  }

  const supabase = await createSupabaseServerClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return naarLoginMetFout(error.message);
    return NextResponse.redirect(`${origin}${redirect}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return naarLoginMetFout(error.message);
    return NextResponse.redirect(`${origin}${redirect}`);
  }

  return naarLoginMetFout("geen-code-of-token-in-callback");
}
