import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isTestLoginActief, TEST_LOGIN_ACCOUNTS } from "@/lib/demo";

export const runtime = "nodejs";

/**
 * Test-only snel-inloggen voor de test-omgeving: open /api/test-login?rol=kantoor (of monteur) en je bent
 * ingelogd als het vaste test-account op de TEST-DB, zonder Google/magic-link. Gegrendeld op TEST_LOGIN=1
 * of niet-productie; op de echte prod-/demo-deploy bestaat de route niet (redirect naar home).
 *
 * Zelfherstellend: de e2e-global-setup reset de wachtwoorden van deze gedeelde test-accounts bij elke run.
 * Daarom zet de route het juiste wachtwoord via de service-role eerst terug, en logt dan pas in. Zo werkt
 * de test-login altijd, ongeacht wat de e2e ondertussen deed.
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!isTestLoginActief()) return NextResponse.redirect(new URL("/", req.url));

  const rol = new URL(req.url).searchParams.get("rol") === "kantoor" ? "kantoor" : "monteur";
  const account = TEST_LOGIN_ACCOUNTS[rol];

  const url = process.env.SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (url && secret) {
    try {
      const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
      await admin.auth.admin.updateUserById(account.uid, {
        password: account.wachtwoord,
        email_confirm: true,
      });
    } catch {
      // Best effort: lukt het terugzetten niet, dan proberen we alsnog in te loggen.
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.wachtwoord,
  });
  if (error) return NextResponse.redirect(new URL("/login?test=nogniet", req.url));

  // Kantoor naar het dashboard, monteur naar de werkpool (home).
  return NextResponse.redirect(new URL(rol === "kantoor" ? "/dashboard" : "/", req.url));
}
