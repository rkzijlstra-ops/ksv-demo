import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isDemoMode, DEMO_ACCOUNTS, DEMO_WACHTWOORD } from "@/lib/demo";

/**
 * Demo-only snel-inloggen voor de QR-flow: open /demo/login?rol=monteur (of kantoor) en je bent meteen
 * ingelogd als het vaste demo-account, zonder inlogscherm. Zo opent de prospect met één scan de
 * monteur-app op zijn telefoon. Gegrendeld op DEMO_MODE en alleen de vaste demo-accounts; in productie
 * bestaat deze route niet (redirect naar home).
 */
export async function GET(req: Request): Promise<NextResponse> {
  const home = new URL("/", req.url);
  if (!isDemoMode()) return NextResponse.redirect(home);

  const rol = new URL(req.url).searchParams.get("rol") === "kantoor" ? "kantoor" : "monteur";
  const account = rol === "kantoor" ? DEMO_ACCOUNTS.kantoor : DEMO_ACCOUNTS.monteur;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: DEMO_WACHTWOORD,
  });
  if (error) {
    // Account bestaat nog niet? Stuur naar het normale inlogscherm met een hint.
    return NextResponse.redirect(new URL("/login?demo=nogniet", req.url));
  }
  // Kantoor naar het dashboard, monteur naar de werkpool.
  return NextResponse.redirect(new URL(rol === "kantoor" ? "/dashboard" : "/", req.url));
}
