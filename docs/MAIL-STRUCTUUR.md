# E-mailstructuur KlusLus (en BKM) — vooruit gedacht voor groei

Doel: nu één keer goed kiezen zodat we bij groei niet hoeven te verbouwen. Vastgelegd 2026-06-21.

## Principes

1. **Rol-adressen voor functies** (info, antwoord, planning, support). Die blijven kloppen, ook als je
   later iemand aanneemt. Geen naam-adres als hoofd-adres.
2. **Naam-adressen voor personen** (reinier@, later per medewerker).
3. **Aliassen waar het kan, postbussen alleen waar nodig.** Google Workspace rekent per POSTBUS
   (~€6,50/maand). **Aliassen zijn gratis.** Dus: nu één postbus, alle rol-adressen als alias erin.
   Pas een eigen postbus maken als er echt een aparte persoon of inbox bij hoort.

## Domein kluslus.nl — de adressen

| Adres | Rol | Nu |
|---|---|---|
| `info@kluslus.nl` | Algemeen/openbaar contact, website, vragen. **Hoofd- + admin-account.** | postbus |
| `antwoord@kluslus.nl` | Waar antwoorden van klanten op de app-mails (rapporten) binnenkomen. Reply-To van de app. | alias → info@ |
| `planning@kluslus.nl` | Afzender van de app (rapporten/notificaties gaan hiervandaan, via Resend). | alias → info@ |
| `support@kluslus.nl` | Klantvragen zodra je gebruikers hebt. | alias → info@ (later eigen postbus) |
| `administratie@kluslus.nl` | Boekhouding/facturen. | later |
| `reinier@kluslus.nl` | Jouw persoonlijke correspondentie. | optioneel nu |

Bij groei: een alias "promoveren" tot eigen postbus (nieuwe gebruiker) wanneer er een persoon of een
echt aparte inbox bij hoort. De adressen zelf veranderen nooit, alleen waar ze binnenvallen.

## Subdomeinen kluslus.nl — web en app-mail naast elkaar

| Naam | Wijst naar | Niet aanraken? |
|---|---|---|
| `kluslus.nl` / `www.kluslus.nl` | Toekomstige marketing-website | — |
| `mijn.kluslus.nl` | De app (Vercel, 216.150.16.193) | **A-record intact laten** |
| `klus.kluslus.nl` | App-inbound (mail-naar-app, Resend/AWS) | **MX NIET aanraken** |

Belangrijk: web (A/CNAME) en mail (MX) op hetzelfde domein bijten elkaar niet. De Workspace-MX op
`kluslus.nl` blokkeert een latere website op `kluslus.nl` niet, en omgekeerd.

## kluslus.com

Doorsturen naar `.nl` (web). Geen aparte mail; één merk-adres op `.nl` houdt het simpel.

## BKM Keukenmontage (apart merk, los traject)

BKM is een ander merk dan KlusLus, dus een eigen domein (bv. `bkmkeukenmontage.nl`), niet onder
kluslus.nl hangen. Google Workspace kan **meerdere domeinen in één account** (secundair domein). Zo
houd je BKM en KlusLus gescheiden in uitstraling, maar betaal je niet dubbel voor een tweede account.
Nu nog op Gmail; later het BKM-domein als tweede domein toevoegen. Aparte beslissing, niet vermengen.

## App-instellingen (Vercel-env) — omzetten zodra Workspace draait

- `RESEND_FROM` = `planning@kluslus.nl` (blijft; uitgaande app-mail via Resend).
- `RESEND_REPLY_TO` = `antwoord@kluslus.nl` (nu nog een Gmail → omzetten).
- `RAPPORT_EMAIL` / bestemming van rapporten-leads = `antwoord@kluslus.nl` (of een eigen `leads@`),
  nu nog een Gmail.

Uitgaand blijft dus Resend; Workspace doet alleen het ontvangen. Die twee staan los van elkaar.

## Startpunt (minimaal, nu)

1. Eén Workspace-postbus: `info@kluslus.nl` (= admin).
2. Aliassen erop: `antwoord@`, `planning@`, `support@`.
3. App-env omzetten naar `antwoord@kluslus.nl` zodra ontvangen bevestigd is.

Eén postbus, ~€6,50/maand, alle rol-adressen vallen daarin. Groeit het, dan splitsen we gericht.
