# PLAN: invoer-unificatie Part 2

Op basis van `DESIGN-INVOER-UNIFICATIE-2.md`. TDD per taak: test eerst (rood), dan code (groen), dan commit. Rein draait e2e zelf (PowerShell). Bouwen pas op Reins sein, en niet zolang de andere build loopt.

## VOORTGANG (2026-06-14, autonome sessie)
**Af + geverifieerd (tsc schoon, 611 unit-tests groen, lint schoon):**
- ✅ Blok 0 — parser leest PDF én foto (`buildOrderContent`, `parseOrderWithClaude`); parse-endpoint accepteert foto.
- ✅ Blok 1 — pure helpers `order-samenvoegen.ts` (voegSamen/voegMeldingenSamen/andereReferentie) + `invoer-bestemming.ts` (bestemmingVoor).
- ✅ Blok 6 — Gat A (gegevens wijzigen ná versturen markeert) + Gat B (slot bij opgeleverd/geannuleerd).
- ✅ Blok 3.3 (backend) — PATCH + `updateOpdrachtGegevens` accepteren alle velden (e-mail/adviseur/leverweek/werkomschrijving), alleen-indien-meegestuurd.

**Nog te doen (UI + wiring; e2e-verificatie door Rein, daarom bewust niet blind gebouwd):**
- ⬜ Blok 2 — `KlusInvoer`-component (twee staten, order-zone, botsing-UI, kopieer-knopje).
- ⬜ Blok 3.1/3.2 — rol-bewuste create + "Nieuwe klus"-knop dashboard.
- ⬜ Blok 3.3 (UI) — `OpdrachtBewerken` → component op de detailpagina.
- ⬜ Blok 4 — inbound gladtrekken (route.ts; `inbound.ts` niet aanraken).
- ⬜ Blok 5 — monteur-wiring.
- ⬜ Blok 7 — opruimen `InschietZone` + dode paden.

**Let op vooraf:**
- `src/lib/inbound.ts` heeft een openstaande wijziging uit een andere terminal (ontvangstdomein). **Niet aanraken.** We raken wel `src/app/api/inbound/route.ts` (ander bestand).
- Migratie: waarschijnlijk **geen nieuwe kolom** nodig (`werkomschrijving`, `opdrachtgever_id`, `inbound_token` bestaan). Per blok verifiëren; mocht er toch een kolom bij komen, dan op BEIDE Supabase-projecten (test doe ik via `migrate:test`, prod doet Rein).
- Elke afgeronde feature bijwerken in `TESTDEKKING.md`.

---

## BLOK 0 — Parser leest ook een foto (niet alleen PDF)

**Taak 0.1 — Parser accepteert beeld**
- Bestand: `src/lib/claude-client.ts`, `src/lib/parser-schema.ts`
- Test eerst: unit die `parseOrderWithClaude(buffer, mimetype)` aanroept met een image-mimetype en controleert dat het juiste content-block (image vs document) naar de API gaat (API gemockt).
- Code: `parsePdfWithClaude` generaliseren naar `parseOrder` die PDF (document-block) én afbeelding (image-block) aankan; bestaande PDF-pad ongemoeid.
- Verifiëren: unit groen; tsc schoon.
- Tijd: 20 min. Status: open.

**Taak 0.2 — Aanroepers volgen de nieuwe signature**
- Bestand: `src/app/api/opdrachten/route.ts`, `src/app/api/dashboard/inschieten/route.ts`, `src/app/api/inbound/route.ts`
- Test eerst: bestaande route-tests blijven groen na rename/uitbreiding.
- Code: aanroepen aanpassen naar `parseOrder(...)`, mimetype meegeven.
- Verifiëren: unit/route-tests groen.
- Tijd: 15 min. Status: open.

---

## BLOK 1 — Pure logica eerst (samenvoegen, botsing, rol-defaults)

**Taak 1.1 — Samenvoeg-helper (fill-empty, conflict-detectie)**
- Bestand: nieuw `src/lib/order-samenvoegen.ts` (+ test)
- Test eerst: `voegSamen(bestaand, geparset)` → lege velden gevuld, gelijke velden ongemoeid, verschillende velden komen terug als `botsingen[]` met `{veld, bestaand, nieuw}`; werk-veld nooit overschreven; `meldingen` aangevuld niet vervangen.
- Code: pure functie.
- Verifiëren: unit groen.
- Tijd: 25 min. Status: open.

**Taak 1.2 — Rol-bewuste defaults**
- Bestand: nieuw `src/lib/invoer-bestemming.ts` (+ test)
- Test eerst: `bestemmingVoor(rol, profiel)` → monteur: `toegewezen_aan=self`, `opdrachtgever_id=null`, werkpool; kantoor: `opdrachtgever_id=zaak`, `toegewezen_aan=null`, te plannen.
- Code: pure functie.
- Verifiëren: unit groen.
- Tijd: 15 min. Status: open.

