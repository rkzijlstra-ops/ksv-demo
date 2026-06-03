# KSV Demo - Sessie 2A gebouwd (monteur-flow)

Datum: 2026-05-28
Project: `01_projecten/keukenstudio-voorschoten-demo`
Doel sessie 2A: monteur kan op telefoon een complete melding maken binnen een opdracht
Duur: lange sessie (meerdere blokken), ~91 tests groen aan het eind

## Wat is gebouwd

Voortbouwend op de backend van sessie 1, nu de hele monteur-kant met UI:
- **Design-system** via skill `ui-ux-pro-max`: stijl Accessible & Ethical + Minimal/Flat, high-contrast light, Lexend + Source Sans 3, grote tap-targets (56px+), urgentie altijd icoon + label (niet kleur-alleen). Tailwind v4 + lucide-react. Vastgelegd in `design-system.md`.
- **Werkbak** (`/`): lijst van opdrachten, actief bovenaan + inklapbare history, urgentie/bron-badges, aanmaak- + uitvoerdatum (korte NL-datum `formatDatumKort`).
- **Opdracht-detail** (`/opdracht/[id]`): klantgegevens, nav-knop (Android geo: / iPhone Google Maps), bel-knop (tel:, alleen bij telefoonnummer), datums, artikelen uit PDF, en de gekoppelde monteur-meldingen met foto's.
- **Melding maken** binnen een opdracht: urgentie (rood/geel), tekst typen of inspreken (Whisper), foto's maken (camera + client-side compressie naar Supabase Storage), opslaan als concept of verzenden.
- **Melding bewerken + versie-nummering** (H6): verzonden melding heropenen, wijzigen, opnieuw verzenden. Versie hoogt op (v2, v3, ...), aanpassing-op-aanpassing telt door. Label "Verzonden · aangepast (v2)".
- **PDF-upload-knop** op de werkbak (tijdelijke opdracht-bron tot Gmail in 2B).
- Datamodel uitgebreid: `status`, `aangepast`, `verzonden_at`, `foto_urls`, `klant_telefoon`, `uitvoerdatum`, `opdracht_id`, `versie`. Storage-bucket `meldingen-fotos`.
- Nieuwe API-routes: `/api/upload-foto`, `/api/transcribe` (OpenAI Whisper), `/api/meldingen` (POST + PATCH).

## Belangrijke koers-correctie (door Rein, na hands-on test)

**Principe: alles gebeurt binnen één opdracht.** Aanvankelijk had ik een losse "Nieuwe melding"-knop op de werkbak; dat leverde losse "Onbekende klant"-meldingen op. Rein corrigeerde: een melding hoort altijd bij precies één opdracht, foto's en spraak horen bij die opdracht, niets staat los. Refactor: `opdracht_id` toegevoegd, melding-ingang verplaatst naar het opdracht-detail, werkbak toont alleen opdrachten. Vastgelegd als hard ontwerpprincipe in geheugen.

## Bugs opgelost (systematic-debugging)

- **Foto-upload + verzenden werkten niet op telefoon.** Eén gedeelde root cause: Next.js 16 blokkeert cross-origin dev-resources van het LAN-IP, wat de client-side fetches lamlegde. Diagnose via de server-log (geen POST kwam aan = client-probleem). Fix: `allowedDevOrigins: ["192.168.1.161"]` in next.config. Loste beide tegelijk op. Zonder de log-evidence had ik waarschijnlijk twee verkeerde aparte fixes geprobeerd.

## Geleerde lessen (in geheugen vastgelegd)

- **Mobiel dev:** `allowedDevOrigins` vereist voor LAN-toegang; `getUserMedia` (spraak/camera-stream) vereist HTTPS — werkt niet op `http://LAN-IP`. Daarom werkt spraak nog niet op de telefoon.
- **Vitest:** rejected promises in `vi.fn`-mocks geven een false-positive "unhandled rejection" met `beforeEach`. Opgelost door mock-gedrag via gewone async functie + handmatige call-teller (i.p.v. `vi.fn`) in route-tests.
- **Supabase:** nieuwe kolommen + storage-bucket via SQL; RLS bewust uit in demo.

## Geparkeerd

- **Spraak op telefoon** vereist HTTPS. Te regelen in sessie 2B of demo-voorbereiding (`next dev --experimental-https`, tunnel, of Vercel-deploy).

## Volgorde na 2A (door Rein vastgelegd)

1. **Zelf-gebruik fase**: Rein gebruikt de PWA voor echte KSV-opdrachten en debugt wat hapert. Niet verder bouwen tot hij tevreden is.
2. **Sessie 2A.5**: authenticatie (Supabase Auth), RLS aanzetten met policies, account voor collega. Pas op Reins signaal.
3. **Daarna sessie 2B** (Gmail) en de rest.
- Nieuwe code wordt toekomstvast gebouwd voor `user_id` + `toegewezen_aan` (geen herschrijf nodig bij 2A.5).

## Stand database

Schoongemaakt aan het eind: één voorbeeld-opdracht (J. Jansen, ref 7444, met adres/telefoon/uitvoerdatum), geen meldingen. Klaar om vers te gebruiken en straks aan Ed te tonen.

## Conclusie

De monteur-flow werkt end-to-end op de telefoon (behalve spraak, dat wacht op HTTPS). Demo is een groot stuk verder: een monteur kan een opdracht openen, navigeren, bellen, en een melding met foto's maken/bewerken. Volgende stap is geen bouwsessie maar echt gebruik in de praktijk.
