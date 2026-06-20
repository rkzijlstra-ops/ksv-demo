# Design: herindeling oplever-pagina + afsluit-pagina (visueel)

Datum: 2026-06-20. Akkoord Rein na mockups (mockups/oplever-herindeling-v1..v5 + pagina1-kleurtaal).

## Kleur-taal (consistent met bestaande opdracht-status-taal)
- **oranje** (accent) = actie nog nodig / let op
- **groen** (success) = klaar / verzonden / akkoord
- **grijs** (ink-muted) = neutraal / optioneel / secundair
- **rood** (urgent-rood) = negatief / afwijkend / spoed
- blauw (bevestigd) blijft de bevestigd-status (pagina 1, ongewijzigd)

## Herbruikbaar component: `ActieKaart`
Eén kaart-vorm voor handtekening, rapport voorvertonen, versturen-doelen en de afsluit-keuzes:
- border-2 line, rechte hoeken; linker accent-streep (6px) in de accent-kleur
- icoon in een ronde cirkel (accent-kleur, lichte tint achtergrond)
- titel (mono, extrabold) + subtekst (klein, kleur volgt status indien relevant)
- chevron rechts; min-h 56px; wrapper = button (onClick) of Link (href)
- accent-varianten: `neutraal` (grijs), `actie` (oranje), `klaar` (groen), `negatief` (rood)

## Oplever-pagina (OpleverFlow) — nieuwe volgorde
1. Eindresultaat (foto's + video; video gesplitst Opnemen/Galerij = al zo)
2. Controle bij oplevering, in deze volgorde:
   - **interne notitie** (bovenaan, inklapbaar zoals nu)
   - **opmerking** (zichtbaar voor iedereen) + spraak
   - **akkoord-knoppen** (controlepunt)
3. Handtekening → `ActieKaart` (neutraal grijs), opent de teken-modal
4. Rapport voorvertonen → `ActieKaart` (neutraal grijs), Link met de bestaande verlaat-guard;
   verhuist uit de vaste onderbalk de flow in, vóór versturen
5. Versturen — **opdrachtgever boven, klant onder**. Keuze-kaarten als `ActieKaart` met status-kleur:
   nog te versturen = oranje (`actie`), verzonden = groen (`klaar`) + tijd in de subtekst.
   Het detail (adres + verstuur-knop) blijft achter de kaart zoals nu.

De vaste onderbalk onderaan vervalt voor de rapport-knop (Terug-knop staat al boven de pagina via OpleverTerugLink).

## Afsluit-pagina (afronden) — 3 keuzes als `ActieKaart`
- **Snel afsluiten** — `neutraal` (grijs), icoon zap
- **Afsluiten + rapport** — `actie` (oranje, hoofdactie), icoon clipboard-check
- **Niet doorgegaan** — `negatief` (rood), icoon undo-2 (NietDoorgegaanKnop)

## Niet slopen
- Bestaande e2e-labels/rollen behouden: "Foto verwijderen", "Upload annuleren", "Foto opnieuw uploaden",
  "Akkoord"/"Niet akkoord", "Klant laten tekenen", "Stuur naar klant"/"Stuur naar opdrachtgever",
  "Rapport voorvertonen", "Terug". Alleen herschikken/herstijlen, de logica (verstuurNaar, verstuurKeuze,
  bewaarConcept, guards) blijft.
- design-system.md kleuren/tokens aanhouden.
