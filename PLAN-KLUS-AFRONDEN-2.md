# Klus afronden - Plan 2 (zaak-kant) - Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** De zaak ziet een afgeronde klus op het dashboard en velt het eindoordeel (Akkoord klaar / Toch nog open). Heropenen en het vervolg-vinkje laten de klus terugkomen als "nog te plannen", met behoud van de historie.

**Architecture:** Overlay-badges op de dashboard-kaart (analoog aan "Teruggemeld"), twee db-functies (`heropenen`, `akkoordAfgerond`), twee API-endpoints, en het hergebruik van de bestaande `ontplanOpdracht` om een klus terug naar "te plannen" (`dashboard_status: "binnen"`, planning leeg) te zetten met behoud van alle meldingen/oplevering.

**Tech Stack:** Next.js 16, TypeScript, Supabase, Vitest, Playwright.

---

## Ontwerpkeuzes (uit de verkenning, ter bevestiging)

De afrond-status is een **overlay** naast de bestaande `dashboard_status` (net als "Teruggemeld"), niet een nieuwe enum-waarde. Dat houdt de migratie licht. Daaruit volgen drie getoonde toestanden:

1. **Afgerond** (monteur meldde afgerond, vinkje UIT, zaak nog niet akkoord): groene overlay "Afgerond". Klus blijft op het dashboard met de twee oordeel-knoppen. De monteur ziet hem in zijn geschiedenis.
2. **Vervolg te plannen** (monteur meldde afgerond, vinkje AAN): de klus wordt meteen teruggezet naar "te plannen" (hergebruik `ontplanOpdracht`: `dashboard_status: "binnen"`, planning + toewijzing leeg), historie behouden. Overlay "Vervolg te plannen". Hij verdwijnt vanzelf uit de werkpool van de monteur (niet meer toegewezen).
3. **Afgehandeld** (zaak gaf "Akkoord, klaar"): nieuwe kolom `afgerond_akkoord_at`. Overlay "Afgehandeld". De klus archiveert na 14 dagen, net als een opgeleverde klus.

**Keuze die ik wil bevestigen:** "Akkoord, klaar" zet GEEN `dashboard_status: "opgeleverd"` (want er is geen volledig rapport), maar markeert via `afgerond_akkoord_at`. Zo blijft jouw onderscheid Afgerond/Opgeleverd zuiver. Voor het archiveren breid ik de dashboard-scoping uit zodat een klus met `afgerond_akkoord_at` ook na 14 dagen wegvalt.

**Heropenen** (zaak via "Toch nog open", of monteur): hergebruikt `ontplanOpdracht` + wist de afrond-velden. Terug naar "te plannen", historie behouden.

## Datamodel (nieuw)
- `afgerond_akkoord_at timestamptz` op `meldingen` (zaak keurde de afronding goed).

## Bestanden
- **Create:** `supabase/schema-afronden-2.sql` (kolom `afgerond_akkoord_at`).
- **Modify:** `src/lib/db.ts` - veld + functies `heropenen(id)`, `akkoordAfgerond(id)`.
- **Modify:** `src/app/api/opdrachten/[id]/afgerond/route.ts` - bij `vervolgNodig` ook `ontplanOpdracht` aanroepen.
- **Create:** `src/app/api/opdrachten/[id]/heropenen/route.ts` (zaak + monteur).
- **Create:** `src/app/api/opdrachten/[id]/akkoord-afgerond/route.ts` (zaak).
- **Modify:** `src/lib/opdracht-status.ts` of een nieuwe helper - afgeleide afrond-status (Afgerond / Vervolg te plannen / Afgehandeld) voor de badge.
- **Modify:** `src/lib/dashboard-scope.ts` - klussen met `afgerond_akkoord_at` ouder dan 14 dagen archiveren.
- **Modify:** `src/lib/werkpool.ts` - `afgerond_door_monteur_at` → geschiedenis voor de monteur.
- **Modify:** `src/components/OpdrachtDashboardCard.tsx` - overlay-badge(s).
- **Create:** `src/components/AfgerondKeuren.tsx` - twee oordeel-knoppen op de kantoor-detailpagina.
- **Modify:** `src/app/dashboard/opdracht/[id]/page.tsx` - toon afrond-info + `AfgerondKeuren`.
- **Create:** `e2e/afgerond-zaak.spec.ts` - zaak keurt goed / heropent.

## Taken (kort; exacte code per taak in de uitvoering)
1. Migratie `afgerond_akkoord_at` + draaien op test-DB.
2. db: veld + `heropenen` + `akkoordAfgerond` (+ Db-interface).
3. afgerond-API: bij `vervolgNodig` → `ontplanOpdracht`.
4. API-routes `heropenen` + `akkoord-afgerond` (rol-check: heropenen mag monteur (toegewezen) en zaak (opdrachtgever/beheerder); akkoord mag zaak).
5. Afgeleide afrond-status-helper + unit-test.
6. dashboard-scope: archiveren op `afgerond_akkoord_at`.
7. werkpool: afgerond → geschiedenis monteur.
8. dashboard-kaart: overlay-badges.
9. `AfgerondKeuren` + kantoor-detailpagina (toon notitie/foto + twee knoppen).
10. e2e zaak-kant.

## Testen
- Unit: afgeleide afrond-status; scope-archivering op afgerond_akkoord_at.
- E2e: zaak ziet "Afgerond" + keurt goed → "Afgehandeld"; zaak "Toch nog open" → klus terug naar "binnen"/te plannen met historie; monteur-afgerond met vinkje → te plannen.
