# 2026-06-02 KSV demo-app: limieten-check, foto-telling en handtekening-bug

Sessie over de monteur-PWA (`01_projecten/keukenstudio-voorschoten-demo`). Reinier dirigeerde, Claude voerde uit. Drie onderwerpen: limieten van Resend/Supabase, een verkeerde foto-telling in het rapport, en een verdwenen handtekening.

## Limieten Resend en Supabase (onderzoek, geen actie)

Vraag was of Resend en Supabase geupgraded moeten worden om "de limieten eraf te halen".

- **Resend:** upgraden niet nodig. Het echte knelpunt is dat de app nu `onboarding@resend.dev` als afzender gebruikt; daarmee kun je alleen naar je eigen account-adres mailen. Naar klanten/Ed mailen = een eigen domein verifieren, dat is **gratis** op het free plan. Aantallen (100/dag, 3.000/maand) zijn voor een demo ruim zat.
- **Supabase:** voor een demo is free genoeg. Twee echte grenzen: gratis projecten **pauzeren na 7 dagen** inactiviteit, en de **upload-limiet is 50 MB per bestand** (niet te verhogen op free). Dat laatste is de "videolengte"-grens die Reinier voelde. Pro (25/maand per project) haalt de pauze weg, geeft dagelijkse backups en uploads tot 500 GB per bestand.
- **Conclusie:** voor een demo niks upgraden. Zodra Ed het systeem zelfstandig gaat gebruiken is Supabase Pro wel logisch, vooral om backups en uptime, niet om de video. Reinier regelt die upgrade zelf voor de go-live.

## Foto-telling in het rapport gesplitst (gefixt)

De badge bovenaan het opleverrapport telde alleen de eindstaat-foto's, niet de foto's die per melding hangen, terwijl die wel in het document staan. Getal en inhoud liepen uiteen (7320 toonde "0 foto's" bij 4 foto's; 7636 "2 foto's" bij 6).

Keuze Reinier: twee aparte getallen. Badge toont nu `X eindstaat-foto's`, en de meldingen-kop toont het aantal meldingfoto's (`Meldingen (3) · 4 foto's`). Pure functies `eindstaatFotoLabel` en `meldingenKop` in `src/lib/rapport.ts`, met tests.

## Handtekening-bug (gevonden, gefixt, hersteld)

Reinier had bij de laatste 7636-oplevering de klant laten tekenen, maar in de app stond geen handtekening. Geen vergissing: bewijs uit de data toonde dat de handtekening op 1 juni 08:41:30 was geupload (9 sec voor opleveren), maar het verzonden rapport zei "Niet ondertekend". De handtekening-afbeelding hing aan geen enkele oplevering (verweesd).

**Root cause:** de handtekening was het enige oplever-veld dat niet als gewoon veld werd behandeld. De tussentijdse opslag (`bewaarConcept`) stuurde `handtekening_url` niet mee, de route zette een ontbrekend veld op null, en de db-laag schreef het altijd mee. Gevolg: elke tussenopslag na het tekenen overschreef de handtekening met null (race met de verstuur-actie). Bovendien werd de handtekening niet hersteld bij terugkeren in de flow.

**Fix (twee niveaus, met tests):**
- Server (vangrail): een opslag zonder `handtekening_url` laat het veld voortaan ongemoeid; expliciet null blijft wissen. In `src/lib/db.ts` (`upsertOpleveringConcept`) en `src/app/api/opdrachten/[id]/oplevering/route.ts`.
- Client: handtekening wordt nu meteen bij "Klaar" geupload, in elke tussenopslag meegestuurd en hersteld bij terugkeren, net als foto's en video. In `src/components/OpleverFlow.tsx`.
- Verificatie: 233 tests groen (6 nieuw), lint schoon, `next build` compileert.

**Herstel:** de verweesde handtekening van 7636 is teruggekoppeld aan de oplevering (database-actie). Het al verzonden Gmail-rapport blijft "Niet ondertekend" tonen; opnieuw versturen hoefde van Reinier niet (hij upgradet en regelt het voor de go-live).

## Testopdrachten opgeruimd

Veel dubbele test-opdrachten waren al door Reinier soft-deleted. Resterend opgeruimd: 66676 ("Test") en 192945 (familie Schadde). Eindstand: alleen de drie echte opdrachten actief, 7320, 7407 (in uitvoering) en 7636. Soft-delete is omkeerbaar via de prullenbak.
