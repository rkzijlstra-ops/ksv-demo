# Schone lei (back-up, legen, accounts herinrichten) + rename naar productie/demo/test + omgevingskaart

Datum: 2026-06-28
Geen feature-branch: dit was een operationele ingreep op de live-omgevingen plus docs, geen code-wijziging.

## Aanleiding

Reinier wilde met een schone lei beginnen: de rapporten die echt naar opdrachtgevers (Keukensale + KSV) waren gegaan veiligstellen, daarna test en productie legen, en de accounts opnieuw inrichten met `beheer@kluslus.nl` als master-beheerder en `bkm` als monteur. Aanleiding kwam uit de eerder afgeronde test-omgeving-keten (zie het keten-logboek in master via PR #32 en de memory `project_ksv-test-omgeving-keten`).

## Wat is gedaan

**1. Back-up rapporten naar Drive.**
De rapporten die daadwerkelijk naar buiten gingen (6 KSV + 3 Keukensale, ook die uit gebruikersaccounts) opgeslagen in `H:\Mijn Drive\Kluslus rapporten archief 2026-06-28` (bkm zakelijke Drive). Waarschijnlijk nooit meer nodig, maar bewaard.

**2. Productie en test geleegd.**
Productie-DB (`qbynjfscdxhwdkzfqjjg`) leeggemaakt via een SQL-blok dat ontbrekende tabellen overslaat (`do $ ... to_regclass ...`), omdat o.a. `demo_berichten` op productie niet bestaat. Alle tellingen daarna 0. Test-DB idem. Reinier draaide de SQL zelf in de Supabase SQL-editor (directe DELETE via tooling werd door de classifier geblokkeerd, dus voorgekauwd als SQL).

**3. Accounts herinricht op productie.**
`beheer@kluslus.nl` (id `49b3decd-0155-47a8-8a41-b56c6937ed56`) toegevoegd als beheerder/master. `bkm` (id `443dff43-dc74-4216-8173-076f22973245`) gedegradeerd naar monteur. Oude accounts verwijderd (profielen + auth.users): `f0a2a56d` (rk), `adf53350` (mind), `62583097` (shift), `868ad759` (thuphan), `c131f4da` (rls-test). Volgorde bewaakt: eerst beheer@ als beheerder erin, daarna pas bkm degraderen, zodat er nooit nul beheerders waren. De "laatste-beheerder kan niet weg"-bescherming (`telBeheerders() <= 1` in `src/app/api/gebruikers/[id]/route.ts`) is bewust intact gehouden; let op: er is geen bootstrap-mechanisme, dus nooit alle beheerders weghalen of je sluit jezelf permanent buiten.

**4. Rename (alleen labels, refs/keys ongewijzigd).**
Vercel-project `ksv-demo` hernoemd naar `kluslus-productie` (team bkm-s-projects, custom domain `mijn.kluslus.nl` blijft). Supabase-projecten hernoemd naar Productie/Demo/Test. Dit zijn weergavenamen; project-refs en keys veranderen niet, dus code/env onveranderd.

**5. Webhook naar custom domain.**
Resend inbound-webhook (`email.received`) voor productie gezet op `https://mijn.kluslus.nl/api/inbound` (Reinier deed dit). Test-webhook blijft `kluslus-test.vercel.app/api/inbound`.

**6. Omgevingskaart + systeemkaart bijgewerkt.**
Nieuw `docs/systeemkaart/omgevingskaart.html`: de optimale account/rol-indeling over de drie omgevingen, met drie "boompjes" (omgekeerde-boom org-charts, een per omgeving). Bureaublad-snelkoppeling "Kluslus omgevingskaart". `docs/systeemkaart/systeemkaart.html` bijgewerkt (stempel 28-06, test-inbound-stroom, naam kluslus-productie, webhook op mijn.kluslus.nl, auto SW-versie, voetnoot-verwijzing naar omgevingskaart). Beide bestanden staan nu nog **untracked** in de hoofdmap; nog niet in git.

## Verificatie (end-to-end, echt)

Productie-inbound na webhook-wissel + rename getest met een ECHTE mail naar `klus-d8bb2ef92b0158c9@klus.kluslus.nl` (bkm/monteur-inbound-token). Reinier bevestigde: de mail kwam binnen als klus op het productie bkm-monteur-account. Dus de hele keten echte mail -> Resend -> nieuwe webhook op mijn.kluslus.nl -> klus in productie werkt. Test-inbound was eerder al live bewezen.

Na de wipe leek productie eerst "nog vol": dat was de PWA-cache. Na `Ctrl+Shift+R` toonde productie de lege staat (handleiding-scherm = correcte lege staat).

## Nog open (klein, voor Reinier in de app)

- Test-klus van de echte-mail-test verwijderen om de schone lei schoon te houden.
- bkm-monteurgegevens aanvullen: telefoon `+31631665814`, sms aan.
- Minko uitnodigen via beheer@ zodra mail + 06 bekend zijn.
- Test-monteurs (shift/mind) + rk als test-beheerder uitnodigen op kluslus-test.
- De twee kaarten (omgevingskaart + systeemkaart) in git zetten (mini-PR); beide nog untracked.
- Laatste Vercel-token (`ksv-pro`) intrekken.
