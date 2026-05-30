import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase-client voor server-components, route-handlers en server-actions.
 * Leest/schrijft sessie-cookies via Next's `cookies()`, zodat een ingelogde gebruiker
 * over alle server-render-routes herkend wordt.
 *
 * Belangrijk: voor admin-acties (rapport-PDF uploaden, etc.) die RLS moeten omzeilen,
 * gebruik je de bestaande db()/storage() in src/lib/db.ts (service-role key).
 * Voor user-acties die RLS moeten respecteren, gebruik je deze client.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Het kan zijn dat `setAll` wordt aangeroepen vanuit een Server Component
            // waar Next geen cookies meer mag zetten. In een middleware/route handler
            // worden de cookies daar wel meegestuurd, dus negeer hier.
          }
        },
      },
    },
  );
}
