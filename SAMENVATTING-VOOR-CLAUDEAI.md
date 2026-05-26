# Mini-demo Keukenstudio Voorschoten - Samenvatting voor Claude.ai

Datum: 2026-05-24
Gebruik: kennisbron voor Claude.ai chat tijdens bouwen demo

## Achtergrond

Rein is ZZP keukenmonteur (€50/u ex btw, AD). Bouwt naast keukenwerk een AI-implementatie voor MKB als tweede been. Doel: 5000/maand binnen jaar 1 bij 4-5 klanten.

Eerste klant: Keukenstudio Voorschoten in Voorschoten. Twee eigenaren, drie verkopers, pool van 10 monteurs (6-7 actief). Volume: 3+ keukens nazorg per week. Rein is zelf monteur bij die zaak.

Ed (mede-eigenaar, vriend van Rein) coördineert nazorg én verkoopt. Raakt overbelast. Informatie komt uit meerdere bronnen (mail, telefoon, app, monteurs), draad raakt kwijt, dingen worden vergeten.

## Probleem dat de demo aanstipt

Drie hoofdstromen die nu rommelig lopen:
1. Klus-info heen (Ed → monteur)
2. Melding terug (monteur → systeem)
3. Planning-aanpassingen (Ed → monteur, soms last-minute)

PDFs van de zaak zijn gestructureerd (klant, ref-nr, "Uw melding" per artikel met Keller-codes). AI kan ze foutloos uitlezen.

## Wat de demo doet

**Monteur-kant (PWA op telefoon):**
- Foto uploaden
- Spraak inspreken of tekst typen
- Urgentie kiezen (rood = direct, geel = achteraf)
- Verzenden

**PDF-kant:**
- PDF wordt verwerkt door AI
- Klantgegevens, referentienummer, melding eruit gehaald
- Verschijnt als klus in dezelfde lijst

**Ed's kant (laptop):**
- Samengevoegde lijst van meldingen en klussen
- Foto's zichtbaar
- Urgentie kleur-gecodeerd
- Bron zichtbaar (monteur vs PDF)
- Live updates zonder verversen

## Wat de demo NIET doet

- Geen login of accounts (voor demo niet nodig)
- Geen status-flow (besteld/binnen/klaar)
- Geen planning-functie
- Geen klant-communicatie
- Geen native app (PWA volstaat)
- Geen Keller-koppeling (bestelling blijft mensenwerk)
- Geen integratie met andere systemen

## Stack-keuzes

**Frontend en backend:** Next.js (TypeScript)
**Database, file storage, real-time:** Supabase
**Hosting:** Vercel (gratis-tier voor demo)
**AI:** Claude API (spraak-naar-tekst, PDF-verwerking, melding-structurering)
**App-vorm:** PWA (Progressive Web App)
**Codebase:** vanaf nul in `c:\Users\rkzij\Mainframe\01_projecten\keukenstudio-voorschoten-demo\`

**Onderbouwing PWA:**
- Werkt als app op telefoon (op startscherm zetten, full-screen)
- Geen App Store-gedoe
- Geen aparte builds voor iPhone en Android
- Voor MKB-use-case ruim voldoende
- Native app eventueel later mogelijk, 60-70% code blijft hergebruikbaar

**Onderbouwing Next.js + Supabase + Vercel:**
- Meest populaire moderne combinatie
- Claude Code is hier het sterkst in
- Supabase neemt veel werk weg (database, storage, auth, real-time)
- Vercel hosting goedkoop en snel voor PWA's
- Toekomstbestendig voor versie 1 en volgende klanten

## Werkwijze: eigen projectstart-discipline skill

UPDATE 2026-05-25: Superpowers-installatie mislukt. Eigen skill projectstart-discipline gemaakt in c:\Users\rkzij\.claude\skills\projectstart-discipline\SKILL.md die de kern van Superpowers nabootst (brainstorm, plan, TDD, review).

Werkwijze:
1. Nieuwe Claude Code sessie openen voor bouw-sessie
2. Skill laadt automatisch
3. Typ "ik wil sessie X starten" en de skill activeert
4. Claude Code stelt brainstorm-vragen
5. Bij twijfel: in claude.ai chat overleg vragen

Strategie: sterke voorkeur geven, bij twijfel "kies meest waarschijnlijke" met motivatie.

## Bouwtijd-inschatting

11-19 uur totaal, verdeeld over 3-4 sessies:

**Sessie 1:** Backend opzetten, AI-koppelingen, PDF-uitlezen werkend (3-5 uur)
**Sessie 2:** Telefoon-input PWA (foto, spraak, urgentie, verzenden) (3-5 uur)
**Sessie 3:** Ed's lijst-weergave met live updates (3-5 uur)
**Sessie 4:** Polijsten, PWA-config, testen op telefoon, demo-scenario (2-4 uur)

Tussen sessies: testen, verfijnen.

## Hergebruik voor echte versie 1

Geschat 70-80% van demo-code is direct herbruikbaar voor versie 1:
- AI-integratie (spraak-naar-tekst, melding-structurering, PDF-uitlezen)
- Foto-upload functionaliteit
- Database-structuur basis
- Architectuur-keuzes
- Persoonlijke ervaring met stack

## Demo-scenario voor gesprek met Ed

1. Open trc-platform op laptop, 1-2 min laten zien wat al gebouwd is
2. Open mini-demo, geef Ed eigen telefoon
3. Laat hem zelf foto maken, iets inspreken ("Front bovenkast linksdraaiend bij klant Jansen, beschadigd, nabestellen"), geel kiezen, verzenden
4. Laptop: melding verschijnt live in lijst
5. Laat zien hoe één van zijn eigen PDFs (bv ref 6203) ook verwerkt wordt en in dezelfde lijst verschijnt
6. "Dit is de kern. Niet meer, niet minder voor versie 1. Wat denk je?"

## Verdienpotentieel-context

Voor het echte systeem (versie 1) bij Ed:
- Inrichtingsfee: €2.500-€3.500 eenmalig
- Maandbedrag: €150-€250/maand
- Uitbreidingen: €75-€100/uur

## Rein's voorkeuren

- Nederlands, je-vorm
- Direct, geen wollig taalgebruik
- Geen em-dashes (komma's of herschrijven)
- Bij belangrijke beslissingen niet doorgaan zonder bevestiging
- Geen verkeerde aannames over wat is besloten

## Open punten

- Sessie 1 plannen (vandaag start Rein)
- Eerste gesprek met Ed plannen
- Backup-structuur voor de Mainframe regelen
- Domeinnaam voor demo (kan vercel.app subdomein zijn)
- Evaluatie achteraf: Superpowers voor versie 1 wel/niet?
