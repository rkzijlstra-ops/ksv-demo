import { redirect } from "next/navigation";
import { db, type Rol, type Profiel } from "./db";
import { createSupabaseServerClient } from "./supabase-server";
import { profielVolledig } from "./profiel";
import { isDemoMode } from "./demo";

/** Startpagina per rol: monteur -> kluspool, opdrachtgever/beheerder -> dashboard. */
export function startpaginaVoorRol(rol: Rol): string {
  return rol === "monteur" ? "/" : "/dashboard";
}

/**
 * Server-gate per pagina: vereist dat de ingelogde gebruiker een van de toegestane rollen heeft.
 * - niet ingelogd -> /login
 * - ingelogd zonder profiel -> /geen-toegang
 * - verkeerde rol -> naar de eigen startpagina
 * - monteur met onvolledig profiel -> /welkom (onboarding), tenzij skipOnboarding (de /welkom-pagina zelf)
 * Geeft anders het profiel + e-mailadres terug.
 */
export async function vereisRol(
  toegestane: Rol[],
  opts?: { skipOnboarding?: boolean },
): Promise<{ profiel: Profiel; email: string | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profiel = await (await db()).getProfiel(user.id);
  if (!profiel) redirect("/geen-toegang");
  if (!toegestane.includes(profiel.rol)) redirect(startpaginaVoorRol(profiel.rol));

  // Eerste gebruik: een monteur moet zijn afzendergegevens invullen voor hij verder kan. Zo staat
  // het Reply-To-adres en het briefhoofd van het rapport altijd goed. De /welkom-pagina zelf slaat
  // dit over om een redirect-lus te voorkomen.
  // In demo-modus niet: de demo is een scripted uitstalraam, geen echte onboarding.
  if (profiel.rol === "monteur" && !opts?.skipOnboarding && !isDemoMode() && !profielVolledig(profiel)) {
    redirect("/welkom");
  }

  // Eerste gebruik van een opdrachtgever: een eenmalig welkomscherm waarin hij zijn naam (door beheer
  // ingevuld) kan bevestigen of corrigeren. Daarna nooit meer (welkom_bevestigd). Niet in demo.
  if (
    profiel.rol === "opdrachtgever" &&
    !opts?.skipOnboarding &&
    !isDemoMode() &&
    !profiel.welkom_bevestigd
  ) {
    redirect("/welkom-opdrachtgever");
  }

  return { profiel, email: user.email ?? null };
}