**Taak 1.3 — Ref-waarschuwing helper**
- Bestand: `src/lib/order-samenvoegen.ts` (+ test)
- Test eerst: `andereReferentie(klusRef, pdfRef)` → true bij verschil, false bij gelijk/leeg.
- Code: pure functie.
- Verifiëren: unit groen.
- Tijd: 10 min. Status: open.

---

## BLOK 2 — Het gedeelde component (KlusInvoer)

**Taak 2.1 — Componentskelet met twee modi + responsive velden**
- Bestand: nieuw `src/components/KlusInvoer.tsx`
- Test eerst: e2e/unit-render: modus `nieuw` toont lege velden + order-zone groot; modus `bestaand` toont gevulde velden + order-zone als strook. "Meer velden" open op breed, dicht op smal.
- Code: velden (kern + meer-uitklap), werk-veld met `SpraakOpname`, documenten-lijst **boven** de order-invoer.
- Verifiëren: e2e render groen.
- Tijd: 40 min. Status: open.

**Taak 2.2 — Order-invoer: PDF/foto/typen**
- Bestand: `KlusInvoer.tsx`
- Test eerst: e2e: bestand kiezen → parse-call → velden vullen; mobiel toont "Order fotograferen", desktop toont slepen + kiezen.
- Code: order-zone met device-afhankelijke knoppen (camera-capture op mobiel), parse-only call hergebruiken.
- Verifiëren: e2e groen.
- Tijd: 30 min. Status: open.

**Taak 2.3 — Botsing-UI + ref-waarschuwing**
- Bestand: `KlusInvoer.tsx`
- Test eerst: e2e: extra PDF met afwijkend adres → veld toont beide waarden, default = bestaande; afwijkende ref → waarschuwingsbalk.
- Code: botsing-weergave op veldniveau (kiezen), ref-banner; gebruikt `order-samenvoegen`.
- Verifiëren: e2e groen.
- Tijd: 30 min. Status: open.

**Taak 2.4 — Subtiel kopieer-knopje (component, herbruikbaar)**
- Bestand: nieuw `src/components/KopieerKnop.tsx` (+ test)
- Test eerst: e2e: klik → clipboard-call → "Gekopieerd" verschijnt kort.
- Code: ingetogen knopje, `navigator.clipboard`.
- Verifiëren: e2e groen.
- Tijd: 15 min. Status: open.

---

## BLOK 3 — Kantoor-wiring (Ed)

**Taak 3.1 — Create-route accepteert alle velden + rol-bestemming**
- Bestand: `src/app/api/opdrachten/route.ts`, `src/lib/db.ts` (`createOpdracht`)
- Test eerst: route-test: kantoor-create zet `opdrachtgever_id`, geen toewijzing, te plannen; monteur-create zet `toegewezen_aan`, ad-hoc.
- Code: bestemming via `invoer-bestemming`; velden compleet.
- Verifiëren: route-test groen.
- Tijd: 20 min. Status: open.

**Taak 3.2 — "Nieuwe klus"-knop op dashboard**
- Bestand: dashboard-pagina + `KlusInvoer` in modus nieuw
- Test eerst: e2e: knop → leeg component → opslaan → klus in "te plannen".
- Code: knop + route ernaartoe (modal of pagina).
- Verifiëren: e2e groen.
- Tijd: 25 min. Status: open.

**Taak 3.3 — OpdrachtBewerken vervangen door KlusInvoer (bestaand)**
- Bestand: `src/app/dashboard/opdracht/[id]/page.tsx`; PATCH `src/app/api/opdrachten/[id]/route.ts` + `updateOpdrachtGegevens` uitbreiden (e-mail, adviseur, leverweek, werk-omschrijving).
- Test eerst: route-test: PATCH slaat de uitgebreide velden op; e2e: bewerken via component werkt vanaf dashboard én planbord (zelfde detailpagina).
- Code: component in modus bestaand; `OpdrachtBewerken` eruit.
- Verifiëren: route + e2e groen.
- Tijd: 35 min. Status: open.

---

## BLOK 4 — Inbound gladtrekken

**Taak 4.1 — Groeperen op referentie + mailtekst in werk-veld**
- Bestand: `src/app/api/inbound/route.ts` (NIET `inbound.ts`)
- Test eerst: route-test: mail met meerdere PDF's zelfde ref → één klus + meerdere documenten (via `groepeerOpRef`); mailtekst landt in `werkomschrijving`.
- Code: `groepeerOpRef` hergebruiken; body → werk-veld.
- Verifiëren: route-test groen.
- Tijd: 30 min. Status: open.

**Taak 4.2 — Rol-bewuste bestemming + vreemde mail (aandacht)**
- Bestand: `src/app/api/inbound/route.ts`
- Test eerst: route-test: monteur-token → inbox/werkpool-eigenaar; kantoor-token → zaak + dashboard; geen/onleesbare PDF → voorstel met `aandacht` + body als terugval.
- Code: bestemming via `invoer-bestemming`; aandacht-vlag.
- Verifiëren: route-test groen.
- Tijd: 25 min. Status: open.

