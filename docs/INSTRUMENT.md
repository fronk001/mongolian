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
5. **Interface chrome is English only.** Buttons, section headers, verdicts,
   labels, badges — the app's own voice — are English, full stop. Stacking a
   Mongolian label over its English gloss on every control was overstimulating:
   two languages read on every button, every header, every verdict, for text
   that is never itself the learning content. Mongolian appears only where it
   *is* the content being taught or tested — a flashcard face, a sentence
   prompt, a vocabulary translation in a context chip — and there it still
   carries English alongside it, because a translation without its pair is not
   a translation.

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
| `#015197` | flag blue — known, verified, progress meters |
| `#1E7A46` | green — a right answer, right now, in this question |
| `#F9CF02` | Soyombo gold — goal, level, streak, badges |
| `rgba(20,22,26,.13)` | hairline, all divisions |

**Green is scoped to correctness, not to "known."** Blue still names the
dashboard's verified/known/progress domain — reviews landed, known-word
counts, the goal meter. Green is the narrower, louder signal for "this answer,
just now, was right": the verdict panel, the matching choice, the continue
button that follows it. The two domains overlap in meaning but not on screen,
so nothing claims both at once.

**Gold is never type.** `#F9CF02` on paper is 1.6:1. It appears only as a
fill — bands, meters, badge grounds — with ink on top. A gold word is a bug.

**Red is both action and error.** They never appear as peers on one screen: a
primary button is red when nothing has gone wrong, and a wrong answer is red
when there is no primary button. "Again" is the one grade that reports a
failure, so it carries the error red, not the action red.

Two consequences on a question screen, both load-bearing:

- The prompt panel's red spine means *answer this now*, so it is dropped the
  moment the question is answered. Otherwise the prompt and a wrong verdict sit
  on one screen both claiming red, and the colour stops naming anything.
- The continue button after a multiple-choice answer is green when the answer
  was right — same green as the verdict that produced it — and **secondary
  when it was wrong**, because the wrong verdict already owns red and a
  secondary "continue" does not compete with it for a colour it did not earn.

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
  turns green, the wrong pick turns red and strikes through, the rest mute. No
  two options may ever read the same.

  **The app grades a closed set itself.** Four options were on screen and one
  was picked, so whether it was recalled is not in doubt — a right pick grades
  "Good", a wrong one "Again", and the card offers one button to carry on.
  "That was easy" is the single judgement left with the learner, because
  "easy" is the one thing the pick cannot reveal. Asking for a grade here made
  the learner answer the same question twice, the second time as a row of
  future dates — and the interval, which INSTRUMENT still requires on screen,
  now prints as a `NEXT` readout beside the verdict rather than as a question.
- **Flashcard deck** — Mongolian faces up, tap or Space to flip, then a
  decision that routes the word. Never shows both sides at once.
- **Badge** — gold pill, English label. The lexicon still names each badge in
  Mongolian too (`BADGES` in `core/goals.js`), pending Luna or Sarnai, but the
  pill itself shows only what the interface now speaks.
- **Waveform** / **recording credit chip** — *not yet built (audio phase).*

## Layout & motion

Screen gutter 16px. Panel padding 12–13px. Section breaks are hairlines or a
section header, never whitespace alone. Content is never centred except
flashcard faces.

**A question screen carries no dashboard.** Lessons used to open with the full
header — app name, words tracked, due count, date, RET, ACC — on top of every
single question: eight lines and about twenty words, identical on every screen,
none of it answerable and none of it changing while you study. On the sentence
feedback screen it was a third of the text present. It is replaced by the
lesson bar: the phase rail, the step count, and a way out. The telemetry is not
gone — it is on the dashboard, the screen you go to in order to read it.

The same test applies to everything else on a question screen. A line that
tells the learner what they can already see is noise once it has been read the
first time, and it is on screen for every question after that. A boxed
"PROMPT" label over a 44px word, "write it in mongolian" under a field whose
placeholder already says the same thing, and a legend explaining the colour of
the context chips were all cut on those grounds. Glosses that translate actual
Mongolian content — a flashcard face, a sentence prompt, a vocabulary chip —
are **not** in this category and are never cut: the rule is fewer elements,
not less translation.

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
| `rise` — 14px, no overshoot | question head, panels, choices, button rows, grade bar | 160–180ms |
| `flip` — half-turn on Y | flashcard deck panel, on every turn | 180ms |
| `mark` / `dim` | answered options colouring in and muting | 200ms |
| press `scale(.97–.975)` | every tappable control | 90ms |

A question arrives in reading order — head, prompt, then the options at
35ms apart. The stagger is what makes the sequence legible; no single step
exceeds 180ms.

**Travel has to be seen to be worth having.** The first version of this layer
used 5px over 140ms and a `scale(.985)` press. It measured as motion and was
reported as "there are no animations" — which was a fair reading. Anything
subtler than roughly 10px is a transition nobody can name.

Press feedback is scale only. A shadow would break the paper ground and a
colour flip would collide with the spine, which has to stay where it is.
90ms because anything slower reads as lag rather than as an answer to a touch.

Two mechanics worth knowing before editing this:

- Entry animations fill **`backwards`, never `both`**. With `both` the
  animation keeps ownership of `transform` after it ends, and the `:active`
  press — which is also a transform — never shows. `backwards` gives the
  from-state during the stagger delay and hands the property back on finish.
- `mark` has no `to` keyframe on purpose: an implicit one resolves to the
  element's own computed style, which is how an answered option colours in
  without a transition — the node it would have transitioned from was replaced.

## Copy

Interface chrome is English; telemetry and system labels are uppercase Latin
mono (DUE, RET, ACC, RECALL). Instructional, never flattering. Weak areas are
named plainly with a percentage, no softening. Mongolian appears only as
learning content — a flashcard face, a sentence prompt, a vocabulary
translation — never as the app's own voice.

Where a number cannot yet be measured, the interface says so — «not measured
yet», «rate needs two days of history» — and never prints a zero in place of
an unknown.

**Machine-written Mongolian** — level and badge names, new chrome — follows
the lexicon's `reviewed: false` convention and is pending Luna or Sarnai. See
`BADGES` in `src/core/goals.js`.
