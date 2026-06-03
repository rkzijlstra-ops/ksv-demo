# Compleet systeem blok 4: mail naar monteurs

Datum: 2026-06-03
Project: KSV demo-app
Hoort bij: `DESIGN-COMPLEET-SYSTEEM.md` (Communicatie)

## Wat gebouwd is

De verstuur-poort verstuurt nu echt mail (via Resend, zat al in het project), naast de bestaande
statussprong.

- **Per opdracht (jouw keuze):** een envelop-knop op de kaart, alleen zichtbaar als de opdracht
  nog te versturen is (concept of gewijzigd). Klikken mailt die ene opdracht naar de toegewezen
  monteur en zet hem op gepland; de knop verdwijnt dan. Op de planbord-kaart (rechtsboven) en op
  de dashboard-kaart.
- **Gebundeld:** "Verstuur naar monteurs" mailt nu echt, gebundeld per monteur (één mail per
  monteur met al zijn opdrachten van die ronde), en zet de status.

## Bouwstenen

- `src/lib/monteur-mail.ts` (+ test): pure `monteurMailTekst` (onderwerp + tekst, 1 of meer
  opdrachten, met klant/ref/adres/type/wanneer/melding).
- `src/lib/mail.ts`: `verstuurMonteurMail` (Resend-wrapper).
- `POST /api/opdrachten/[id]/mail-monteur` (+ test): mail één opdracht + status gepland.
- `POST /api/dashboard/versturen` (uitgebreid, + test): mailt gebundeld per monteur + status.
- `src/components/MailMonteurKnop.tsx`: de envelop-knop (stopt klik/sleep naar de kaart).

## Ontvanger (demo-constraint)

De mail gaat naar `RAPPORT_EMAIL` (jouw eigen adres; Resend levert in testmodus alleen daar af),
met de monteurnaam in de tekst. Die env stond al ingevuld voor het opleverrapport. Zodra er echte
monteur-accounts en een geverifieerd verzenddomein zijn (blok 6 / go-live), wordt de ontvanger
het adres van de monteur zelf. Geen codewijziging aan de kern nodig (de naad zit in de route).

## Verificatie

- `npm test`: 328 groen (was 319, +9).
- `npm run build`: slaagt. Geen SQL-migratie nodig.
- Voorwaarde voor live mailen: `RAPPORT_EMAIL` en `RESEND_API_KEY` ingevuld in Vercel-env.

## Vervolg

Blok 5: opdrachtgever-detailpagina (leesweergave rapport + keukenhistorie, terug-naar-dashboard).
Blok 6: accounts/rollen per monteur en zaak (dan echte monteur-mailadressen).
