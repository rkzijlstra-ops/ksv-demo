import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isTestLoginActief, TEST_LOGIN_ACCOUNTS } from "@/lib/demo";

/**
 * Test-only snel-inloggen voor de preview/test-omgeving: open /api/test-login?rol=kantoor (of monteur) en
 * je bent ingelogd als het vaste test-account op de TEST-DB, zonder Google/magic-link. Gegrendeld op
 * niet-productie (VERCEL_ENV !== "production"), dus op de prod- en demo-deploy bestaat deze route niet
 * (redirect naar home). Spiegelt /demo/login, maar dan voor de test-omgeving i.p.v. de demo.
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!isTestLoginActief()) return NextResponse.redirect(new URL("/", req.url));

  const rol = new URL(req.url).searchParams.get("rol") === "kantoor" ? "kantoor" : "monteur";
  const account = TEST_LOGIN_ACCOUNTS[rol];

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.wachtwoord,
  });
  if (error) return NextResponse.redirect(new URL("/login?test=nogniet", req.url));

  // Kantoor naar het dashboard, monteur naar de werkpool (home).
  return NextResponse.redirect(new URL(rol === "kantoor" ? "/dashboard" : "/", req.url));
}
