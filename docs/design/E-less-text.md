# E — Less text: one task per screen, details on tap

Workstream E of the "make it shine" plan. Feedback point 5. This workstream owns
**layout and words**. Gamification decides which game elements exist, the
learning loop decides how grading and retries work, and reading decides how
passages behave. This document gives each of them a slot with a word budget,
and it gives every screen a fixed set of disclosure primitives (`hint()`,
the ⓘ button, disclosure rows, Details, Numbers) to build with.

Word counts use the audit's method (`audits-gami.json`, "Text density"): every
token that contains a letter or a digit, per text node, including the tab bar
(5) or the lesson bar (2). Placeholders and aria-labels are not counted.
Fred's purpose sentence (12 words in the fixture) is counted where it appears.

---

## 1. Problem

Fred: *"in general, there is a lot of text on each screen, we should consider
using less text or hide text after clicks."* Point 4 has the same root:
*"the gamification is absolutely shit and too hard to follow."*

What the audit measured, rendered from the shipped `dist/` modules:

- **The text sits on the tab pages, not the questions.** Settings has 101
  words, Today 86 (104 unsynced), Achievements 77, Grammar list 75, Progress 59,
  the grammar intro 143 and session done 59–73. Question screens are already
  lean at 12–32 words, because INSTRUMENT's "a question screen carries no
  dashboard" pass cut them (`docs/INSTRUMENT.md:149-165`).
- **Half of Today repeats itself.** 42 of 81 words are telemetry or repeats.
  "13 due" is printed 3 times, and the week and streak are shown 5 ways.
  Only 10 words are needed to act (`views.js:53-63` `header()`,
  `:233-282` `viewToday()`).
- **Most of it is tiny letterspaced mono.** Text at 9.5–11.5px JetBrains Mono
  makes up 56% of Today's words, 64% of Achievements, 83% of Settings, 93% of
  Progress and 76% of Done (`base.css:52-53` `.mono` 10px uppercase,
  `:60-62` `.lab` 9.5px, `:71-73` `.gl` forced to lowercase, which renders
  B1/CEFR/XP as b1/cefr/xp).
- **Captions explain what is already visible, on every visit.** Examples:
  Progress glosses restate their labels ("reviews landed" under REVIEWS,
  `views.js:299-304`). Settings is 69% captions (`app.js:237-285`). The 70-word
  grammar summary shows on every visit (`views.js:386-404`). A four-screen
  footer reads "INSTRUMENT v3 · SOYOMBO" (`views.js:313, 360, 383`;
  `app.js:284`).
- **Developer jargon sits in the learner's view:** FSRS, RET, ACC, i+1,
  RECALL, "fsrs stability ≥ 21d", CORPUS CEILING, WORD #176
  (`views.js:56-61, 91, 356-357, 532, 673`).
- **Nothing can be hidden safely today.** `gl()` renders both content
  translations (`views.js:531`, the deck back) and explanatory captions, so
  "hide glosses" would delete translations (`views.js:13-16`). Any `<details>`
  open state would also be lost on every redraw, including sync redraws,
  because `render()` rebuilds `#app` with `innerHTML` (`app.js:149-170, 217`;
  `adopt()` at `:57-61`).

---

## 2. What Fred will experience

### 2.1 The rules he will feel (stated once, applied everywhere)

1. **One task per screen.** A question screen shows the lesson bar, the
   prompt, the answer area and one main action. A verdict shows the verdict,
   the answer, one line saying what happens next, and the buttons grading
   needs. Everything else is one tap away.
2. **New things explain themselves once.** A short tip (≤ 12 words, plain
   English) appears under a new control or figure the first day it shows up,
   or until he has used it once. After that it folds into a small ⓘ beside
   the thing it explains. Settings → Tips → *Show again* brings them all back.
3. **Numbers have two homes.** The learner screens show only the figures
   needed to act. The full instrument (RET, ACC, tracked, comprehensible, B1
   projection, content ceiling, recall %, i+1, intervals) is under **Numbers**
   on Progress and under **Details** on any verdict. Nothing is deleted.
4. **Translations are never removed, only deferred.** Every Mongolian string
   has its English one tap away on the same screen. It is shown without a tap
   everywhere except where the English is the thing being tested or read for
   (see §3.6).
5. **Readable type.** Sentence-case English in Geologica at 12–15px replaces
   tiny uppercase mono labels. Mono is kept for numerals and inside
   Numbers/Details, where the instrument is read rather than studied on.

### 2.2 Screen by screen, with exact copy and budgets

Slots marked **[GAMI]**, **[LOOP]**, **[READ]** or **[SOUND]** are filled by
those workstreams. Their word ceiling is part of this design.

#### Today (before 86 synced / 104 unsynced → after 40 / 51)

```
                                   Sat 11 Oct  ●        ← date + sync dot (3 words)
┌ gold ───────────────────────────────────────────┐
│ I want to talk with Sarnai's family at Tsagaan  │  ← purpose, 15px; tap = edit
│ Sar without switching to English.               │     (data-act="purpose")
│ [GAMI goal meter, gold fill]  0 of 1 lesson     │  ← ≤ 5 words
└─────────────────────────────────────────────────┘
┌ red ────────────────────────────────────────────┐
│ 4  day streak                        ⓘ          │  ← 3 words
│ ▮ ▮ ▮ ▮ ▨ ░ ░                                    │
│ M T W T F S S                                    │  ← 7 (Geologica 11px)
└─────────────────────────────────────────────────┘
[ Start  ·  21 items · ~7 min ]                       ← red primary, 5 words
Today   Read   Grammar   Progress   Settings          ← tab bar, 5 words
```

- **Gone from Today:** "MONGOLIAN · FSRS", h1 "Today", "85 words tracked · 13
  due", RET, ACC, the WHY label, the Edit button (the panel itself is the
  edit control), "THIS WEEK", "5 / 7 days", the STREAK pill, the
  "5 of 7 days · 4-day streak · best 8" gloss, "THIS LESSON", "+1 / DAY OF 7",
  "4 new · 13 due · ~7 min estimated", and the rows panel
  (Due / New / Sentences / Comprehensible). All of these figures move to
  Progress → Numbers (§2.2 Progress).
