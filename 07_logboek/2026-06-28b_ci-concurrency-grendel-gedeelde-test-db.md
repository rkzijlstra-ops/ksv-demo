# CI faalde op gelijktijdige runs: concurrency-grendel op de gedeelde test-DB

Datum: 2026-06-28
Branch: docs-omgevingskaart (PR #34). Strikt genomen geen feature, maar een CI-config-fix plus dit verslag, meegelift op de docs-PR omdat de docs-CI hier op stuk liep.

## Symptoom

De CI op de docs-only PR #34 faalde. Eerst een run die de 20-minuten-limiet haalde en werd afgekapt; daarna een rerun die in ~1 min faalde op de integratietests:

- `scenario.int.test.ts`: dashboard had lengte 3 i.p.v. 14; `dashboard_status` en `gewijzigd_te_versturen` kwamen `undefined` terug.
- `keten.int.test.ts:199`: na `bevestigOntvangst` was `dashboard_status` `undefined` i.p.v. `'bevestigd'`.

Dezelfde operatie slaagde in de ene test en faalde in de andere (bijv. `markeerVerzonden -> 'gepland'` slaagde in keten, faalde in scenario). Die inconsistentie = geen schemafout, maar een race.

## Oorzaak

Twee CI-runs draaiden tegelijk op dezelfde test-DB. Bewezen via de run-tijden: de docs-rerun eindigde 17:17:47, terwijl een master-run (`28329919838`) liep van 17:16:17 tot 17:17:45. De eerste, vastgelopen docs-run overlapte met `fix-geneste-forward` (16:36-16:55).

De integratietests maken hun eigen data aan onder een **gedeelde** INT-scope (vaste zaak "INT Integratietest" + naam-prefix `INT `) en wissen die in `beforeEach` (`integration/int-harnas.ts`, `ruimIntDataOp`). Die isolatie beschermt Reiniers handmatige keuringsdata wél, maar beschermt de ene CI-run niet tegen de andere: run B's wipe verwijdert de net-aangemaakte rijen van run A.

Verergerd doordat alle status-schrijvers in `src/lib/db.ts` `.update(...).eq("id", id)` doen en alleen bij een echte DB-fout gooien, niet als er 0 rijen matchen. Is de rij intussen weg, dan slaagt de update stil op 0 rijen en geeft `getOpdrachtById` daarna `null` -> `?.dashboard_status` is `undefined`. Vandaar de faalvorm.

Niet de docs-wijziging, en ook niet direct de schone lei van vandaag (die maakte hooguit meer CI-verkeer los waardoor runs overlapten).

## Fix

Optie 1 uit de afweging: een workflow-brede `concurrency`-groep in `.github/workflows/ci.yml`.

```yaml
concurrency:
  group: ci-gedeelde-testdb
  cancel-in-progress: false
```

Vaste group = repo-breed serieel: nooit twee CI-runs tegelijk. `cancel-in-progress: false` laat een lopende run afmaken en zet de nieuwe in de wachtrij, i.p.v. die midden in een DB-operatie af te breken. Nadeel: runs wachten op elkaar; acceptabel zolang er één gedeelde test-DB is.

**De test-DB splitsen is bewust verworpen** (eerder al), dus de grendel is de gekozen weg, niet een tussenstap daarnaartoe.

Let op tijdens de overgang: de grendel werkt pas repo-breed zodra hij op `master` staat en andere branches die oppikken. Tot dan kan een branch op de oude `ci.yml` nog naast een nieuwe run draaien; zorg bij deze merge dat er geen andere run actief is.

## Bewijs van de diagnose

Docs-CI alleen opnieuw gestart (run `28329098652`), zonder overlap met een andere run: dezelfde commit werd toen **groen** (volle suite, incl. integratie + e2e + demo-e2e). Dat bewijst dat de falen puur uit de gelijktijdigheid kwamen, niet uit de code. Daarna pas de grendel toegevoegd en gemerged.
