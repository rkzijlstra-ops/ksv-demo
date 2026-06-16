# Inbound live getest: oorzaak lege klussen = verstuur-only API-key

Datum: 2026-06-14

## Wat
De inbound (mail-naar-app) is voor het eerst live getest met echte Resend-ontvangst. Stap voor stap
gedebugd; uiteindelijke oorzaak gevonden en deels gefixt.

## Bevindingen (in volgorde)
1. **Resend ontving niks** → bleek: ontvangst stond op "pending"; de **DKIM moest óók geverifieerd**
   zijn voordat Resend inkomende mail aanneemt. Daarna kwam mail wél binnen in Resend.
2. **DNS/MX correct**: `klus.kluslus.nl MX → inbound-smtp.eu-west-1.amazonaws.com` (priority 10),
   wereldwijd zichtbaar (gecheckt via 8.8.8.8 en 1.1.1.1). Geen bounce vanaf Gmail/Outlook.
3. **App-endpoint gezond**: `https://ksv-demo.vercel.app/api/inbound` leeft, gaf 401 "Ongeldige
   handtekening" op een neptest → endpoint live + `RESEND_WEBHOOK_SECRET` correct gezet.
4. **Webhook firet** (handtekening OK, monteur herkend), maar struikelde op het ophalen van de mail.
   PR #6 maakte dat robuust: bij een fout loggen we de echte Resend-fout en vallen we terug op de
   webhook-payload, zodat de klus tóch ontstaat (vandaar: klussen komen binnen maar "zo goed als leeg").
5. **Echte oorzaak (uit Vercel-logs):**
   `401 "This API key is restricted to only send emails" (restricted_api_key)` op zowel
   `receiving.get` als `attachments.get`. De `RESEND_API_KEY` in Vercel is een **verstuur-only**
   sleutel; ontvangen mail + bijlagen ophalen vereist **Full access**.

## Open actie (Rein, extern)
**Vervang `RESEND_API_KEY` in Vercel door een Full-access sleutel** (Resend → API Keys → nieuwe met
permission Full access), redeploy. Dan worden de order-PDF's opgehaald en uitgelezen, en is de klus
gevuld. Versturen blijft werken (full access mag ook versturen).

## Inhoud doorgestuurde order (ter referentie)
De testmail "Definitieve order comm. Klein ref. 192908" had de order als **PDF-bijlagen**
(`Definitieve order 192908 Klein.pdf`, `Bovenaanzicht...pdf`, `Leidingschema.pdf`) + een inline-logo.
De body is alleen de standaard leverbrief. De bruikbare data zit dus in de PDF's → daarom is het ophalen
van bijlagen cruciaal.

## Randzaken
- **Gmail/Workspace MCP-server** (poort 3200) lag eruit; opnieuw gestart via
  `C:\Users\rkzij\.claude\mcp\google-workspace\start-server.ps1`. Mid-sessie reconnect wérkte zodra de
  server draaide (in tegenstelling tot de oude notitie). Autostart als Scheduled Task geprobeerd
  (`GoogleWorkspaceMCP`), nog te verifiëren.
- PR #6 (robuuste inbound + foutlogging) is gemerged en uitgerold.
