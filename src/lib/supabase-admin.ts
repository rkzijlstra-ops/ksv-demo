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