**Taak 4.3 — Ed/opdrachtgever krijgt een inbound-adres**
- Bestand: `mijn-gegevens` + `ensureInboundToken`-toegang voor rol opdrachtgever
- Test eerst: e2e: opdrachtgever ziet zijn klus-adres met kopieer-knopje.
- Code: `magInbound` uitbreiden naar opdrachtgever; adres tonen + `KopieerKnop`.
- Verifiëren: e2e groen. (Geen migratie: `inbound_token` bestaat al.)
- Tijd: 20 min. Status: open.

**Taak 4.4 — Dashboard "te verwerken"-strook + review via component**
- Bestand: dashboard-pagina; bevestig-flow
- Test eerst: e2e: binnengekomen voorstel staat in strook → openen in `KlusInvoer` bestaand → aanvullen → Bevestigen → schuift naar "te plannen".
- Code: strook (lijst van `te_verwerken` voor de zaak); openen = component; bevestigen zet vlag uit.
- Verifiëren: e2e groen.
- Tijd: 30 min. Status: open.

---

## BLOK 5 — Monteur-wiring

**Taak 5.1 — OpdrachtAanmaken → KlusInvoer (nieuw), landt in werkpool**
- Bestand: monteur-app (waar nu `OpdrachtAanmaken` hangt)
- Test eerst: e2e: monteur maakt order (foto/PDF/typen) → werkpool; keukenzaak als naam, geen dashboard-account.
- Code: `KlusInvoer` modus nieuw, monteur-gezicht (order-zone + camera op mobiel).
- Verifiëren: e2e groen.
- Tijd: 25 min. Status: open.

**Taak 5.2 — Monteur-inbox blijft, opent component (bestaand)**
- Bestand: `inbox/page.tsx`, `InboxItem.tsx`
- Test eerst: e2e: monteur-voorstel openen in component → bevestigen → werkpool.
- Code: blinde bevestig-knop vervangen door link naar component (bestaand).
- Verifiëren: e2e groen.
- Tijd: 20 min. Status: open.

---

## BLOK 6 — Twee gaten dichtmaken

**Taak 6.1 — Gat A: gegevens-wijziging na versturen markeert + notificeert**
- Bestand: PATCH `src/app/api/opdrachten/[id]/route.ts`, `db.ts`, `opdracht-status.ts`
- Test eerst: route-test: gegevens-PATCH op verstuurde klus zet `gewijzigd_te_versturen`; unit: markering-regel.
- Code: PATCH leidt door dezelfde markering-logica als planning (`moetOpnieuwVersturen`).
- Verifiëren: route + unit groen.
- Tijd: 25 min. Status: open.

**Taak 6.2 — Gat B: bewerken blokkeren bij opgeleverd/geannuleerd**
- Bestand: PATCH-route + `KlusInvoer` (lees-modus)
- Test eerst: route-test: PATCH op `opgeleverd`/`geannuleerd` → geweigerd; e2e: component toont alleen-lezen.
- Code: status-guard server + client.
- Verifiëren: route + e2e groen.
- Tijd: 20 min. Status: open.

---

## BLOK 7 — Opruimen (pas als nieuwe weg bewezen werkt)

**Taak 7.1 — InschietZone verwijderen**
- Bestand: `InschietZone.tsx` + dashboard; bulk-drop nu via component/`groepeerOpRef`.
- Test eerst: e2e: meerdere PDF's tegelijk → meerdere klussen in "te plannen".
- Code: oude component eruit, bulk-pad via component.
- Verifiëren: e2e groen; geen dode imports (tsc/lint).
- Tijd: 25 min. Status: open.

**Taak 7.2 — Dode paden opruimen**
- Bestand: `/api/dashboard/inschieten` (ontdubbelen of laten als bulk-endpoint), oude `OpdrachtBewerken`.
- Test eerst: volledige suite groen.
- Code: verwijderen wat niet meer aangeroepen wordt; specifieke git add.
- Verifiëren: tsc + lint + alle tests groen.
- Tijd: 20 min. Status: open.

---

## BLOK 8 — Afronding

**Taak 8.1 — Volledige suite + register + migratie-check**
- Test: `npm run test` (unit), `test:int`, e2e (Rein). `migrate:test` als er toch een kolom bij kwam.
- `TESTDEKKING.md` bijwerken per nieuwe flow.
- Logboek-entry in `07_logboek/`.
- Tijd: 20 min. Status: open.

---

## Bouwvolgorde (afhankelijkheden)
0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Blok 0/1 zijn pure logica (goedkoop, eerst). Component (2) leunt op 1. Wiring (3/4/5) leunt op 2. Gaten (6) los inpasbaar. Opruimen (7) pas na bewezen werking.
