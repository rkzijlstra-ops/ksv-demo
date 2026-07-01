import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware-helper voor Supabase Auth-cookies.
 * - Refresht de sessie zodat ingelogde users niet uitloggen tijdens een server-render
 * - Stuurt niet-ingelogde users naar /login (behalve voor publieke routes)
 *
 * /api/* routes worden NIET via middleware geforceerd; daar handelen de routes zelf
 * de auth-check af zodat 401-fouten netjes als JSON terugkomen i.p.v. een redirect.
 */
// /demo/* mag publiek zijn: die routes loggen zélf in / melden zelf aan (en zijn gegrendeld op
// DEMO_MODE; in productie redirecten ze naar home). Zonder dit zou de middleware ze naar /login sturen.
// /test-login idem: de pagina logt zelf in op de test-DB en is gegrendeld op isTestLoginActief()
// (in echte productie → notFound), dus publiek-maken is veilig.
// /klus/ is de publieke foto-downloadpagina die vanuit het (gemailde) opleverrapport wordt geopend:
// de opdrachtgever is daar niet ingelogd. Toegang is niet-raadbaar via het opdracht-id (UUID), dezelfde
// laag als de al-publieke foto- en PDF-URL's.
const PUBLIEK = ["/login", "/auth/", "/mockups", "/demo/", "/test-login", "/klus/"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // BELANGRIJK: getUser() (niet getSession()) bevestigt de gebruiker server-side
  // via een echte API-call naar Supabase; getSession() vertrouwt blind op de cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pad = request.nextUrl.pathname;
  const isPubliek = PUBLIEK.some((p) => pad.startsWith(p));

  if (!user && !isPubliek) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pad);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