- One gold panel holds the goal layer (purpose plus today's goal). INSTRUMENT
  allows one panel per domain, and today's screen has two gold surfaces.
- No purpose yet: a ghost button, **Add your reason** (3 words), replaces the
  sentence.
- Nothing due: the button reads **Nothing due today**, disabled, with
  **[READ]** a secondary **Read something** (2 words) if a passage is
  readable.
- Finished today: the button reads **Done for today**, disabled. The week
  strip cell is already blue.
- Unsynced notice (replaces `backupNotice`, before 18 → after 11). A red
  panel, all of it a button to Settings: **Not backed up** · right-aligned
  **Never** or **20 days** · caption **Tap to sync or export a code.**
- Sync problems (`account.js:111-120`, before 11–15 → after 5–7):
  **Signed out of sync** · **Tap to sign in.** / **Not syncing** · **Tap to
  see why.** The "progress is kept on this device meanwhile" reassurance moves
  into the Settings panel, where the reason is.
- ⓘ on the week panel: *A day counts once you finish that day's lesson.*

#### Lesson bar (before 2 → after 2–4)

`5 / 21` on the left and ✕ on the right, as now. **[GAMI]** may add one live
counter on the right, such as `+42 XP` (≤ 2 words). **[LOOP]** draws retry
segments in the rail with its own class, using no words.

#### New-word deck (before 23 per face → after 10 front, 11 back)

- Front: tag **New** · the Mongolian face · **Learn** · **I know this**
  **[LOOP: may become a verified check, same ≤ 3 words]** · **Back** (from the
  second card on).
- Tip under the card until the first flip ever: *Tap the card to see the
  English.* Then it is gone.
- Back: the English (26px) and its Mongolian pair under it. That pair is
  content and is never hidden.
- **Gone:** "NEW 2/4" (the deck dots already say it), "TAP TO FLIP" (replaced
  by the tip), "queue for review" and "schedule it further out" (moved to
  ⓘ `deck.choose`), "WORD #176" (moved to Details).

#### Multiple-choice word card (before 19 / 31 right / 23 wrong → after 9 / 17 / 16 on a phone; +4 on the laptop)

- Before answering: lesson bar · prompt · four options · ghost **Type
  instead**. The 1–4 key numerals show only on devices with a keyboard
  (`@media (hover: none)` hides `.choice .k`). "ENG → MGL" and
  "CARD · REVIEW" are gone: the prompt's language already says which way
  round the card is.
- Right: green panel **Correct** · `чийдэн — lamp` (a content pair) ·
  **Back in 13 days** · ⓘ Details. Buttons: green **Continue**, ghost **Easy**.
  ⓘ `card.easy`: *Easy: you knew it instantly, so it waits longer.*
- Wrong: red panel **Wrong** · the pair · **[LOOP]** **Again later this
  lesson** when a retry is queued, otherwise **Back tomorrow** · ⓘ Details.
  Button: secondary **Continue**.
- **Gone to Details:** RECALL 88% and the interval Easy would have given.

#### Typed word card (before 12 / 22 → after 6 / 16 right / 18 wrong)

- Before: lesson bar · prompt · answer field (placeholder `in Mongolian` /
  `in English`) · **Check** · ghost **Choose instead**.
- Right: **Correct** · the answer · **Back in 13 days** · grade controls
  **[LOOP]** · ⓘ Details. "Your answer — X" only appears when it differs from
  the answer, as it does with a typo or an alternative.
- No match: **No match** (not "Wrong", because an unlisted correct phrasing is
  possible) · the answer · **You wrote:** *given* · **Again later this lesson**
  · **[LOOP]** secondary **Continue** + ghost **I was right** · ⓘ Details.
- Budget assumption: the loop replaces the four-cell bar after a right answer
  with **Continue** (Good) plus ghost **Hard 5d** and **Easy 1.1mo** cells
  (5 tokens). If the loop keeps the four-cell bar, add 3 words. INSTRUMENT's
  "interval always printed" holds in both cases.

#### Sentence, typed (before 12–14 / 32 → after 9 / 24 right / 26 wrong)

- Before: lesson bar · prompt (26px) · `note` if present (a content pair,
  e.g. `*бүр = every`; **[LOOP]** may move it into a hint rung) · field
  (placeholder `Write it in Mongolian` / `Write it in English`) · **Check** ·
  ghost **Use blocks** **[LOOP]**.
- **Gone:** the `i+1 · 67% KNOWN` head (moved to Details), the boxed
  TRANSLATE label, and the direction tag (the placeholder says it).
- Right: **Correct** · the diffed answer · context chips (`хайрцаг · box`,
  protected) · **Back in 13 days** · grade controls · ⓘ Details.
  - Alternative matched: a small chip **Also accepted** (2 words, was 8).
    ⓘ `verdict.alt`: *Your wording differs from the listed answer and still
    counts.*
  - Typo: **Spelling** · ~~given~~ → **correct** · **graded Hard** (5, was 12).
    ⓘ `verdict.typo`: *One letter out: counted right, graded Hard.*
- No match: **No match** · diff · **You wrote:** *given* · chips · **Again
  later this lesson** · **Continue** + **I was right** · ⓘ Details.

#### Sentence, building blocks [LOOP builds it] (new → ≤ 16)

Lesson bar · prompt · dashed build line (empty, no text) · tiles · **Check** ·
ghost **Type instead**. Tip until the first check ever: *Tap blocks in order.
Tap a placed block to undo.* There is no "tap words below" placeholder and no
"⌫ Remove last" button: tapping a placed tile returns it to the bank.

#### Retry [LOOP] (base screen + 1)

The retried item, with a tag **Retry** in the question head. The verdict's
consequence line is **Back tomorrow** once the loop's cap is reached.
ⓘ `card.retry` on the first wrong verdict: *Missed answers come back before
the lesson ends.*

#### Verdict → Details (closed: 1 glyph; open: about 15–25 words)

One ⓘ at the top right of every verdict panel opens Details under the panel.
Details uses the instrument styling (mono, `.lab`), and it is sticky per
device: once Fred opens it, it stays open on later verdicts until he closes
it. Contents:

| Item | Row |
|---|---|
| word card | `RECALL BEFORE 88%` · `WORD #176` · `IF EASY 1.1mo` (MC only) |
| sentence | `KNOWN IN SENTENCE 67%` · `NEW ELEMENTS 1` · `GRADED хайрцаг, …` · `INTERVALS FOR хайрцаг` |
| typo / alt | the long explanation that used to sit inline |

#### Reading [READ builds it] (chrome ≤ 8 per passage screen, ≤ 12 per question)

Title (a Mongolian/English content pair) · lines in Mongolian · tip until the
first line tap: *Tap a line to see its English.* · **Continue** to the
questions. After the questions: ghost **Show all English** (3). Each question
screen follows the MC layout above. On a wrong answer, the line it depends on
is highlighted (no words). English is deferred here under the amended rule in
§3.6.

#### Grammar list (before 75 → after 46)

Five rows: level tag · title · readout. The readout is `80%`, or **New** when
the topic has not been attempted. INSTRUMENT requires an unknown to be stated,
and "New" states it in one word instead of the three in "not measured yet".
**Gone:** the "GRAMMAR" page head, the 14-word intro gloss (now tip
`grammar.list` on the first visit only: *Short rules, then drills. Practise
any time.*) and the footer.

#### Grammar intro (before 143 → after 131 first visit, 58 on a revisit, 45 with deferral)

- First visit (`P.grammar[topic.id]` absent): **All topics** (back) · tag ·
  title · the full summary (this is the teaching) · four examples (pairs) ·
  ghost **Source** (the cite behind it) · **Start · 5 drills**.
- Revisit (attempted): back · tag · title · the topic's **rule line** (new
  content, ≤ 15 words, §5) · the forms table if present · two examples · ghost
  **How it works** (the summary) · ghost **More examples** · **Source** ·
  **Start · 5 drills**. Under decision D2, the revisit examples show the
  Mongolian and reveal the English per row on tap (45 words).
