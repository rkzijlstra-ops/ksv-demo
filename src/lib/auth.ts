import { createSupabaseServerClient } from "./supabase-server";

/**
 * Geeft de UUID van de ingelogde gebruiker terug, of `null` als er geen sessie is.
 * API-routes gebruiken dit om user_id mee te geven aan db-inserts en om 401 te geven
 * als de middleware ooit gemist zou worden.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
