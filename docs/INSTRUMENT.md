# Instrument v3 — "Соёмбо"

Reference for the visual system. Read before changing UI.

v1 and v2 were near-black chassis with a lime signal. v3 keeps the same
logic — panels, hairlines, real telemetry, Mongolian at the top of the type
scale — but inverts the ground to paper and replaces the invented signal
colour with Mongolia's own. `src/ui/base.css` is this document's
implementation; if the two disagree, the CSS is wrong.

## Principles

1. **Instrument on paper.** White panels on a warm paper ground, separated by
   hairlines. No shadows, no gradients. 3px radius on panels and controls.
2. **Colour names a domain.** Every panel carries a 3px left spine saying what
   it measures: red for what you do now and what went wrong, blue for what is
   verified or known, gold for the goal layer. A panel with no spine is
   reference material. Two panels claiming the same domain on one screen means
   one is wrong.
3. **Numbers are real, including the game.** The app has XP, levels, streaks
   and badges — but each is derived from an event that actually happened. XP
   is the base for grading a card plus the memory stability the review
   genuinely bought. Levels are thresholds on known words. A streak day
   requires a *finished* session. Badges are checkable conditions. Nothing in
   the interface can be earned without doing the work, and no figure is
   invented to make a screen feel better.
4. **Mongolian is the largest thing.** Cyrillic sits at the top of the type
   scale, uncrowded. English is mono, small and grey — reference, not content.
5. **Every Mongolian string carries its English.** Not a subset. Buttons,
   section headers, verdicts, labels, badges. It is switchable off from
   Тохиргоо, and off is a preference, never a default.

## Colour

Official Mongolian flag standard, fixed 8 July 2011.

| Hex | Role |
|---|---|
| `#F4F2ED` | paper (page background) |
| `#FFFFFF` | panel |
| `#FAF9F6` | inset panel (inputs, code fields) |
| `#14161A` | ink (primary text) |
| `#3D434A` | secondary content |
| `#5A6068` | labels and English glosses — **7.0:1 on paper** |
| `#9CA2A9` | disabled only; never carries meaning |
| `#C4272F` | flag red — primary action, live state, errors |
| `#015197` | flag blue — correct, known, verified, meters |
| `#F9CF02` | Soyombo gold — goal, level, streak, badges |
| `rgba(20,22,26,.13)` | hairline, all divisions |

**Gold is never type.** `#F9CF02` on paper is 1.6:1. It appears only as a
fill — bands, meters, badge grounds — with ink on top. A gold word is a bug.

**Red is both action and error.** They never appear as peers on one screen: a
primary button is red when nothing has gone wrong, and a wrong answer is red
when there is no primary button. «Дахин» is the one grade that reports a
failure, so it carries the error red, not the action red.

## Type

Geologica for content, JetBrains Mono for telemetry. Both self-hosted.

| Size | Weight | Use |
|---|---|---|
| 44 | 500, -3.5% | flashcard term, card prompt |
| 38 | 500, -3.5% | deck face |
| 30 | 600, -2.5% | dashboard figures |
| 26 | 500, -2% | sentence prompt, English prompt |
| 17 | 500 | multiple-choice options |
| 14 | 500/600 | row titles, buttons |
| 11.5 | mono | **English gloss** |
| 10 | mono, +12% | telemetry labels |
| 9.5 | mono, +12% | boxed labels (`.lab`) |

**Rules:** Mongolian never below 13px. Mono never above 12px. Body weight is
400 — 300 was too thin to hold on paper. Uppercase mono for labels,
sentence-case Geologica for content.

The gloss was 10px in `#5E646A` on `#15181B` — about 2.9:1, the least legible
thing in the app. It is now 11.5px at 7.0:1. If a future change makes the
reference layer harder to read than the content layer, that change is wrong.

## Components

- **Panel with spine** — the base unit. `.panel.red`, `.panel.blue`,
  `.panel.gold`, or bare for reference.
- **Boxed label** (`.lab`) — mono in a hairline box, naming what the panel
  measures. The signature of v3.
