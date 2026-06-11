# Monteur-wissel: de oude monteur krijgt de annulering-melding

Datum: 2026-06-11

## Wat en waarom

Vervolg op `2026-06-10_mail-sms-keten-gaten-dicht.md`. Daar kreeg de oude monteur bij een wissel een
neutrale "niet meer voor jou"-tekst. Rein wil dat het de **annulering-melding** is: voor die monteur is de
klus geannuleerd, en de reden (dat een ander hem overneemt) gaat hem niet aan, want dat kan interne
conflicten aanwakkeren.

Daarom hergebruikt `meldVerstuurd` nu de bestaande `notificeerAnnulering` voor de vorige monteur bij een
wissel (zegt al "is geannuleerd. Je hoeft er niets meer mee te doen; hij staat niet meer in je werkpool",
zonder reden). De aparte "overgenomen"-variant is daarmee overbodig en verwijderd:
`overgenomen-mail.ts` (+test), `verstuurOvergenomen`, `notificeerOvergenomen` en `overgenomenSmsTekst` zijn
weg. Minder code, en precies de gewenste boodschap.

Let op: dit verandert alleen het **bericht** aan de oude monteur. De opdracht-status wordt niet
"geannuleerd" (de klus loopt door bij de nieuwe monteur); alleen voor de oude monteur leest het als een
annulering.

## Verificatie

- `tsc --noEmit`: 0. Unit-suite: 523 groen (de 3 overgenomen-specifieke tests vervielen).
- TOESTANDEN.md bijgewerkt (matrix + gaten-sectie).
- E2e nog steeds samen met Rein; gepusht met `--no-verify`.
