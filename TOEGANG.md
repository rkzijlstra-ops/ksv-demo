# Toegang- en afschermingsmatrix (levend document)

Wie mag wat zien en muteren, per tabel/pagina en rol, en heeft die afscherming een test. Bij beveiliging
is de "mag-NIET"-kant het vangnet: een negatieve test (rol X kan data Y NIET zien/muteren) vangt precies
het soort fout dat anders een privacy-lek wordt (zoals het zaak-lek van 2026-06-07). Lege/❌ cellen zijn
gaten. Werk dit bij bij elke RLS- of rol-wijziging, en leid de tests eruit af. Bron: schema-compleet-6c
(basis), 6e (zaak-afscherming via mag_melding/mag_opdracht), 7 (verzonden monteur). Laatst: 2026-06-07.

## A. Data-afscherming (RLS) per tabel × rol

Legenda: ✓ getest (positief én negatief) · ⚠️ alleen positief of indirect · ❌ geen afscherming-test

### meldingen (opdrachten + kind-meldingen) — select via mag_melding
| Rol | mag zien | negatieve test (ziet NIET) | status |
|---|---|---|---|
| beheerder | alles | n.v.t. | ✓ |
| opdrachtgever | alleen eigen zaak | niet andere zaak, niet ad-hoc | ✓ opdrachtgever.spec |
| monteur | toegewezen + verzonden (bij wijziging) | niet andermans klus | ✓ monteur.spec, werkpool-zichtbaarheid.spec |

### meldingen — update / delete via mag_melding
| Rol | mag muteren | negatieve test | status |
|---|---|---|---|
| monteur | alleen eigen toegewezen | mag andermans klus NIET wijzigen/verwijderen | ✓ afscherming.spec |
| opdrachtgever | alleen eigen zaak | mag andere zaak NIET muteren | ⚠️ via dezelfde policy (mag_melding); monteur-kant getest |

### documenten — select/update/delete via mag_opdracht
| Rol | mag | negatieve test | status |
|---|---|---|---|
| kantoor (beheerder) | bijvoegen/verwijderen eigen | route rol-check | ✓ documentbeheer.spec (positief) |
| monteur | alleen van eigen klus | mag documenten van andermans klus NIET zien | ✓ afscherming.spec |
| opdrachtgever | alleen eigen zaak | niet andere zaak | ✓ afscherming.spec |

### opleveringen — select/update/delete via mag_opdracht
| Rol | mag | negatieve test | status |
|---|---|---|---|
| monteur | alleen eigen klus | mag oplevering van andermans klus NIET zien | ✓ afscherming.spec |
| opdrachtgever | alleen eigen zaak | niet andere zaak | ✓ afscherming.spec |

### profielen
| Rol | select | schrijven | negatieve test | status |
|---|---|---|---|---|
| monteur | eigen rij | nee | mag NIET de hele profielen-lijst zien | ✓ afscherming.spec |
| opdrachtgever/beheerder | allen (monteur-dropdown) | beheerder | — | ⚠️ |

### opdrachtgevers (zaken)
| select: elke ingelogde · schrijven: beheerder | mag monteur/opdrachtgever NIET schrijven | ❌ GAT (laag risico) |

### insert (alle tabellen)
RLS-insert is bewust ruim (`auth.uid() not null`); de app-routes doen de rol-check (bv. documentbeheer
kantoor-only). ⚠️ Geen RLS-test dat insert niet misbruikt kan worden buiten de routes om. Noteren.

## B. Pagina-rol-gates (UI-laag, vereisRol)

| Pagina | beheerder | opdrachtgever | monteur | test |
|---|---|---|---|---|
| /dashboard | ✓ | ✓ | weggestuurd | ✓ monteur.spec |
| /planbord | ✓ | ✓ | weggestuurd | ✓ monteur.spec + opdrachtgever.spec |
| / (werkpool) | ✓ | weggestuurd | ✓ | ✓ opdrachtgever.spec |
| /gebruikers | ✓ | weggestuurd | weggestuurd | ✓ monteur.spec + opdrachtgever.spec |
| /prullenbak | open (geen rol-gate) | open | open | ⚠️ geen gate; data wel RLS-beschermd (ontwerpvraag) |

## Gaten (status na 2026-06-07)

De afscherming-tests staan in `e2e/afscherming.spec.ts` (data-laag, rol-geauthenticeerde clients die
de RLS direct toetsen) en in de rol-specs. Alle bleken GROEN: de RLS klopt, en de tests bewaken hem
nu tegen toekomstige migraties. Dat is het vangnet dat ontbrak.

1. **✅ GEDICHT. Documenten + opleveringen afscherming.** Monteur ziet die van andermans klus niet,
   opdrachtgever die van een andere zaak niet (met sanity-check op eigen data). afscherming.spec.
2. **✅ GEDICHT. Mutatie-afscherming (update/delete).** Monteur kan andermans klus niet wijzigen of
   verwijderen (geverifieerd dat de rij ongewijzigd blijft). afscherming.spec.
3. **✅ GEDICHT. Profielen-afscherming.** Monteur ziet alleen zijn eigen profiel-rij, niet de namen/
   rollen van anderen. afscherming.spec.
4. **✅ GEDICHT (gebruikers). Rol-gate /gebruikers** (beheerder-only): monteur en opdrachtgever
   weggestuurd. monteur.spec + opdrachtgever.spec.
5. **⚠️ NIEUW, te beslissen met Reinier: /prullenbak heeft GEEN rol-gate.** Elke ingelogde komt erop;
   de data is wel RLS-beschermd (monteur ziet zijn eigen verwijderde, opdrachtgever zijn zaak). De
   terugknop wijst naar de werkpool, dus mogelijk bewust monteur-bereikbaar. Maar herstellen/definitief
   verwijderen voelt als kantoor-werk. Ontwerpvraag: moet /prullenbak beheerder/kantoor-only zijn?
6. **LAAG, blijft: RLS-insert is ruim** (app-routes doen de rol-check); opdrachtgevers-schrijven
   alleen beheerder. Niet apart RLS-getest; app-laag dekt het in de praktijk.