- Expanded state lives in `S.open` and is sticky per device (§4.3), so a
  learner who always opens "How it works" keeps it open.

#### Grammar drill (before 18–24 → after 15–20)

The boxed TRANSFORM and BUILD labels are dropped. Build drills use the tile
rules above, with no "tap words below" and no "⌫ Remove last". A wrong verdict
gains a ghost **Why?** (1) that reveals the topic's rule line inside the
verdict panel. That makes it the Duolingo "Explain My Answer" pattern sourced
from the textbook.

#### Grammar done (before 18 → after 9)

**[GAMI]** `+24 XP` (≤ 2) · **3 of 5 right** · **60% overall** · **Done**.
The TOPIC and MASTERY labels and the title gloss are gone.

#### Session done (before 59–73 → after 32, plus ≤ 6 per callout)

```
Lesson done                                             ← 2 (no dashboard header)
┌ gold ─ [GAMI block ≤ 10 words: goal met · +212 XP · level progress] ┐
┌ red ── 5 day streak  /  week strip M T W T F S S ───────────────────┐ ← 10
17 of 21 right first time                                ← 6
[LOOP] 3 mistakes fixed                                  ← 3
[GAMI] callouts only when they happen: "Level 3" / "New badge: 7 day streak" (≤ 6 each)
[ Close ]
```

**Gone:** the whole `header(st,'Finished')` (14 words of lifetime telemetry),
the gloss repeating the grid, the WEEK label, the REVIEWS/CORRECT/KNOWN/LEVEL
grid glosses, and the KNOWN and LEVEL cells (they move to Progress).

#### Progress (absorbs Achievements: 59 + 77 = 136 → after 49 closed, about 95 with Numbers open)

```
This week                                    ← 2
┌ blue ──────────────────────────────────────┐
│ Reviews 54   New words 12   Newly known +3 ⓘ   On time 92% ⓘ │  ← 7 labels + 4 figures
└────────────────────────────────────────────┘
[GAMI block ≤ 20 words: level ladder, next badge with progress, badges earned]
October · 8 days                         ⓘ   ← 3
M T W T F S S + month grid                   ← 7
Numbers ›                                    ← 1, closed by default, sticky per device
```

- Tile labels are sentence-case Geologica 12px with no glosses underneath.
  ⓘ texts: *Known: memory strong enough to last 21 days.* and *Reviews done on
  or before their due day.* When a figure cannot be measured, the tile says
  **not measured yet** in place of the figure (INSTRUMENT Copy).
- **Numbers** (instrument styling, one row per figure, an ⓘ only on the
  three rows that need one):

| Row label | Value | Source |
|---|---|---|
| Words tracked | 85 | `stats().tracked` |
| Due today | 13 | `stats().due` |
| New today | 4 | session diagnostics `newCount` |
| Sentences today | 8 | `diag.sentenceCount` |
| Comprehensible today | 63% | `diag.avgComprehensibility` |
| Average recall ⓘ | 96% | `stats().avgRetrievability` (was RET) |
| Accuracy, all time | 92% | `stats().accuracy` (was ACC) |
| Known words | 15 of 2,500 ⓘ | `st.known` / `goalWords` |
| Known per day, 14 days | +0.8 / *needs two days of history* | `intakeRate` |
| B1 at this rate | Aug 2035 / *no projection at this rate* | `projectDate` |
| Words with content ⓘ | 154 | `POOL.length` (was CORPUS CEILING) |
| Best streak | 8 days | `bestStreak` |
| Reviews this month | 160 | `monthTotals().reviews` |
| Lifetime XP | 2,605 | `P.xp` (unless [GAMI] shows it above) |
| App build | `mng-3f9a…` | `caches.keys()` read once at boot; tells Fred whether the iPhone is on the new build |

- The Achievements tab is removed and its content is split between the
  [GAMI] block and Numbers (decision D5, made jointly with gamification). That
  frees a tab for **Read**.

#### Settings (before 101 → after 34 synced, about 47 unsynced)

```
┌ blue ── Online sync            On   ⓘ ┐   ← 6 (email shown raw, no "signed in as")
│         fred@…           [Sign out]    │
┌ ─────── Multiple choice        On   ⓘ ┐   ← 13 across the four rows
│         Word drills per lesson  8   ⓘ │
│         Sound [SOUND]          On     │
│         Tips              Show again   │
Backup code — optional while sync is on ›     ← 7, closed (sticky per device)
```

- Every 8–16-word caption becomes an ⓘ:
  *Lessons go up by themselves; every signed-in device matches.* /
  *Off: you type word answers instead of choosing.* /
  *Words practised alone before the sentences, when that many are due.*
- Toggle buttons lose their duplicate glosses ("On" + "on").
- The backup panel opens to **Last export 20 days ago** · **Copy** ·
  **Share** · import field (placeholder `Paste a code`) · **Import**. The
  warning **Importing replaces everything on this device and online.** shows
  only once the import box has text (`input` listener; the text lives in S, so
  it survives a redraw).
- Unsynced: the sync row reads **Online sync · Off · [Sign in]** and the
  backup panel is open, with a red spine when the code is stale (current rule).
- The "SETTINGS" page head and the footer are gone.
- **Tips → Show again** clears the `seen` map (§4.1).
- Sign-in form (`account.js:136-151`): "MONGOLIAN · SYNC" and the 17-word
  gloss become **Sign in** · *Your Life Hub email and password.*

### 2.3 Before and after, all screens

| Screen | Before | After | Notes |
|---|---|---|---|
| Today, synced | 86 | **40** | 28 without the purpose sentence |
| Today, unsynced | 104 | **51** | |
| Lesson bar | 2 | 2–4 | +[GAMI] counter |
| Deck front / back | 23 / 23 | **10 / 11** | +7 tip until first flip |
| MC before / right / wrong | 19 / 31 / 23 | **9 / 17 / 16** | phone; +4 numerals on the laptop |
| Typed before / right / wrong | 12 / 22 / 22 | **6 / 16 / 18** | |
| Sentence before / right / wrong | 12–14 / 32 / 32 | **9 / 24 / 26** | alt +2 (was +8), typo +5 (was +12) |
| Tiles | — | ≤ 16 | [LOOP] |
| Grammar list | 75 | **46** | |
| Grammar intro first / revisit | 143 / 143 | **131 / 58** (45 with D2) | |
| Grammar drill / done | 18–24 / 18 | **15–20 / 9** | |
| Session done | 59–73 | **32** | +≤ 6 per callout |
| Progress + Achievements | 59 + 77 | **49** | Numbers open: about 95 |
| Settings, synced | 101 | **34** | |
| **Five tab pages, synced** | **398** | **169** | **−58%** |

