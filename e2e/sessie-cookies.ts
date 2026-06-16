import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON } from "./test-env";

/**
 * Mint een VERSE, losse Supabase-sessie en geeft de bijbehorende Playwright-cookies terug. Bedoeld
 * voor tests die de sessie kapotmaken (uitloggen): die mogen NIET de gedeelde storageState-sessie
 * (beheerder.json/monteur.json) gebruiken, want `signOut` revoket de sessie server-side. Deelt een
 * test die gedeelde sessie, dan logt elke VOLGENDE test met diezelfde storageState ook uit en belandt
 * op /login. Met een eigen verse login raakt alleen die wegwerp-sessie kapot; multi-sessie per user is
 * toegestaan, dus de gedeelde sessie blijft leven. Zelfde cookie-vorm als global-setup.
 */
export async function verseSessieCookies(email: string, wachtwoord: string, domein = "localhost") {
  const cookies: Record<string, { name: string; value: string }> = {};
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => Object.values(cookies),
      setAll: (toSet) => toSet.forEach((c) => (cookies[c.name] = { name: c.name, value: c.value })),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
  if (error) throw new Error(`Verse sessie-login mislukt: ${error.message}`);

  return Object.values(cookies).map((c) => ({
    name: c.name,
    value: c.value,
    domain: domein,
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: domein !== "localhost",
    sameSite: "Lax" as const,
  }));
}
