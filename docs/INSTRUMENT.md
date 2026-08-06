# Instrument — design system

Reference for the visual system. Read before changing UI. Source: Fred's
"Instrument v1.0" style guide.

## Principles

1. **Chassis, not canvas.** Near-black panels separated by 1px hairlines. No
   shadows, no gradients, no rounded blobs. 4px radius on panels, 3px on inline
   controls.
2. **One signal colour.** Lime marks exactly one thing: what is live, or what
   happens next. Two competing lime elements on screen means one is wrong.
3. **Numbers are real.** Every readout is genuine telemetry — FSRS interval,
   recall probability, match score. No XP, no gems, no invented scores.
4. **Mongolian is the largest thing.** Cyrillic sits at the top of the type
   scale, uncrowded. Latin transliteration and English are mono, small and grey —
   reference, not content.

## Colour

| Hex | Role |
|---|---|
| `#0A0B0C` | chassis (page background) |
| `#15181B` | panel |
| `#0F1113` | inset panel (rows, inputs) |
| `#2A2E33` | track (unfilled meters) |
| `#7C8288` | muted text |
| `#5E646A` | mono label text |
| `#EDEEEC` | ink (primary text) |
| `#D8F04B` | signal — live / next action only |
| `#FF6B4A` | alert — «Дахин», зөрүү, weak spots only |
| `rgba(255,255,255,.10)` | hairline, all divisions |

## Type

Geologica for content, JetBrains Mono for telemetry. Both self-hosted.

| Size | Weight | Use |
|---|---|---|
| 46 | 500, -3% | flashcard term |
| 27 | 500, -2% | lesson prompt / sentence |
| 15 | 500 | row titles, buttons |
| 13 | 300 | example sentences, body |
| 10 | mono, +6% | all telemetry and labels |

**Rules:** Mongolian never below 13px. Mono never above 12px. Uppercase mono for
labels, sentence-case Geologica for content.

## Components

- **Primary / secondary / disabled buttons** — lime fill, hairline outline, dim outline.
- **SRS grade bar** — four cells; the interval is *always* printed under the label.
- **List row** — index, title, mono sub-label, signal arrow. Locked rows at 45% opacity.
- **Stat triplet** — three figures divided by hairlines; the first carries signal, rest ink.
- **Waveform** — played portion in signal, unplayed in track. *Not yet built (audio phase).*
- **Recording credit chip** — every native clip is attributed. Never play a human
  recording without it. *Not yet built.*

## Layout & motion

Screen gutter 20px. Panel padding 14–18px. Vertical rhythm on 4px. Section breaks
are 1px hairlines, never whitespace alone. Content is never centred except
flashcard faces.

Transitions 140–180ms, `cubic-bezier(.2,0,0,1)`. Nothing bounces. Grading a card
advances instantly — no celebration state.

## Copy

Interface chrome is Mongolian; telemetry and system labels are uppercase Latin
mono (DUE, RET, ACC). Instructional, never encouraging — «Сонсоод давт», not
«Гоё байна!». English sits under the Mongolian in mono grey at 10–11px. Weak
areas are named plainly with a percentage, no softening.
