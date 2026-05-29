# BRAINSTORM Sessie 2A.6 - Opdracht met documenten + opleverrapport

Datum: 2026-05-29
Status: brainstorm-keuzes bevestigd, design nog te presenteren + goedkeuren
Doel: app echt bruikbaar maken voor echte KSV-opdrachten (vóór de zelf-gebruik fase)

## Doel (door Rein)

Een volledig functionerende app waar Rein/collega's zelf opdrachten in schieten, en waar
per project een opleverrapport (tekst + foto's) uit komt. Alles in 1 sessie bouwen.
In/output (inbound Gmail van Ed) koppelen we later (2B).

## Bevestigde keuzes (6 clarifying vragen)

1. **Opdracht-structuur:** één opdracht = meerdere documenten (PDF's). Een montage van een hele
   keuken (tekeningen, 3D, bestellijst) is één opdracht met meerdere docs, niet meerdere opdrachten.
2. **Info-balans:** app toont een uitgelezen samenvatting bovenaan (klant/adres/ref/kernpunten) +
   een knop per PDF om het volledige originele document te openen. Parser blijft, originele PDF's
   worden opgeslagen en openbaar te openen vanuit de app.
3. **Aanmaak-flow (alle drie):** (a) meerdere PDF's tegelijk uploaden → 1 opdracht; (b) later
   documenten aan een bestaande opdracht toevoegen; (c) opdracht met alleen tekst (geen PDF).
4. **Meldingen → rapport:** meldingen verzamelen tijdens de klus (concept). Aan het eind één keer
   'opdracht opleveren' = alle meldingen gebundeld in één samenhangend rapport. Urgente melding
   kan tussendoor al los verstuurd worden.
5. **Rapport-vorm:** opleverpagina als bron (web), met PDF-generatie eruit.
6. **Mail bij opleveren:** rapport-PDF wordt gemaild naar de monteur (eigen kopie) ÉN de zaak.
   Makkelijkste werkende mail-route (Claude kiest in design, leg voor). Inbound Gmail-parsing
   (Ed's mails automatisch inlezen) blijft sessie 2B.

## Context / randvoorwaarden

- Service-PDF's en montage-PDF's hebben verschillende structuur. Huidige parser is op service
  gericht (klant, adres, ref, adviseur, telefoon, meldingen[] met keller_code/omschrijving/melding_tekst).
  Montage-PDF's (tekeningen/3D/bestellijst) parsen anders — fine-tunen op echte data.
- "Ik zie maar een deel van de omschrijving" = (a) maar 1 PDF werd geïmporteerd terwijl een klus
  meerdere docs heeft, en (b) parser haalt alleen meldingen eruit, niet alle context. Opgelost door
  meerdere docs + originele PDF's openbaar.
- Toekomstvast bouwen voor `user_id` + `toegewezen_aan` (zie project-memory volgorde-na-2a-auth).
- Principe: alles binnen één opdracht (zie memory feedback-alles-binnen-opdracht).
- Echte testdata: mail van Ed de Jong, week 23, in BKM-mailbox: opdracht "plaatsen keuken" = eerste
  3 PDF's, 1 service-klus = laatste PDF, alles in 1 mail. Nog te bekijken (MCP-server moet draaien).

## Nog te doen (brainstorm-vervolg)

- Ed's mail + PDF's bekijken (vereist herstart Claude Code met google-bkm MCP actief).
- Design presenteren in secties (datamodel documenten, aanmaak-flow, opleverflow, rapport, mail).
- Mail-dienst kiezen (Resend vs Gmail-SMTP via BKM-account).
- Design-doc schrijven in docs/superpowers/specs/, dan plan.

## MCP-server starten (voor mail bekijken)

`C:\Users\rkzij\.claude\mcp\google-workspace\start-server.ps1` in een PowerShell-venster (server op
127.0.0.1:3200). Draait niet automatisch. Na starten: Claude Code herstarten zodat de MCP-client
bij sessiestart verbindt (reconnect in lopende sessie kan niet, `/mcp` niet beschikbaar).
