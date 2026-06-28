# Inbound op test: lege klussen door send-only Resend-key + geneste-forward opschoner

Datum: 2026-06-28. Aanleiding: melding van monteur Peter Keijzer dat een naar de testomgeving doorgestuurde mail (Ed, "Dinsdag", 19 juni) een lege klus opleverde. Vraag: "is de parser wel gebouwd op deze account of alleen de mailkoppeling?"

## Diagnose

In de test-DB stonden twee lege klussen (15:32 en 15:34): geen werkomschrijving, geen klant/adres/referentie, en 0 documenten in de hele test-DB. De koppeling werkte dus wel (token herkend, klus aangemaakt), maar de inhoud niet.

De `email_id`'s uit `inbound_verwerkt` opgepakt en de exacte ophaalcall nagedaan met de test-key:

```
resend.emails.receiving.get(emailId)
-> 401 restricted_api_key: "This API key is restricted to only send emails"
```

Oorzaak: de `RESEND_API_KEY` op kluslus-test was een "sending only"-key. `receiving.get` (haalt body + bijlagen) faalde daardoor met 401, de code viel terug op de schrale webhook-payload (geen tekst, geen bijlagen) en maakte zo een lege klus. De AI-parser (`parseOrderWithClaude`) draait alleen op een PDF-bijlage en kwam dus nooit aan de beurt. De parser zelf en de mailkoppeling waren niet stuk; de tussenstap (mailinhoud ophalen uit Resend) was het.

## Fix 1: Resend-key op test

Nieuwe Resend-key met Full access aangemaakt, gezet als `RESEND_API_KEY` op het Vercel-project kluslus-test (Production + Preview), en het project opnieuw uitgerold. Verificatie: een verse doorgestuurde mail leverde een volledig gevulde klus op (klant De heer Donker, Schoenerwal 11 Leiden, ref 7695, telefoon/e-mail, adviseur Ed de Jong, keukenzaak KSV, met document-7695.pdf + image001.jpg gekoppeld). Productie-inbound was niet geraakt; die had al een volledige key. De twee lege testklussen zijn opgeruimd.

## Fix 2: opschoner voor meervoudig doorgestuurde mail (deze commit)

Bij die verificatie viel op dat de werkomschrijving alleen "---------- Forwarded message ---------" toonde. Reden: de mail was zesvoudig genest doorgestuurd (Fwd: Fwd: ...) met halverwege nog een losse notitie ("MVG Peter Keijzer."). `schoonOmschrijving` pakte de eerste doorgestuurde body en bleef op de geneste doorstuur-koppen hangen.

Aangepast in `src/lib/mail-schoon.ts`, stap 2: pak nu de DIEPSTE doorgestuurde body (spring naar de LAATSTE doorstuur-marker, sla het aansluitende header-blok over) en filter eventuele marker-regels uit de body. Zo blijft het oorspronkelijke bericht over, niet de kale marker of een tussennotitie. Getest tegen de echte geneste mail: levert nu Ed's "Hoi Peter, Planning dinsdag, 7.00h RVS, ..." op. Nieuw testgeval toegevoegd in `mail-schoon.test.ts`; alle bestaande mail-schoon-cases blijven groen (914 unit-tests totaal groen, typecheck schoon).

## Afwijking van de vaste werkwijze

Op expliciet verzoek van Reinier ("bouw en zet gelijk op productie") is de handmatige keuring op de test-omgeving overgeslagen. Wel via feature-branch + nieuwe test + groene CI naar master. Het betreft een kleine, pure-functie-wijziging zonder schema- of statusverandering.

## Naslag

Send-only-key valkuil vastgelegd in geheugen `project_ksv-inbound-test-key`. Bij lege inbound: `email_id` uit `inbound_verwerkt` pakken, `receiving.get` nadoen met de key van die omgeving, naar de echte fout kijken.