Share of words in ≤ 11.5px mono on learner screens: 56–93% before, **≤ 10%**
after (numerals and intervals only). Numbers and Details are exempt.

### 2.4 Step by step: one day

1. Fred opens the app. Today shows his sentence, the goal meter, his streak
   and one red button with **Start · 21 items · ~7 min**. Nothing else.
2. He taps Start. A new word faces up. The first time ever, a line under it
   says *Tap the card to see the English*; after his first flip that line is
   gone for good.
3. A multiple-choice card. He picks wrong: **Wrong**, the pair, **Again later
   this lesson**, Continue. He taps ⓘ out of curiosity and sees `RECALL
   BEFORE 41%`. Details stays open for the rest of the lesson until he closes
   it.
4. A sentence. He types it, slightly off: **No match**, the diff, **You
   wrote: …**, **Again later this lesson**. A few items later it comes back
   [LOOP].
5. Lesson done: **Lesson done**, the goal met [GAMI], his streak, **17 of 21
   right first time**, **3 mistakes fixed**. Close.
6. On Progress he opens **Numbers** to check RET and the content ceiling. It
   stays open on this device the next time.

---

## 3. Mechanics

### 3.1 The hint system (`core/hints.js`, DOM-free)

A **hint** is an explanatory caption from one registry, `HINTS`. It is never
a translation; translations use `gl()` (§3.6).

```js
// src/core/hints.js
export const HINTS = {
  'deck.flip':      { text: 'Tap the card to see the English.', retire: 'action', after: 'gone' },
  'card.easy':      { text: 'Easy: you knew it instantly, so it waits longer.', retire: 'action', after: 'about' },
  'progress.known': { text: 'Known: memory strong enough to last 21 days.', retire: 'day', after: 'about' },
  'numbers.b1':     { text: '2,500 words is a research estimate for B1, not a CEFR figure.', retire: 'never', after: 'about' },
  // … full list in §5.1
};
export function hintState(id, seen, today, { dev = false } = {})  // → 'inline' | 'about' | 'gone'
export function pickHint(ids, seen, today, opts)                    // → the one id shown inline on this screen, or null
export function markSeen(p, ids, today)                             // → true if p.seen changed (only adds; never overwrites)
export const BUDGETS = { today: 30, todayUnsynced: 42, settings: 36, progress: 50, mcBefore: 8, mcAfter: 14, done: 30 }
```

Rules:

1. **Retirement.** `retire: 'day'`: inline while `seen[id]` is absent or
   equals today, so it stays put through every redraw of the day it first
   appeared. `retire: 'action'`: inline until the controller calls
   `markSeen` for the action it explains (first flip, first Easy, first tile
   check, first line tap). `retire: 'never'`: always an ⓘ only (Numbers rows).
   After retirement, `after: 'about'` leaves an ⓘ and `after: 'gone'` leaves
   nothing; the latter is used only where the control is self-evident once
   used.
   *Why:* explanations help novices and turn into redundant load once the
   learner has the idea (expertise reversal: `research-science.json` item 2b,
   Kalyuga 2003; item 6, the redundancy principle). Fade on use, not on a
   timer (adaptive fading beat fixed fading, Salden 2010, item 2b).
2. **At most one inline hint per screen.** Each view declares its candidate
   ids in priority order, `H.pick([...])`, and only the winner renders inline.
   The others render as ⓘ and are **not** marked seen, so they get their turn
   on a later screen or day.
   *Why:* coherence principle, 23 of 23 tests, median d≈0.86; seductive
   details g≈−0.33 (item 6). Several new tips on day 1 would recreate the
   problem.
