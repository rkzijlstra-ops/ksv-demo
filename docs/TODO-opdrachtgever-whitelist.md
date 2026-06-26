# TODO: opdrachtgever proactief om whitelist vragen (planning@kluslus.nl)

Status: open (2026-06-26). Apart klusje, los van de melding-flow. Prioriteit: laag/midden (vangnet; DMARC/DKIM dragen de aflevering al).

## Aanleiding
Nu verschijnt de "zet planning@kluslus.nl als veilige afzender"-hint pas reactief, ná de eerste
oplever-verzending naar een nieuw domein (`VerzendInfoBlok`, kopieerbare WhatsApp-tekst die de monteur
doorstuurt). Wens van Reinier: bij een NIEUWE opdrachtgever dit meteen meegeven, vóórdat de monteurs
gaan opleveren, zodat de eerste rapporten niet in de spam belanden.

## Gekozen aanpak: Optie A (automatisch, op de uitnodigingsmail)
Voeg, alleen voor rol **opdrachtgever**, een regel toe aan de bestaande uitnodigingsmail
(`uitnodigingTekst` in `src/lib/uitnodig-mail.ts`, verstuurd via `POST /api/mensen/uitnodigen`):

> "Onze opleverrapporten komen van planning@kluslus.nl. Zet dit adres alvast als veilige afzender
> (contact), dan komen ze meteen in je inbox in plaats van de spam."

Mooi meegenomen: de uitnodiging komt al vanaf planning@kluslus.nl (RESEND_FROM), dus als de ontvanger
de afzender van die mail goedkeurt, zit het meteen goed voor de latere rapporten.

Belangrijk: de app kan het whitelisten niet vóór ze doen (dat gebeurt in hún mailbox, verschilt per
provider). Dit is dus een duidelijke, vroege INSTRUCTIE, geen automatische instelling.

## Werk (test-first)
- Unit: `uitnodig-mail.test.ts` uitbreiden: voor rol `opdrachtgever` bevat de tekst planning@kluslus.nl
  + "veilige afzender"; voor rol `monteur`/`beheerder` NIET (die leveren niet op naar een zaak-domein).
- Implementatie: regel toevoegen in `uitnodigingTekst`, alleen bij `rol === "opdrachtgever"`.
- Registers (`TESTDEKKING.md`) bijwerken.

## Optioneel later: Optie B
Kopieerbaar "whitelist-uitleg"-knopje bij de opdrachtgever in gebruikersbeheer, voor opdrachtgevers die
je niet als account uitnodigt maar wel rapporten ontvangen. Niet nu.

## Buiten scope
Optie C (welkom-scherm bij eerste login van de opdrachtgever): minder betrouwbaar, want werkt pas als
ze inloggen, mogelijk ná de eerste rapporten.
