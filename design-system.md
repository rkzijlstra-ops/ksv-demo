# Design System - KSV Demo (monteur-app)

Bron: ui-ux-pro-max skill (styles.csv #1 + #8, typography.csv #16)
Datum: 2026-05-28 (sessie 2A)
Doel: snel, overzichtelijk, leesbaar in fel daglicht én donkere kelder, vingerbediening

## Stijl

Combinatie van twee skill-styles:
- **#1 Minimalism / Flat** — clean, grid-based, geen afleiding, geen zware shadows/gradients, snel
- **#8 Accessible & Ethical** — 7:1 contrast, grote tekst, symbol+kleur (niet kleur-alleen), grote touch-targets

Geen dark mode: zon op scherm leest slechter in dark mode. Light mode met hoog contrast is leidend.

## Kleuren (high-contrast light)

Bron van waarheid: de `@theme`-tokens in `src/app/globals.css`. Onderstaande tabel volgt die.

| Token | Hex | Gebruik |
|---|---|---|
| `bg` | #FFFFFF | hoofdachtergrond |
| `surface` | #F1F5F9 (slate-100) | kaarten, secties |
| `ink` | #0F172A (slate-900) | hoofdtekst, 7:1+ op wit |
| `ink-muted` | #475569 (slate-600) | secundaire tekst (minimaal, WCAG-veilig) |
| `line` | #CBD5E1 (slate-300) | randen, zichtbaar |
| `primary` | #27272A (anthraciet) | primaire actie-knoppen, witte tekst (industrieel D) |
| `accent` | #F97316 (oranje) | merk-accent |
| `urgent-rood` | #DC2626 (red-600) | urgentie/spoed rood, witte tekst |
| `urgent-geel` | #FBBF24 (amber-400) | urgentie geel, ZWARTE tekst (#0F172A) voor contrast |
| `success` | #16A34A (green-600) | opgeleverd/verzonden, witte tekst |
| `bevestigd` | #1D4ED8 (blue-700) | dashboard-status 'bevestigd', witte tekst |

> Noot: een eerdere versie van dit document noemde `primary` als blue-700. Sinds sessie 2A.7 (industrieel D) is `primary` anthraciet en is oranje het merk-accent. De blauw is nu losgekoppeld en dient alleen nog als dashboard-status `bevestigd`.

**Urgentie nooit alleen kleur**: altijd icoon + label.
- ROOD = driehoek-waarschuwing-icoon + label "DIRECT"
- GEEL = klok-icoon + label "ACHTERAF"

## Dashboard-statuskleuren (opdrachtgever)

Eén kleur + icoon + label per opdracht-status (consistent met de kleur-staat-taal van de monteur-app). Hergebruikt bestaande tokens, alleen `bevestigd`-blauw is nieuw.

| Status | Kleur | Token |
|---|---|---|
| Binnen, nog te plannen | grijs | `surface` + `ink-muted` |
| Gepland, nog te bevestigen | oranje | `accent` |
| Bevestigd | blauw | `bevestigd` (nieuw) |
| Opgeleverd | groen | `success` |
| Geannuleerd | grijs + doorhaling | `ink-muted` + `line` |

## Typografie

Pairing #16 "Corporate Trust" (accessibility-focused):
- **Lexend** — UI, koppen, knoppen, labels (ontworpen voor leessnelheid)
- **Source Sans 3** — lange body-tekst (meldingen, omschrijvingen)
- Voor simpliciteit mag Lexend ook overal; Source Sans 3 alleen waar veel tekst staat
- Geladen via `next/font/google` (geoptimaliseerd, geen externe @import)
- Body minimaal 16px, koppen ruim

## Touch & interactie

- Tap-targets minimaal **56px** hoog (groter dan WCAG-minimum 44px; vieze handschoenen/vingers)
- `cursor-pointer` op alles klikbaars
- Focus-ring zichtbaar (3px) voor toetsenbord
- Transitions 150-200ms op kleur/opacity (geen layout-shift)
- `prefers-reduced-motion` respecteren

## Iconen

- **Lucide** (lucide-react), SVG, consistent 24x24 viewBox
- Nooit emoji als icoon

## Stack-implementatie

- Tailwind v4 (CSS-first config via `@theme` in globals.css)
- Next.js 16 App Router, mobile-first (alle styling default mobiel, `md:` voor desktop)
- Kleurtokens als Tailwind theme-variabelen
