import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * Supabase service-role client voor admin-acties (gebruikers aanmaken/opzoeken).
 * ALLEEN server-side gebruiken; de secret key mag nooit naar de client.
 */
export function supabaseAdmin() {
  const e = env();
  return createClient(e.SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Haalt het e-mailadres van een gebruiker (account) op; null als onbekend. */
export async function getGebruikerEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}
