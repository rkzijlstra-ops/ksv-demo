# Uitnodig-flow gladtrekken + SMS-vangnet (2026-06-29)

## Aanleiding
Een uitgenodigde monteur (Thu) kreeg twee mails: de uitnodiging belandde in de **spam**, de Supabase
magic-link in de **inbox**. Onderzoek (DNS + code):

- Authenticatie kluslus.nl is gOED: DKIM tekent `d=kluslus.nl`, aligned, DMARC (`p=reject; adkim=s;
  aspf=s`) slaagt via DKIM. De mail wordt niet geweigerd, het is geen auth-fout.
- Spam-oorzaak = reputatie + merk + inhoud, niet techniek:
  1. kluslus.nl is een koud, nieuw verzenddomein (sinds ~21 juni). Supabase' magic-link rijdt op een
     jarenlang warme infrastructuur → inbox.
  2. Afzender-naam "Keukenstudio Voorschoten" botst met domein kluslus.nl (phishing-signaal voor filters).
  3. Dunne, link-zware inhoud zonder context.

## Beslissingen (door Rein)
1. Afzender-naam wordt **"&lt;zaak&gt; via Kluslus"** (herkenbare zaaknaam + domein-merk erachter). De
   monteur kent Kluslus niet, dus de zaaknaam moet prominent; "via Kluslus" lost de naam/domein-mismatch op.
2. Magic-link blijft via **Supabase** (komt in de inbox, niet aanraken).
3. **SMS-vangnet** als er een 06 bekend is. Geen inloglink in de SMS (gevoelig); de SMS is de duw naar
   `/login`, waar de monteur zelf een magic link aanvraagt (die de inbox haalt). Korte uitleg bij het
   06-veld dat invullen aanbevolen is.

## Scope
- Wel: uitnodig-mail (afzender + inhoud), afmelding (zelfde afzender, tegenhanger), SMS-vangnet bij
  uitnodigen, 06-veld + uitleg in het formulier, 06 normaliseren + opslaan op profiel.
- Niet nu (bewust open): de overige opdracht-mails (annulering/ontplanning/herinnering/document/
  terugmelding) gebruiken nog de kale afzender. Magic-link template-toon. Eigen verzenddomein per zaak.

## Levenscyclus / tegenhangers
- Uitnodigen ↔ afmelden: beide bestaan, beide krijgen de "via Kluslus"-afzender.
- 06 ontbreekt → alleen mail, geen SMS (smsGevraagd=false). 06 ongeldig → idem, niets weggeschreven.
- 06 bestond al op profiel + uitnodiging zonder 06 → bestaand nummer blijft ongemoeid (upsert raakt
  alleen aangeleverde kolommen).
- Mail faalt / SMS faalt: best-effort, los van elkaar, account blijft staan.

## Teststrategie
- Unit: uitnodig-mail (zaaknaam-prominent), mail (From-naam uitnodiging + afmelding), uitnodig-sms (tekst),
  uitnodigen/route (06-paden: normaliseren, opslaan, SMS, ongeldig, SMS-fout).
- Het live SMS-pad keurt Rein handmatig op de test-omgeving (eigen 06, allowlist).
- 06-veld in het formulier: optioneel veld, logica gedekt door route/unit; visuele check door Rein.

## Bestanden
- `src/lib/uitnodig-mail.ts` (inhoud), `src/lib/mail.ts` (`lidmaatschapAfzender`), `src/lib/uitnodig-sms.ts`
  (nieuw), `src/lib/notificaties.ts` (`smsAfzender` geëxporteerd), `src/lib/db.ts` (ProfielInput.telefoon
  + upsert), `src/app/api/mensen/uitnodigen/route.ts`, `src/components/UitnodigForm.tsx`.