- **Stat grid** (`.grid2`) — 2×2, hairline-divided, each cell a boxed label
  over a figure over a gloss.
- **Week strip** — seven slots. A finished day is solid blue; today unstarted
  is a red-outlined hatch, an empty space waiting to be filled; a missed day
  stays visible as a gap. Renumbering a week to hide a miss is forbidden.
- **Month grid** — Monday-first, capped at 266px so it stays evidence rather
  than headline.
- **Gold band** — the goal and lesson-worth readouts. Ink on gold.
- **SRS grade bar** — four cells; the interval is *always* printed under the
  label, and it is what the scheduler will actually do. It appears where only
  the learner knows how hard the recall was: typed word cards and sentences.
- **Multiple choice** — four options, keyboard 1–4. After answering: the truth
  turns blue, the wrong pick turns red and strikes through, the rest mute. No
  two options may ever read the same.

  **The app grades a closed set itself.** Four options were on screen and one
  was picked, so whether it was recalled is not in doubt — a right pick is
  «Сайн», a wrong one «Дахин», and the card offers one button to carry on.
  «Амархан байсан» is the single judgement left with the learner, because
  "easy" is the one thing the pick cannot reveal. Asking for a grade here made
  the learner answer the same question twice, the second time as a row of
  future dates — and the interval, which INSTRUMENT still requires on screen,
  now prints as a `NEXT` readout beside the verdict rather than as a question.
- **Flashcard deck** — Mongolian faces up, tap or Space to flip, then a
  decision that routes the word. Never shows both sides at once.
- **Badge** — gold pill, Mongolian label, English gloss beneath the row.
- **Waveform** / **recording credit chip** — *not yet built (audio phase).*

## Layout & motion

Screen gutter 16px. Panel padding 12–13px. Section breaks are hairlines or a
section header, never whitespace alone. Content is never centred except
flashcard faces.

Transitions 140–180ms, `cubic-bezier(.2,0,0,1)`. Nothing bounces. Grading a
card advances instantly. The one celebration is the session-close screen,
which reports what actually happened — XP earned, reviews graded, badges
crossed — and is a summary, not a fanfare. `prefers-reduced-motion` disables
every transition *and* every animation, and neutralises the press transform.

**Only what changed moves.** The view is rebuilt from an HTML string on every
state change, so an entry animation left to itself replays on every render —
picking an option would re-animate the prompt already being read. `app.js`
puts `.enter` on the container only when the screen is showing something new
(a different question, deck face, or screen), and every entry animation is
scoped under it. A verdict panel carries `.reveal` instead: it is new by
definition, because it did not exist a moment ago.

The vocabulary, and nothing beyond it:

| Motion | Where | Duration |
|---|---|---|
| `fade` | container, on a new screen or question | 140ms |
| `rise` — 5px, no overshoot | choices (25ms stagger), verdict panel, deck face, button rows | 160–180ms |
| `mark` / `dim` | answered options colouring in and muting | 200ms |
| press `scale(.985–.99)` | every tappable control | 90ms |

Press feedback is scale only. A shadow would break the paper ground and a
colour flip would collide with the spine, which has to stay where it is.
90ms because anything slower reads as lag rather than as an answer to a touch.

`mark` has no `to` keyframe on purpose: an implicit one resolves to the
element's own computed style, which is how an answered option colours in
without a transition — the node it would have transitioned from was replaced.

## Copy

Interface chrome is Mongolian; telemetry and system labels are uppercase Latin
mono (DUE, RET, ACC, RECALL). Instructional, never flattering — «Сонсоод
давт», not «Гоё байна!». English sits under the Mongolian in mono grey. Weak
areas are named plainly with a percentage, no softening.

Where a number cannot yet be measured, the interface says so — «not measured
yet», «rate needs two days of history» — and never prints a zero in place of
an unknown.

**Machine-written Mongolian** — level and badge names, new chrome — follows
the lexicon's `reviewed: false` convention and is pending Luna or Sarnai. See
`BADGES` in `src/core/goals.js`.