3. **Before an answer, only action hints.** Before a question is answered,
   the only hints allowed are the ones that explain how to answer
   (`deck.flip`, `tiles.how`, `read.tap`). Every other hint waits for the
   verdict.
   *Why:* working memory is busy with recall (item 6, "every label… competes
   with the Mongolian being processed").
4. **Placement.** A hint renders directly under the element it explains, and
   an ⓘ sits on the same row as its label. Never in a footer.
   *Why:* split attention, d≈0.85 (Ginns 2006, item 6).
5. **Every hint is always reachable.** Anything not inline has an ⓘ, except
   `after:'gone'` hints. Settings → Tips → Show again clears `seen`.
   *Why:* progressive disclosure fails when essentials are hidden (NN/g,
   item 6 URL).
6. **Copy rules (enforced by tests).** English only (no Cyrillic, matching
   `/[Ѐ-ӿ]/`), ≤ 12 words, sentence case, instructional and never
   flattering (INSTRUMENT Copy). A hint carries no live figure; figures belong
   to the screen. Constants such as 21 days or 2,500 are fine.
7. **`?dev` switch** (like `?fake-sync`): every hint and every disclosure
   renders open, and nothing is marked seen. This is Fred-the-developer's
   drawer, and it needs no extra UI.

### 3.2 Marking "seen"

- `render()` builds a hint context `H = hintCtx({ seen: P.seen, today, dev, open: S.open })`
  and passes it to the views. `H.hint(id)` returns HTML and records the id in
  `H.shown`. After `el.innerHTML = …`, `render()` calls
  `markSeen(P, H.shown.filter(day-retiring), today)` and `save(P)` only if
  something changed.
- Action hints are marked inside the click handler for that action: `flip`,
  the first `card-next` with g=4, the first tile check, the first reading line
  tap.
- **No redraw loop:** `markSeen` writes only absent keys, and a hint seen today
  is still inline, so the sync echo → `adopt()` → `render({keep:true})` path
  produces identical HTML and writes nothing.

### 3.3 Disclosures and their state

- **Disclosure row:** `<button class="disc" data-act="open" data-id="numbers" aria-expanded="false" aria-controls="d-numbers">Numbers <span>›</span></button>`.
  When `S.open.has(id)` the body renders with `.reveal` (the existing 180ms
  `rise`). The chevron swaps glyph (› to ⌄) with no animation, so no new
  motion vocabulary is needed.
- **ⓘ:** `<button class="info" data-act="about" data-id="progress.known" aria-expanded="false" aria-label="What is this?">i</button>`,
  an 18px circle inside a 26px target (the `.syncdot` trick of negative
  margins). It toggles `about:<id>` in `S.open`.
- **Depth cap: two levels** (screen → disclosure → ⓘ inside it). No
  disclosure inside a disclosure.
- **State lives in `S.open` (a Set)**, never in the DOM, so a sync redraw
  (`adopt()` → `render({keep:true})`) keeps everything open. Lifetimes:
  - `about:*` ids are S-only and cleared whenever `renderKey()` changes
    screen or question.
  - Sticky ids (`numbers`, `backup`, `details`, `grammar.how`,
    `grammar.examples`) are mirrored to the per-device prefs key (§4.2), so
    Fred's choice holds across visits and reloads on that device.
- Verdict **Details** is sticky per device, deliberately: a developer who
  wants the instrument gets it on every verdict, and a learner who never taps
  never sees it.
  *Why:* Duolingo shows explanations only on request ("Explain My Answer",
  Smart Tips; `research-competitors.json`, "Explanations only when asked").
  Duostories hides word hints behind a button (same file, "Duolingo Stories").

### 3.4 Interval wording ("numbers are real", plainly said)

- New `whenBack(ivl)` in `core/fsrs.js`, computed from the same day-level
  rounding `applyGrade` uses: `d = Math.max(1, Math.round(ivl))`
  (`scheduler.js:200`). Refactor that line into an exported `dueDays(ivl)` so
  the label and the schedule cannot disagree.
- Wording: `d = 1` → **Back tomorrow**; `2–13` → **Back in N days**;
  `14–59` → **Back in N weeks** (rounded to the nearest week); `≥ 60` →
  **Back in N months** (days/30.4, rounded).
- With a retry queued by [LOOP]: **Again later this lesson**. That line is
  true because the retry is real.
- Grade-bar cells keep their compact interval (`13d`, `1.1mo`), but computed
  from `dueDays()`, never hours. The current "NEXT 4h" is false: nothing comes
  back in 4 hours (`audits-loop.json`, "the NEXT interval readout is false").
  This rounding fixes that independently of the loop.

### 3.5 Typography (base.css)

| Element | Before | After |
|---|---|---|
| Section header `.h` | mono 10px uppercase `.12em` | new `.sh`: Geologica 13px 600, `--ink2`, sentence case |
| Tab label | mono 10px uppercase | Geologica 12px 500, active 600 `--ink` |
| Hint `.tip` | — | Geologica 13px/1.45, `--ink2` |
| Verdict | `.lab` 9.5px boxed uppercase | `.verdict`: Geologica 15px 600 green/red, sentence case ("Correct", "Wrong", "No match", "Spelling") |
| Consequence line `.when` | `NEXT` mono + interval | Geologica 13px `--ink2` ("Back in 13 days") |
| Content English pair `.gl` | mono 11.5px, **forced lowercase** | mono 11.5px, `text-transform:none` (no more "b1") |
| Figure units `.big .u` | already Geologica | unchanged |
| `.lab`, `.mono` uppercase | everywhere | only inside Numbers and Details |
| Week strip letters | mono 9px | Geologica 11px |
| `.choice .k` numerals | always | hidden under `@media (hover: none)` |
| `.foot` | 4 screens | removed from the views |

Mongolian stays the largest thing (INSTRUMENT principle 4 holds). No text is
below 11px except numerals. Gold is still never type.

### 3.6 Translations: deferred, never removed (the reconciliation)

INSTRUMENT principle 5 and its Layout paragraph say content glosses "are
never cut: the rule is fewer elements, not less translation". The app already
defers in three places without saying so: a question prompt's English is the
answer (shown at the verdict), and a flashcard's English is behind the flip.
The rule therefore becomes explicit:

> **A translation pair may be deferred, never removed.** Where the English is
> what is being tested or read for (a prompt until it is answered, a
> flashcard until it is flipped, a reading line until it is tapped, a grammar
> example on a revisit), the English sits one tap away on the same screen,
> the tap is never penalised, and once the question is settled the pair is on
> screen. Everywhere else the pair is shown.

- `gl()` keeps exactly one meaning: content-pair English, rendered
  unconditionally where the rule says "shown". CLAUDE.md already describes it
  that way. Every explanatory use of `gl()`/`gli()` (purpose band, Today
  glosses, Progress, Achievements, Grammar list, Settings `g()`,
  `account.js` `gl()`) moves to `hint()` or is deleted.
- Context chips, the deck back, grammar examples on a first visit, and the
  verdict's word pair all remain unconditional.
- *Why:* first-language glosses beat target-language ones, 45% vs 27%
  immediate (Yanagisawa et al. 2020, item 3b). Deferral keeps the gloss one
  tap away, which is where that finding places it, and turns rereading into
  retrieval (item 6, relevance).

---

## 4. Data & state

### 4.1 Synced: `P.seen` (recommended under D3)

- `blank()`: `seen: {}`, a map `{ [hintId]: 'YYYY-MM-DD' }`, the local day
  the hint was first shown or its action first done. It is a map, never an
  array (arrays sync whole; `audits-plat.json`, "how a new field travels").
- **Layout:** it lands in `main` automatically (`toDocs` puts `...rest` there,
  `sync.js:85-86`). `diff()` sends one op per new key
  (`main.seen.deck.flip`). No new Firestore document, so the rules need no
  change.
- **mergeStates** (first sign-in): union by key, keeping the earlier day.
  Add one rule next to badges (`sync.js:260`):
  `out.seen = unionEarliest(a.seen, b.seen)`. Without it,
  `Object.assign(blank(), other, primary)` drops the other device's keys and
  the join batch deletes them online (`audits-plat.json`, "mergeStates and
  rebase drop unknown fields").
- **rebase** (offline changes): add `main.seen.*` to `isEarliest`
  (`p.length === 3 && p[0] === 'main' && p[1] === 'seen'`), so the earlier
  day wins deterministically. It is not a counter, so `isCounter` is
  untouched.
- **Show again** sets `P.seen = {}`. `diff()` emits deletions, and deletions
  pass through rebase as they are (`sync.js:311`).
- **Old builds** (an iPhone app sitting on a pre-change build) keep `seen`
  untouched: `normalise()`/`fromDocs()` carry unknown fields
  (`progress.js:139`, `sync.js:104`). An old build's first-join merge would
  take `seen` whole from one side, and the only effect is that a hint
  reappears.
- **Backup-code safety:** additive only. A v1 code imports with `seen: {}`,
  and so does a v2 code written before the field existed. Tips show once
  more; nothing is rejected. `importCode()` replaces `seen` along with
  everything else (`commit(P, {replace:true})`), as it does for every field.
- **Fake sync:** `seen` lives in the `?fake-sync` progress copy, so the real
  progress is never touched.

### 4.2 Device-local: `${KEY}:prefs`

- A new `src/ui/prefs.js`, shared with the Sound workstream (which stores
  `sound` here, `audits-plat.json`, "mute preference storage"):
  `readPrefs()` / `writePrefs(patch)`, each wrapped in try/catch, under the key
  `` `${KEY}:prefs` `` so `?fake-sync` copies stay isolated and `smoke.html`'s
  cleanup regex removes them.
- Shape: `{ sound?: boolean, open?: string[] }`. `open` lists the sticky
  disclosure ids (§3.3). It is read once at boot into `S.open`, and each
  toggle writes it back. It is not in `P`, not synced and not in the backup
  code: whether Numbers is open is a per-device habit.

### 4.3 Session-only: `S`

- `S.open: Set<string>`, initialised from prefs. `about:*` ids are removed
  whenever `renderKey()`'s screen or question part changes. `advance()`
  clears nothing else.
- `S.importText: string`, mirrored from the import box's `input` event, so
  the import warning survives a redraw. The box value itself is already
  protected by `quiet()` (`app.js:42-47`).
- A module constant `DEV = params.has('dev')`, next to `fake`.

### 4.4 Test hooks (not text)

The Today root becomes `<section class="today" data-tracked="85" data-due="13">`,
so `smoke.html` no longer depends on the words "N words tracked"
(`smoke.html:72-73, 96, 117-130, 161`). Content nodes (prompt, options,
answers, pairs, purpose, passages) carry `data-content` so the word-budget
test (§6) counts chrome only.

---

## 5. Content

### 5.1 Hint copy (English chrome: no native review needed)

| id | Where | Text | Retire / after |
|---|---|---|---|
| `today.week` | Today, week panel | A day counts once you finish that day's lesson. | day / about |
| `deck.flip` | Deck front | Tap the card to see the English. | action (flip) / gone |
| `deck.choose` | Deck buttons | Learn: practise it from today. I know this: skip ahead. *[LOOP finalises]* | day / about |
| `card.easy` | Right verdict | Easy: you knew it instantly, so it waits longer. | action (g=4) / about |
| `card.retry` | Wrong verdict | Missed answers come back before the lesson ends. *[LOOP]* | day / about |
| `verdict.alt` | Alt matched | Your wording differs from the listed answer and still counts. | day / about |
| `verdict.typo` | Typo | One letter out: counted right, graded Hard. | day / about |
| `verdict.appeal` | "I was right" | Tap if yours means the same. It is graded Hard. *[LOOP]* | action / about |
| `tiles.how` | Tiles | Tap blocks in order. Tap a placed block to undo. | action (first check) / gone |
| `read.tap` | Reading | Tap a line to see its English. | action (first tap) / gone |
| `grammar.list` | Grammar tab | Short rules, then drills. Practise any time. | day / gone |
| `progress.known` | Progress tile | Known: memory strong enough to last 21 days. | day / about |
| `progress.ontime` | Progress tile | Reviews done on or before their due day. | day / about |
| `progress.month` | Month grid | Each filled square is a day you finished a lesson. | day / about |
| `numbers.recall` | Numbers | Average chance you would recall a tracked word today. | never / about |
| `numbers.b1` | Numbers | 2,500 words is a research estimate for B1, not a CEFR figure. | never / about |
| `numbers.content` | Numbers | Words the app has sentences for. New content raises it. | never / about |
| `settings.sync` | Settings | Lessons go up by themselves; every signed-in device matches. | day / about |
| `settings.mc` | Settings | Off: you type word answers instead of choosing. | day / about |
| `settings.drills` | Settings | Words practised alone before the sentences, when that many are due. | day / about |
| `settings.backup` | Backup row | The online copy is your backup. A code is a spare. | never / about |

Other workstreams add their own ids to the registry under the same tests.

### 5.2 Grammar rule lines (new, small; under the topic's existing review flag)

Each topic in `src/data/grammar.json` gains:

- `rule`: one English sentence, ≤ 15 words, the gist of `summary`. Shown on
  a revisit and behind **Why?** on a wrong drill.
- `forms` (optional): the suffix variants as a compact table, e.g.
  `{ "а/у": "-тай", "э/ү/и": "-тэй", "о": "-той" }`.

Modelled on the books' layout of "one rule, then a vowel-harmony table". The
rule lines are written fresh: no wording or table layout is copied, and each
cites pages the way `tools/alternatives.py` does. Printed page numbers:

| Topic | Existing cite | Table pattern modelled on |
|---|---|---|
| `g_byna` | Nomiin Ger L5, p.48-50 | Nomiin Ger L5 situational choice (printed p.60, PDF 61) |
| `g_qparticle` | Nomiin Ger L1, p.2-5 | Survival Book particle rule plus cloze, printed p.12-13 (PDF 14-15) |
| `g_tai` | Nomiin Ger L2, p.11-14 | Survival Book -тай harmony table, printed p.75 (PDF 77) |
| `g_accusative` | Modern Mongolian Ch.1, p.5-6 | MM accusative table, printed p.5 (PDF 17) |
| `g_habitual` | Modern Mongolian Ch.4, p.35-38 | MM habitual paradigm in the same pages |

**Review:** the five topics already ship `reviewed: false`. The rule lines
and forms tables go through the existing grammar section of
`tools/review-sheet.py` (`:174-178, 245-251`), one extra line per topic.
That takes **about 10 minutes of Luna's time**, folded into her next grammar
pass. Sarnai is not needed.

### 5.3 Nothing else

Every other change is deletion, relocation or English chrome. No Mongolian
is written by this workstream outside the five `forms` tables, which reuse
suffixes already present in each topic's summary.

---

## 6. Build

### Files and functions

| File | Change |
|---|---|
| `src/core/hints.js` **(new)** | `HINTS`, `hintState`, `pickHint`, `markSeen`, `BUDGETS` (§3.1). DOM-free. |
| `src/core/fsrs.js` | `whenBack(ivl)`, `fmtDays(ivl)` (day-rounded compact form). |
| `src/core/scheduler.js` | Export `dueDays(ivl)` and use it at `:200`. |
| `src/core/progress.js` | `blank().seen = {}`. |
| `src/core/sync.js` | `mergeStates`: `unionEarliest` for `seen`; `isEarliest`: `main.seen.*`. |
| `src/ui/prefs.js` **(new, shared with Sound)** | `readPrefs`, `writePrefs`. |
| `src/ui/views.js` | Add `hintCtx()` → `H` with `.pick/.hint/.about`; `disc(id, label, open, body)`; `details(rows)`. Keep `gl()` for content pairs only. Delete `header()` from Today and Done (keep it only if Numbers reuses parts). Rewrite `viewToday`, `viewProgress` (+ `numbersPanel`, [GAMI] slot), `viewGrammarList`, `viewGrammarIntro(topic, attempted, H)`, `viewGrammarDrill` (no boxed labels, **Why?**), `viewGrammarDone`, `viewDeck`, `viewCard`, `viewSentence` (verdict + Details), `viewDone`, `backupNotice`, `lessonBar(done, total, extra)`, `tabBar` (Read tab per D5). Remove `viewAchievements` (D5) or cut it to the [GAMI] block. Drop every `.foot`. |
| `src/ui/app.js` | `S.open`, `S.importText`, `DEV`; build `H` in `render()` and `markSeen` after it; acts `open`, `about`, `tips-reset`; action `markSeen` in `flip`, `card-next` g=4 and (with [LOOP]/[READ]) tile check and line tap; prune `about:*` on key change; rewrite `settingsPage()`; `data-tracked`/`data-due` on Today; read the build name from `caches.keys()` once in `boot()`. |
| `src/ui/account.js` | `describe()` notes → `hint` ids or deleted; shorter `todayNotice()` copy; `FORM` gloss. |
| `src/ui/base.css` | §3.5: `.sh`, `.tip`, `.info`, `.disc`, `.verdict`, `.when`, tab label, `.gl` no lowercase, week letters, `@media (hover:none) .choice .k {display:none}`. Reduced-motion already covers `.reveal`. |
| `src/data/grammar.json` | `rule` + `forms` per topic (§5.2). |
| `tools/review-sheet.py` | Show `rule`/`forms` in the grammar section. |
| `build.py` **(shared with Sound)** | Generalise `:66-67` and `:71`: copy every `src/ui/*.js` except `app.js`, and rewrite `from './(\w+)\.js'` to `./ui/\1.js`. Otherwise `prefs.js` is missing from `dist/` and the built app paints nothing (`audits-plat.json`, "build trap"). |
| `src/sw.js` | No change (build stamps the precache list). |

### Tests

**`tools/test.html`**: a new section, `hints and disclosure`:
- registry ids are unique; every text has ≤ 12 words, contains no Cyrillic,
  and starts with a capital letter;
- `hintState`: 'day' is inline on the day first seen and 'about' the next
  day; 'action' is inline until marked; 'never' is always 'about'; `dev`
  makes everything inline;
- `pickHint` returns at most one id, in priority order, and skips seen ids;
- `markSeen` only adds, keeps the first day, and returns false when nothing
  changed;
- `whenBack`/`fmtDays` against `dueDays()` over ivl ∈ {0.01, 0.2, 0.5, 1.4,
  2.6, 13, 13.6, 45, 400}: the label equals what `applyGrade` sets, and never
  prints hours;
- every `grammar.json` topic has a `rule` of ≤ 15 words.

Additions to existing sections:
- `backup survives the redesign fields` (`test.html:773-811`): `blank().seen`
  is `{}`; `seen` round-trips through a code; a v1 code and a pre-field v2
  code import with `seen: {}`.
- `sync: layout online` (`:863`): `seen` lands in `main`.
- `sync: what a change sends` (`:915`): a new hint is exactly one op,
  `main.seen.<id>`. Leave the 2-op grade contract at `:925` untouched.
- `sync: two copies combined` (`:949`): the union keeps both devices' keys
  and the earlier day.
- `sync: rebase` (`:989`): an offline `main.seen.x` against a server value
  keeps the earlier day.

**`tools/engine-test.html`**: two devices mark different hints while offline,
then reconnect: both keys are online and on both devices. On first sign-in, a
device with local `seen` keys merges with the online copy without losing
either side.

**`tools/smoke.html`** (built app):
- Replace the `.top .sub` waits and the `startsWith('N words tracked')`
  checks with `.today[data-tracked]` and `dataset.tracked === 'N'`.
- Update the copy checks: "Export a backup code" → "Not backed up";
  "sign in under settings to sync it" → "Tap to sync". Keep "optional while
  sync is on" (the Settings backup row keeps that phrase on purpose).
- New, word budgets: count chrome words (excluding `[data-content]`) on Today
  (synced and unsynced), Settings (synced), Progress (Numbers closed), the
  first MC card before and after answering, and Done. Assert each is
  ≤ `BUDGETS` imported from `dist/core/hints.js`. This is the regression guard
  every later workstream runs into.
- New, disclosure survives sync: open **Numbers** on the laptop, grade a card
  on the phone, wait for the laptop's redraw (`adopt`), and assert Numbers is
  still open.
- New: while synced, the Settings backup panel is closed and the
  `[data-act=open][data-id=backup]` row exists.
- New: a lesson card renders with no `.mono` uppercase text outside
  `.lessonbar` and Details.

### Docs

- **INSTRUMENT.md**: amend principle 5 and the Layout paragraph (the deferral
  rule, §3.6). Replace the Type table rows (§3.5). Copy: "telemetry and system
  labels are uppercase Latin mono" becomes "Learner screens speak plain
  sentence-case English (*Back in 13 days*, *Average recall*). Mono labels live
  in Numbers and Details." Components: the grade bar's interval is
  "day-level, as `applyGrade` schedules it"; the MC `NEXT` readout becomes the
  `.when` line; add **Hint**, **ⓘ**, **Disclosure row**, **Numbers**,
  **Details**. Layout: add "One task per screen", the one-hint rule and the
  word-budget table. Motion: no change (disclosure bodies use the existing
  `rise`).
- **CLAUDE.md**: delete the stale "Interface chrome is Mongolian; telemetry
  labels are uppercase Latin mono." Reword the `gl()`/`gli()` sentence: "`gl()`
  renders content-pair English; explanation goes through `hint()` and the
  `core/hints.js` registry and retires after first use." Add `seen` under
  State, `${KEY}:prefs` (with Sound), `?dev`, and "smoke checks word budgets".
  Fix the stale mcMode «Сайн»/«Дахин» note.

---

## 7. Size & dependencies

| Step | Size | Contents | Needs first |
|---|---|---|---|
| **E1 Foundations** | **M** | `core/hints.js` + tests; `P.seen` + merge/rebase + backup/engine tests; `prefs.js`; `S.open`; `hint()/about/disc`; CSS typography; `build.py` generalisation | nothing |
| **E2 Tab pages** | **M** | Today, Progress + Numbers (Achievements folded in), Settings + backup disclosure, Grammar list/intro/drill/done, Done, account.js copy, smoke updates + budgets, INSTRUMENT/CLAUDE.md | E1 |
| **E3 Question screens** | **S** | deck/MC/typed/sentence chrome, verdict layout, Details, `whenBack`/`dueDays` | E1; verdict contract agreed with [LOOP] |

**About 3 focused sessions in all.** E1 + E2 depend on no other workstream,
and they answer point 5 visibly, so **land them first of the whole plan.**
Every later screen then gets built with the primitives and against the
budgets, instead of being retrofitted.

Interfaces:

- **[LOOP]** gives the verdict view a `{ kind: 'right'|'wrong'|'typo'|'alt',
  retryQueued, capReached, gradeOptions, appeal }` object; E renders it inside
  the budgets in §2.2. The tiles and retry screens use `tiles.how` and
  `card.retry`. `dueDays()` is shared with the loop's honesty fix.
- **[GAMI]** fills four slots: Today goal (≤ 5 words, inside the gold panel),
  lesson-bar counter (≤ 2), Done block (≤ 10, plus callouts ≤ 6 each), and the
  Progress block (≤ 20). It co-decides D5 (Achievements merge). Any figure it
  adds must have a source row in Numbers or be derivable from one.
- **[SOUND]** shares `prefs.js` and the `build.py` change, and gets one
  Settings row (≤ 2 words plus an ⓘ).
- **[READ]** takes the deferral rule (§3.6), `read.tap`, a "Read" tab slot,
  and the budgets ≤ 8 per passage screen and ≤ 12 per question.
- **[CONTENT]** adds `rule`/`forms` to every new grammar topic. A future
  per-unit guidebook (the Duolingo pattern) lives behind a disclosure, never
  inline.

Unblocks: every other workstream's UI (primitives plus budgets), reading's
hidden-English design (the rule amendment), and an honest interval line before
the loop lands.

---

## 8. Decisions for Fred

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | **Typography** | A: sentence-case Geologica labels, mono only for numerals and inside Numbers/Details · B: keep uppercase mono labels, just fewer · C: as is | **A.** It is the biggest legibility gain and removes the forced-lowercase "b1" bug. It changes v3's boxed-label signature, so INSTRUMENT needs the amendment. |
| D2 | **Where English may be deferred** | A: reading lines only · B: A + grammar examples on a revisit · C: nowhere (readings show English) | **B.** It turns rereading into recall and cuts the revisit to 45 words. The rule text in §3.6 covers both. |
| D3 | **Hint memory** | A: synced `seen` map · B: per device (tips show once on the laptop and once on the iPhone) · C: derived only, no new field | **A.** Fred uses two devices, and a repeat tip is exactly the text he complains about. The cost is one merge rule and one rebase rule, plus tests. |
| D4 | **Telemetry home** | A: Numbers on Progress + Details on verdicts + `?dev` · B: a separate Stats tab · C: delete it | **A.** Nothing is lost and nothing costs a tab. |
| D5 | **Achievements tab** (with [GAMI]) | A: fold into Progress, free the tab for Read · B: keep it at ≤ 40 words | **A.** |
| D6 | **Interval wording** | A: "Back in 13 days" · B: "NEXT 13d" | **A.** It is readable, and it is honest once day-rounded. |
| D7 | **Grammar intro, first visit** | A: full summary open on the first visit, collapsed afterwards · B: always collapsed | **A.** Teach first, then get out of the way (expertise reversal). |
| D8 | **Today's top line** | A: date + sync dot only · B: move the dot onto the Settings tab and drop the date · C: keep the header | **A.** It keeps the dot where Fred approved it on 29 Sep. |
| D9 | **When a tip retires** | A: at the end of the day it first appears, or on first use · B: after 3 days shown · C: only via a "Got it" button | **A.** B needs a counter field; C adds a button to every tip. |

---

## 9. Risks and how each is contained

| Risk | Containment |
|---|---|
| Something essential gets hidden | Every non-gone hint keeps an ⓘ; Settings → Tips → Show again; `?dev` opens everything; the depth cap is 2 levels; budgets are ceilings, not targets. |
| Translations disappear by accident | `gl()` is content-only by definition; explanation moves to `hint()`; a test forbids Cyrillic in hints; INSTRUMENT states the deferral rule. |
| Disclosures snap shut on sync redraws | State lives in `S.open` plus prefs, never in the DOM; a smoke check grades on the phone while Numbers is open on the laptop. |
| A render-time "seen" write loops with the sync echo | `markSeen` only adds; a hint seen today stays inline, so the echo produces the same HTML and writes nothing. |
| Two devices lose each other's hints on first sign-in | A union rule in `mergeStates` and `isEarliest` in rebase; engine-test covers both. The worst case on an old build is one repeated tip. |
| Backup codes break | The field is additive with a `{}` default; v1 and pre-field v2 import tests are extended. |
| `prefs.js` missing from `dist/` gives a blank app | `build.py` is generalised; the smoke test already times out on a blank app. |
| Smoke selectors break (`.top .sub`, copy) | Moved to `data-tracked`; copy checks updated in the same change; the key phrase "optional while sync is on" is kept. |
| Fred-the-developer loses telemetry | All of it is in Numbers/Details (table in §2.2), plus the App build row for stale iPhone builds. |
| Other workstreams re-grow the text | Budgets live in `core/hints.js` and are asserted in smoke; every new hint goes through the registry tests. |
| The redesign changes v3's identity (boxed mono labels) | Kept inside Numbers/Details. D1 is Fred's call, and INSTRUMENT is amended in the same commit, so no later agent "restores" the old style. |
| One hint per screen makes onboarding slow | Unpicked hints wait their turn and are reachable by ⓘ at once; Fred is a single, already-onboarded user. |
| `(hover:none)` hides key numerals on a touch laptop that has a keyboard | Numbers 1–4 still work as keys; only the printed glyph is hidden. |

---

## 10. Versus Ling

Ling's own blog and three independent reviews (in
`research-competitors.json`) describe a points/leaderboard/fluency-% layer with
mascot celebrations, very few grammar explanations, and **no translations of
individual words**. Its Mongolian course has not been reviewed independently,
so this compares against Ling's template, not a verified Mongolian experience.

What this workstream gives Fred that Ling does not:

1. **Every Mongolian word has its English one tap away**: context chips,
   tap-a-line in readings, deferred and never removed. Reviewers name the lack
   of per-word translation as a Ling weakness.
2. **Explanations on request, cited to his own textbooks.** "Why?" on a wrong
   grammar answer reveals a rule line sourced to a printed page of Nomiin Ger,
   Modern Mongolian or the Survival Book. Ling has thin grammar notes; Duolingo
   has "Explain My Answer" but no textbook behind it.
3. **One task per screen with honest numbers kept, not cut.** Ling adds a
   leaderboard and a fluency percentage. This design removes chrome, but every
   real figure (recall, accuracy, B1 projection, content ceiling, app build)
   is one tap away in Numbers or Details, and every interval shown is the one
   the scheduler will actually apply.
4. **Explanations that fade as he learns** (expertise reversal), synced
   across his laptop and iPhone, instead of the same instructions on every
   lesson.
5. **A word budget enforced by a test**, so the app stays quiet as reading,
   tiles, sound and the game layer are added.
