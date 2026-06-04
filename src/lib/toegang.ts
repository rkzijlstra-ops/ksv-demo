import { redirect } from "next/navigation";
import { db, type Rol, type Profiel } from "./db";
import { createSupabaseServerClient } from "./supabase-server";

/** Startpagina per rol: monteur -> werkpool, opdrachtgever/beheerder -> dashboard. */
export function startpaginaVoorRol(rol: Rol): string {
  return rol === "monteur" ? "/" : "/dashboard";
}

/**
 * Server-gate per pagina: vereist dat de ingelogde gebruiker een van de toegestane rollen heeft.
 * - niet ingelogd -> /login
 * - ingelogd zonder profiel -> /geen-toegang
 * - verkeerde rol -> naar de eigen startpagina
 * Geeft anders het profiel + e-mailadres terug.
 */
export async function vereisRol(
  toegestane: Rol[],
): Promise<{ profiel: Profiel; email: string | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profiel = await (await db()).getProfiel(user.id);
  if (!profiel) redirect("/geen-toegang");
  if (!toegestane.includes(profiel.rol)) redirect(startpaginaVoorRol(profiel.rol));

  return { profiel, email: user.email ?? null };
}
