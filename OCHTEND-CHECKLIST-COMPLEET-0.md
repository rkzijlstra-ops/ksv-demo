# Checklist blok 0: datamodel-fundament draaien

Eén handeling voor jou. De rest is code en is al getest (265 tests groen, `next build` slaagt).

## Supabase: migratie draaien
- Open de Supabase SQL-editor.
- Plak de inhoud van `supabase/schema-compleet-0.sql`, druk Run.
- Voegt de planning- en statusvelden toe aan de opdracht-rij. Idempotent en veilig:
  het raakt de bestaande monteur-flow niet (de oude kolommen blijven ongemoeid).
- "Success. No rows returned" is goed.

## Daarna
- Niets te testen in de app: blok 0 is alleen de datalaag, er hangt nog geen scherm aan.
  De schermen komen in blok 1 (dashboard) en blok 3 (planbord).
- Niet dringend: de migratie mag ook later, vlak voordat we het dashboard bouwen.
