# UI-correcties + pre-push/poort-3001-valkuil

Datum: 2026-06-07

## Wat er gebeurde

Vervolg op de UI-batch. Commit `ddbdc7a` (fix: UI-correcties planbord/dashboard +
verstuurknop): headers weer dicht, kartelrand overal weg, planbord-strook terug naar
4px (8px gaf overlap en flaky drops), verstuurknop in schermkleuren. Inhoud staat in
de commit-message zelf. Alles groen en gepusht, online demo bijgewerkt.

De sessie liep halverwege vast: de terminal bevroor en de chat-tekst viel weg. Bij
hervatten bleek het werk intact (werkboom schoon, commit lokaal aanwezig), maar de
push was niet doorgekomen.

## De valkuil (belangrijk voor later)

Deze repo heeft een **pre-push git-hook** die bij elke push de volledige suite draait
(`npm run test:all`: vitest unit + integratie + playwright e2e). De e2e start daarbij
een eigen Next.js-webserver op **poort 3001**.

Keten van ellende:
1. Push start, pre-push-hook spint webserver op 3001.
2. Push wordt halverwege afgebroken (vastgelopen terminal, of handmatig).
3. De webserver blijft als wees-proces achter en houdt poort 3001 bezet.
4. Volgende push of test faalt met `EADDRINUSE: address already in use :::3001`.
5. Dat ziet eruit als een rode test, maar is het niet. Het is alleen de bezette poort.

Een aparte handmatige `npx playwright test` is overbodig: de pre-push-hook draait de
e2e toch al. Dubbel draaien vergroot juist de kans op een achtergebleven server.

## Hoe op te lossen als het weer gebeurt

1. Check de poort: `netstat -ano | findstr :3001` (of via Bash `netstat -ano | grep :3001`).
2. Kill de wees-server: `Stop-Process -Id <PID> -Force`, of alles in een keer
   `Get-Process node | Stop-Process -Force`.
3. Verifieer dat 3001 vrij is, dan pas opnieuw pushen.
4. Push gewoon met `git push`; de hook doet de tests. Niet vooraf zelf de e2e draaien.

Diagnose-tip: op Windows hangt Playwright soms in de webserver-afbouw. Tests zijn dan
al klaar (laatste testregel zichtbaar), maar het proces exit niet en laat de poort
bezet. Dat is geen testfout.

## Stand

Lokaal en origin gelijk op `ddbdc7a`. Suite groen: 454 unit, 10 integratie, 45 e2e
(14 e2e overgeslagen: mail-flows en screenshots). Werkboom schoon.
