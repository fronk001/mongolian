# Workstream D: gamification that is simple, honest and easy to follow

This answers Fred's feedback point 4. It covers what game elements exist, how each one is calculated, and what each one is not allowed to do. The Less-text workstream (E) owns layout and word budgets. Where this design needs more room than E's slots give, it says so in §7.

Textbook pages are **printed** page numbers. The PDF page is given in brackets the first time a page appears (Beginner Mongolian: PDF = printed + 1; Survival Book: PDF = printed + 2; Modern Mongolian: PDF = printed + 12).

---

## 1. Problem

Fred, verbatim: *"the gamification is absolutely shit and too hard to follow."*

The code agrees. Every point below is from `audits-gami.json`, measured on the shipped modules.

- **Two currencies that never connect.**
  - XP is `6 + min(14, stability gained)` per graded word (`src/core/goals.js:237-243`, added at `src/ui/app.js:378-380`). It reaches 1,558 by day 14 and 8,409 by day 60, and it buys, unlocks and compares to nothing.
  - Level is a threshold on known words (`goals.js:213-227`). Achievements prints "2605 XP" beside "level 2" with the caption "xp comes from reviews graded" (`src/ui/views.js:330-339`).
- **The level lags, jumps, then freezes.**
  - It stays at 1 for 15 days, jumps from 2 to 4 between days 16 and 27, and stops at 5 on day 40.
  - Level 6 needs 175 known words, but only 154 drillable words exist. So 9 of the 14 levels cannot be reached.
- **Badges are front-loaded, partly dead and opaque.**
  - 6 of the 12 arrive in week 1.
  - `backup` cannot be earned while sync is on (`app.js:265, 287-291`), and `known250` cannot be earned with this corpus.
  - Locked badges render only as "+10" (`views.js:153-165`).
- **The goal swings by years.** The B1 projection moves 2029 → 2027 → 2034 → none → 2071 over 120 simulated days (`goals.js:185-206`, `views.js:343-358`). A red "CORPUS CEILING" line beneath it says the projection cannot be met.
- **The week and streak are said five ways on Today, and the game is invisible where studying happens.** Today repeats the week and streak five times (`views.js:252-270`) but shows no XP, level or badge. XP appears only after Close (`views.js:702-747`).
- **Two loopholes bend "numbers are real".**
  - "I know this" earns the 20-XP cap with no recall at all (`app.js:450`, initial stability 16.15, `fsrs.js:21, 42`).
  - Grammar drills replay in the same seeded order with no daily limit, for up to 30 XP a replay (`app.js:401-419`, `goals.js:253-258`).
- **The streak cannot survive a day with nothing to do.**
  - A finished session is the only thing that makes a study day (`goals.js:13-15`).
  - When nothing is due, Start is disabled ("Nothing due today", `views.js:236, 280-281`), so an empty day breaks the streak through no fault of Fred's.
  - Past the content ceiling (new material runs out on day 31-35, `content-fit.json` ceiling_note) such days happen.

The audit's synthesis is the brief for this design: the fix is **subtraction and connection, not more mechanics**.

---

## 2. What Fred will experience

### 2.1 The model in one paragraph

There is **one ladder**: a path of units built from his textbooks. A unit fills as its words become familiar, and it completes when he passes its 5-question checkpoint. There is **one habit**: finish today's lesson. That fills today's square, extends the streak, and every 7 lesson days earn a rest day that covers a missed one. There is **one score**: XP, counted per answer by a rule he can check in his head. 1 for answering on the first try, +1 if right, +1 more if typed; retries earn 0. XP is never a level, a goal or a currency. Badges sit on Progress with their progress shown. **Levels are retired**; the unit number takes their place. Today shows three things: the streak, the current unit, and Start.

### 2.2 Today (game elements only; E owns placement)

```
                                   Sun 12 Oct  ●
┌ gold ───────────────────────────────────────────┐
│ <Fred's purpose sentence>                        │
│ Unit 4 · Meals · 3 words to go           ▮▮▮▮▯  │  ← unit line, ≤ 7 words, blue meter
└─────────────────────────────────────────────────┘
┌ ─────────────────────────────────────────────── ┐
│ 12 day streak                               ⓘ   │  ← 3 words
│ ▮ ▮ ▧ ▮ ▨ ░ ░                                    │  ← ▧ = rest day, ▨ = today, not yet done
│ M T W T F S S                                    │
└─────────────────────────────────────────────────┘
[ Start · 21 items · ~7 min ]
```

**Unit line copy, by state.** Tapping the line opens Progress at the path, with the current unit expanded.

| State | Copy |
|---|---|
| Words still to make familiar | `Unit 4 · Meals · 3 words to go` |
| All words familiar; checkpoint in today's lesson | `Unit 4 · Meals · checkpoint today` |
| Checkpoint already tried today | `Unit 4 · Meals · checkpoint tomorrow` |
| Unit not started yet (no word met) | `Unit 5 · In the kitchen · 12 new words` |
| All built units done | `All units done · more coming` |

**Streak copy.**

| State | Copy |
|---|---|
| Streak n ≥ 1 | `{n} day streak` |
| No streak | `Start a streak` |

**Not on Today:** no XP, no level, no badges, no rest-day count, no B1 date. These live on Done, Progress and Numbers.

**Start copy.**

| State | Copy |
|---|---|
| Lesson available | `Start · 21 items · ~7 min` (E's copy) |
| Nothing due | `Practice · 8 items · ~3 min`. A lesson always exists (§3.7) |
| Today's lesson finished | E's `Done for today` |

**One-time hint (E's registry, ≤ 12 words, shown under the unit line on the first day after the update):** `path.intro` "Levels are now units. Tap to see your path."

**Word budget.** The game elements on Today come to **10–13 words**: streak 2–3, unit line 4–7, plus E's Start copy. That replaces E's "[GAMI goal meter] 0 of 1 lesson" slot (≤ 5 words). The net change to E's Today budget is about +2 words.

### 2.3 In the lesson

- **Lesson bar:** E's `9 / 21` counter on the left gains a live score on the right, `+18 XP` (2 words). It changes when a verdict appears, so it passes INSTRUMENT's test for what may sit on a question screen.
  - Before Continue it shows the pending points of the open verdict, and Continue commits them (§4.3).
  - A retry adds nothing, and the number simply does not move.
- **Checkpoint items** (when today's lesson carries one) look exactly like sentence items. They follow the main items and come before the reading. Two differences:
  - The question head tag is `Checkpoint 2/5` (2 words).
  - The first checkpoint item ever shows hint `path.checkpoint`: "Checkpoint: 4 of 5 right completes the unit." (8 words, once).
- **Verdicts** are unchanged by this workstream, apart from the sound and combo (Sound workstream B):
  - every 5th first-try answer in a row plays `combo`;
  - if Fred takes B's D4, the label reads `CORRECT · 5 IN A ROW`;
  - there is no XP for combos.

### 2.4 Session done: the one celebration

```
Lesson done
┌ gold ─────────────────────────────────────────── ┐
│ +46 XP                                            │  ← headline figure
│ 17 of 21 right first time · 3 mistakes fixed      │  ← A/E line (9 words)
└───────────────────────────────────────────────── ┘
12 day streak     ▮ ▮ ▧ ▮ ▮ ░ ░                       ← today's square colours in (`mark`)
Meals · +3 familiar · 2 words to go     ▮▮▮▮▯        ← unit line
── only when they happen, at most 3, in this order ──
Unit 4 complete · Meals
New badge · 25 mistakes fixed
Yesterday covered by a rest day
[ Close ]
```

**Sound.** B's `finish` cue plays, or `milestone` when `S.summary.milestone` is true (a unit, part or badge was crossed this session; §3.9).

**Motion.** Only INSTRUMENT's existing vocabulary is used:

- the container `fade`s in;
- the panels and callouts `rise`, 35 ms apart;
- today's square uses `mark` to colour in.

Nothing bounces, nothing counts up, and there is no confetti. Reduced motion disables all of it.

**Callout copy (each ≤ 6 words), in priority order:**

| Event | Copy |
|---|---|
| Part complete | `Part 1 complete · At home` |
| Unit complete | `Unit 4 complete · Meals` |
| Checkpoint failed (replaces the unit line) | `Checkpoint 3 of 5 · again tomorrow` |
| Badge earned (one line each) | `New badge · 30 day streak` |
| Rest day used | `Yesterday covered by a rest day` / `2 days covered by rest days` |
| Rest day earned | `Rest day earned · 2 saved` |
| Best day (only after ≥ 7 days scored the new way) | `Best day yet · 52 XP` |

If more than 3 events fire, the third line reads `+2 more on Progress`.

**One-time hint `done.xp`** (first Done after the update): "1 per answer, +1 if right, +1 if you typed it." (10 words). This is the formula, so Fred can check the headline.

**Word budget.** About 22 words with no callouts and 34 with three. E's ceiling is 32 + 6 per callout.

### 2.5 Progress (Achievements folded in, per E's D5)

The path comes first, because it is where he is going. The badges come second.

```
Path                         4 of 11 units · 2 ready     ← 7
✓ Units 1–3 done                                    ›    ← 3; tap lists them
Unit 4 · Meals                     ▮▮▮▮▮▮▮▯▯▯  7/10      ← 4 + figure
  Talk about meals                                        ← can-do line, 3
Unit 5 · In the kitchen · ready             [Take it]    ← 6
Unit 6 · The cat                                          ← 3
+5 more                                                   ← 2
Badges · 9 earned                                    ›    ← 3; tap shows the pills
Next: 30 day streak                 ▮▮▮▯▯  12/30          ← 4 + figure
      100 mistakes fixed            ▮▯▯▯▯  31/100         ← 3 + figure
```

**The path block** (≤ 24 words closed):

- Completed units collapse into one line.
- The current unit is open: its title, a blue meter, `have/need`, and the can-do line.
- A ready unit shows **Take it**, which starts a stand-alone checkpoint (§2.6).
- The next two units are shown by title, then `+N more`.
- Planned units (D10) show as `Coming` in grey and are excluded from the `4 of 11` count.

**Tapping a unit** expands its sheet. The open state lives in `S.open` (E §3.3), so a sync redraw does not close it. The sheet shows:

- the unit's words as content pairs (`хоол · food`), each with a state mark:
  - `✓` familiar;
  - `·` learning;
  - `○` not met yet;
- `From: Booklet days 8–9` (the source);
- a link to its grammar topic and reading passage, where the unit has one;
- the checkpoint status: `Checkpoint ready`, `Passed 13 Oct · 5 of 5`, or `Tried 13 Oct · 3 of 5`.

**The badge block** (≤ 12 words closed):

- `Badges · N earned` expands to gold pills.
- **Next** lists at most 2 locked, reachable badges, chosen by highest have/need first (closest finish line). Each has a gold meter and its `have/need`.
- Badges with no measurable progress (Perfect sentence, 10 in a row) appear only in the expanded list, each with its condition in a single line.

**This week** (E's blue panel) gains one tile: `XP 180 · last week 150`.

- The comparison is with Fred's own last week. That is the honest replacement for a league.
- Last week reads `not measured yet` until a full week has been scored the new way.

**Numbers** (E's disclosure):

| Row | Value |
|---|---|
| `Lifetime XP` ⓘ | 3,412 |
| `Best day` | 52 XP |
| `Best streak` | 21 days |
| `Rest days saved` | 1 of 2 |
| `Units done` | 4 of 11 |

The `Level` row is removed. The `numbers.xp` ⓘ text reads: "Until 20 Oct XP measured memory gained. Now 1–3 per answer." (the date is the release constant).

### 2.6 A checkpoint taken from the Path

1. **Take it** opens a 5-item run with the lesson bar.
2. A small done screen follows (≤ 10 words):
   - pass: `Unit 5 complete · In the kitchen` · `+12 XP` · `Close`;
   - fail: `3 of 5 · try again tomorrow` · `+9 XP` · `Close`.
3. It never makes a study day. Only the daily lesson does (INSTRUMENT: "a streak day requires a finished session").

### 2.7 Grammar, reading and listen practice outside the lesson

- Their done screens show `+N XP` only on the first pass of a topic that day (§3.2), and nothing on later passes.
- The tab reading's done screen (C's R3) shows `+N XP` on a first read only, and nothing on a reread.

### 2.8 Step by step: the first week after the update (for a state like the audit fixture: 85 words tracked, streak 4)

1. **Day 1.** Today shows `Unit 1 · Rooms and furniture · checkpoint today` with the `path.intro` hint. "Level 2" is gone.
   - The Path reads `0 of 11 units · 4 ready`. Units 1–4 have full bars from words he already knows, and Units 5–6 are part-filled.
   - Nothing was taken away: the bars are made of his real FSRS state.
2. He taps Start. His normal 21 items come first, then 5 checkpoint items (typed sentences about rooms), then the reading if one is ready.
3. **Done:** `+58 XP`, the streak square colours in, and `Unit 1 complete · Rooms and furniture` with the milestone chord. The `done.xp` hint explains the 58.
4. That evening he opens Progress and taps **Take it** on Unit 2. He gets 3 of 5: `try again tomorrow`. Nothing else happens, and the missed sentences came back until right inside the checkpoint (A's loop).
5. **Days 2–4.** One checkpoint rides in each lesson. Units 2–4 complete, and `New badge · First unit` arrives on day 1.
6. **Day 5.** He misses the day.
   - On day 6, Today shows yesterday's square as a rest square and the streak still reads `16 day streak`.
   - Done says `Yesterday covered by a rest day`.
7. **Day 9.** He has finished 7 lessons since the last rest day was earned, so Done shows `Rest day earned · 2 saved`.

---

## 3. Mechanics

### 3.1 The figure ledger: every game figure, its source event, and its function

| Figure | Real event it counts | Function | Shown |
|---|---|---|---|
| XP for an answer | a question answered, on its first attempt (§3.2) | `xpForAnswer()` | lesson bar, Done, small done screens |
| Lesson XP / day XP | sum of the above for the lesson, written to that day's history row (`xv: 2`) | `S.summary.xp`, `recordDay()` | Done headline; week tile |
| Lifetime XP | `P.xp`: the old formula until the release date, then the new one | existing counter | Numbers only, with ⓘ |
| Best day | max `xp` over history rows with `xv === 2`, with ≥ 7 such rows | `bestDayXp()` | Done callout, Numbers |
| This week / last week XP | sum over rows with `xv === 2` in each Mon–Sun week | `weekXp()` | Progress tile |
| Streak | consecutive lesson days, with gaps covered by earned rest days not counted (§3.4) | `streakState()` | Today, Done |
| Rest days saved | 1 earned per 7 lesson days, max 2 held, minus those used | `streakState().bank` | Numbers; Done callouts |
| Familiar words in a unit | words whose FSRS stability is ≥ 7 days | `unitProgress()` | Today unit line, Path, Done |
| `+N familiar` | words whose stability crossed 7 days during this lesson's grading | `S.summary.familiarUp` | Done unit line |
| Unit complete | its checkpoint was passed (≥ 4 of 5 right first time) while all its words were familiar | `P.units[id].passed` | Path, Done callout, badges |
| Badge | a checkable condition (§3.6) | `earnedBadges()` | Progress; Done callout |
| Badge progress | have/need from the same measure as the condition | `badgeProgress()` | Progress "Next" |
| Combo (B) | consecutive first-attempt accepted answers in this lesson | B's `S.run` | sound and an optional label only |

Every row is derived from a recorded event. Nothing on the list can move without Fred doing the work, and nothing on it is bought, random or flattering.

### 3.2 XP: a score per answer, nothing more

**Rule:**

```
xpForAnswer({ first, right, typed }) =
  first ? 1 + (right ? 1 : 0) + (right && typed ? 1 : 0) : 0
```

| Answer | XP |
|---|---|
| Typed and right on the first attempt (exact, a listed alternative, or an accepted spelling slip) | **3** |
| Right on the first attempt with help: multiple choice, building blocks, or the deck's "I know this" check | **2** |
| Wrong on the first attempt | **1** |
| Any retry, `FIX`, `STUDY`, deck "Learn" tap, reread, or appeal | **0** |

**Definitions:**

- **`typed`** means no options and no tiles were shown during the attempt. It is A's `S.attemptMin === TYPE`. Seeing the multiple-choice options and then switching to typing counts as helped (2).
- **`first`** means the item is not a retry (`!item.retry`, A).
- **`right`** means the app's verdict. An appeal ("My answer was right", A §3.7) changes neither XP nor a checkpoint score. The phrasing still goes to Luna.

**Where XP counts.** It is the same rule everywhere a question is answered:

- lesson items (cards, sentences, the deck check);
- checkpoint items;
- practice items;
- reading comprehension questions on a first read (C);
- grammar drills and listen drills (B), only on the **first pass of a topic per day**, decided when the topic is opened (`P.grammar[t]?.last !== today`). Later passes that day score 0 and show no XP line.

**Committed on Continue.** The verdict shows the pending points in the lesson bar. Continue adds them to `S.summary.xp` and `P.xp` in the same `save()` as the FSRS grade. A grade therefore still sends exactly the word and `main.xp` (`tools/test.html:925` stays green). An item abandoned before Continue is neither graded nor scored.

**No XP for anything else.** Not for finishing a lesson, streaks, units, badges, combos or opening the app. There are no bonuses and no multipliers.

**Why this formula:**

- **Fred can verify it.** Clozemaster's points are computed from the answer mode and nothing else, so every point traces to an answer (research-competitors, "Clozemaster: transparent points formula", https://docs.clozemaster.com/article/103-how-do-points-work). Today's `6 + min(14, Δstability)` is real but cannot be checked by eye, which is half of "too hard to follow".
- **Typing scores more because it teaches more.**
  - Recall and generation beat recognition: generation-effect d ≈ 0.40, Kang 2007, Nakata 2016 (research-science 2a).
  - The +1 for typed is a mild, visible nudge away from tiles and multiple choice, and it never penalises asking for help.
- **Failing first never pays.** Wrong (1) + fixed retry (0) = 1, which is less than right with help (2). This is A's stated interface condition (A §7: "a fixed mistake must never earn more than a first-try success").
- **Mistakes are not punished.** A wrong answer still scores 1, and "mistakes fixed" is celebrated as a count on Done (A).
  - Errors followed by correction help learning (Kornell 2009; Metcalfe 2017, research-science 2a).
  - Duolingo retired hearts for punishing errors (research-competitors, "Don't punish mistakes").
- **Per answer, not per word.** The lesson bar counts answers (`9 / 21`). XP per answer lets Fred estimate the score from what he can see: about 2.3 × items.

**Why XP drives nothing (no levels on XP, no XP goal):**

- Duolingo's first streak was tied to XP, and that confused users. It worked once it became "one lesson a day" (research-competitors, "Gamification that is easy to follow", https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks).
- A level built on XP would be a second ladder beside the path, which is the two-currency problem again (audit synthesis point 1).
- Points as progress indicators raise output but do not change motivation (Mekler 2013/2017). Expected, controlling rewards undermine motivation, while informational feedback raises it (Deci, Koestner & Ryan 1999; research-science 5).
- So XP stays **informational**. It is a score of today's effort, compared only with Fred's own past.

**Typical values.** A 21-item lesson is about 45–55 XP. A 5-review lesson past the content ceiling, plus a checkpoint, is about 25.

### 3.3 Levels are retired; the path is the ladder

- `LEVELS`, `levelFor()`, the level row on Achievements and Done, and `leveledTo` are removed.
- The current unit number is the only "level".
- Known words (stability ≥ 21 days) remain the long B1 meter, shown in Numbers with E's wording. They are no longer a game element.
- **Why:**
  - One ladder whose next step is always close: proximal goals beat distal ones (Bandura & Schunk 1981), and effort rises as the end nears (goal-gradient, Kivetz et al. 2006; research-science 5).
  - Duolingo replaced free choice with one guided path because learners "weren't sure they were using Duolingo the correct way" (research-competitors, "Gamification that is easy to follow", https://blog.duolingo.com/new-duolingo-home-screen-design/).
  - A known-word ladder stalls at the corpus ceiling. A unit path at least shows where the content ends ("more coming") instead of a frozen bar (audit risk 1).

### 3.4 Streak with rest days (the repair rule)

**Definitions:**

- A **lesson day** is a date with a history row, which `finish()` writes only when a lesson started from Start is finished (unchanged).
- Practice lessons (§3.7) are lessons.
- Checkpoints from the Path, grammar, reading from the Read tab and listen drills are **not** lessons.

**Algorithm** (pure, derived only from history, so it needs no stored state and no sync rule):

```
REST_EVERY = 7, REST_MAX = 2, REST_FROM = '<release day>'   // constant, set in the release commit

streakState(history, today, { from = REST_FROM } = {}):
  days  = sorted distinct history dates ≤ today
  run = best = bank = earned = count = 0; covered = Set(); prev = null
  for d of days:
    if prev and gap(prev, d) = missed days strictly between them is non-empty:
      if every missed day ≥ from and |missed| ≤ bank:
        bank -= |missed|; add them to covered          // the run continues
      else:
        run = 0                                        // the run breaks; the bank is kept
    run += 1; count += 1
    if count % REST_EVERY == 0 and bank < REST_MAX: bank += 1; earned += 1   // at the cap, it is not earned
    best = max(best, run); prev = d
  // trailing gap: from the last lesson day to yesterday (today is pending, never a miss)
  pending = days after prev, up to (today in days ? none : yesterday)
  if pending non-empty:
    if every pending day ≥ from and |pending| ≤ bank: covered ∪= pending   // drawn as rest; the streak stays alive
    else run = 0
  return { streak: run, best, bank: bank - |pending if covered|, earned, covered, pending }
```

**Properties (each pinned by a test):**

- Rest days are never counted as lesson days. A 12-day streak means 12 lessons with no uncovered gap.
- A gap longer than the bank breaks the run. Rest days are not spent on a gap they cannot cover, so the bank is kept.
- **Earning counts all of history; spending applies only to gaps on or after `REST_FROM`.**
  - At release Fred very likely holds 2 rest days, earned by real past lessons.
  - Past streaks and his best streak do not change overnight. Nothing is rewritten retroactively.
- `streak()` and `bestStreak()` become thin wrappers over `streakState()` with the same signatures, plus `opts`.
- `weekCells()` and `monthCells()` gain a `'rest'` state from `covered`. A rest square is drawn as a gold hatch: a fill, never type. It is distinct from blue (done), the red hatch (today, not yet done) and the empty gap (missed). It is never drawn as done (INSTRUMENT week-strip rule).
- `full-week` still needs 7 done squares. Rest squares do not count.
- **ⓘ copy:**
  - `today.week` (replaces E's text): "A finished lesson counts the day. Every 7 earn a rest day." (11 words).
  - `today.rest` (the first time a rest square appears): "Rest day: a missed day covered by one you earned." (10 words).

**Why:**

- Broken streaks cause drop-off, and the effect is weaker when a break can be repaired (Silverman & Barasch 2023; research-science 5).
- Duolingo's 2 freezes raised daily active learners by 0.38% (research-competitors, "Gamification that is easy to follow").
- **Earned, not bought:** a rest day comes from 7 real lessons. The cap of 2 and the rate of 1 per 7 mean the streak survives at most 1 miss per 8 days long-run, so it still measures consistency.
- **Derived, not stored:** "numbers are real", and there is nothing to sync or corrupt.
- This reverses `goals.js` design decision 1 ("There are no streak freezes"). That is decision **D3**.

### 3.5 The path: units and checkpoints

**What a unit is.** A unit is an entry in `src/data/units.json` (§4.1):

- an ordered set of 10–21 drillable lexicon ids;
- an English can-do title;
- an optional grammar topic and reading passages, as links only;
- a source cite.

Every drillable word belongs to exactly one unit. **Parts** group units and carry a part badge. Units are fixed once shipped: new words go into new units, never into old ones.

**Word states** (`wordState(p, id)`), from FSRS state only:

| State | Condition |
|---|---|
| `new` | no `P.items[id]` |
| `learning` | `P.items[id].s < 7` |
| `familiar` | `P.items[id].s ≥ 7` (`FAMILIAR_S = 7`) |

*Why 7 days.* With the app's weights a new word graded Good starts at s = 3.26. Its next Good (about 3 days later) takes it to about 11.3, and the one after to about 35.7 (worked from `fsrs.js:20-58`, matching audit's 3.3 → 11 → 35). So "familiar" is two clean spaced recalls, about 3–4 days after first meeting the word. "Known" (≥ 21) takes about 15. A unit therefore fills within about a week of its words arriving: a near finish line (goal-gradient), not a 15-day lag (audit "the level lags the work by about 15 days").

**Unit status** (`pathState()`):

| Status | Condition |
|---|---|
| `done` | `P.units[id].passed` exists. Kept forever, even if words later decay, like a badge. It records that the checkpoint was passed on that day. |
| `ready` | every word is familiar and the unit has not been passed. |
| `active` | at least one word met. |
| `later` | no word met. |
| `planned` | the unit is in `units.json` with `planned: true` and no words (D10). |

The **current** unit is the first unit that is neither `done` nor `planned`.

**New words follow the path.** `buildSession()` takes `opts.order`: the path's word ids, in unit order, followed by any drillable word not in a unit, in `words.json` order.

- `fresh` becomes `order.filter(id => drillable && !introduced).slice(0, room)` (`scheduler.js:70-73`).
- Without `opts.order` the output is byte-for-byte today's, so every existing simulation and test is unaffected.
- `words.json` itself is not reordered.

**The checkpoint** (`buildCheckpoint(p, unit, sentences, byId, {today, exclude, mcMode})`):

- **Items.** 5 sentence items drawn from `sentences.json`. Each one:
  - contains at least one of the unit's words;
  - has every drillable id already introduced (`P.items`), so nothing unknown is ever tested;
  - is not already in today's lesson (`exclude`) where that leaves enough.
- **Order and direction.** Selection is seeded with `hashSeed(unit.id + ':' + tries)`, so each attempt draws a fresh set where the pool allows. Items 1–3 are English → Mongolian and items 4–5 are Mongolian → English. The can-do is production-led, modelled on the Survival Book review lesson's translation format (printed p.99 [PDF 101]).
- **Fill.** If fewer than 5 sentences qualify, the rest are word cards of the unit's lowest-stability words, following `mcMode`.
- **Rung.** It comes from A's `startRung`: all the words are familiar, so sentences start typed, and `Use blocks` stays available. That keeps the escape Fred asked for in point 1.
- **Never graded by FSRS.** Items carry `checkpoint: unit.id`, and `grade()` skips `awardGrade()` for them, the same contract as C's reading. One grade per word per session cannot be broken, and early reviews never distort the schedule.
- **Retries.** A's retry loop runs inside a checkpoint for learning. Retries score 0 and do not count toward the pass.
- **Pass.** At least **4 of 5 right on the first attempt**, at any rung (`PASS_RIGHT = 4`). This sits in the 80–90% band that research-science 2b recommends (Wilson 2019 treated as a band, not a target).
- **Fail.** `tries + 1`, `last = today`. The unit sheet shows the score. The checkpoint returns in the next day's lesson. There is no penalty, no timer, and no "4 mistakes and you fail" (compare Ling's timed unit exam, research-competitors, "Ling: course structure").
- **One attempt per unit per day**, whether from the lesson or the Path. This stops repeated attempts being used to collect XP.

**Where checkpoints run:**

- **In the daily lesson:** the earliest `ready` unit with `last !== today` (`checkpointDue()`). `composeLesson()` places its 5 items after the main items and before C's reading.
- **From the Path:** any `ready` unit, through **Take it**. These do not make a study day.

**Why checkpoints and not automatic completion:**

- Five production answers turn "words familiar" into "can do it". That is retrieval practice with feedback (Karpicke & Roediger 2008; research-science 1a).
- It mirrors the books' own end-of-lesson recall pages and review lesson (Beginner Mongolian printed p.33, 47, 62–63, 79–80, 99–100, 109–110; Survival p.99).
- Completion becomes an event Fred causes, which is what makes the Done celebration real.

### 3.6 Badges, reworked

All earned ids stay earned forever (`P.badges` only grows). Names are English chrome (INSTRUMENT 5). New badges carry no `mn`. The 12 existing `mn` labels were approved by Luna in August (CLAUDE.md) and are kept with `reviewed: true`, unused by the UI.

| id | Name | Condition | Progress shown | Note |
|---|---|---|---|---|
| `first` | First lesson | a history row exists | — | kept |
| `week7` / `day30` / `day100` | 7 / 30 / 100 day streak | `streakState().streak ≥ N` | streak/N | rest-day aware |
| `day365` | 365 day streak | ≥ 365 | streak/365 | new |
| `full-week` | Full week | 7 done squares in one Mon–Sun week | done squares this week, if still reachable | rest squares don't count |
| `known25` / `50` / `100` | 25 / 50 / 100 words known | `st.known ≥ N` (s ≥ 21) | known/N | kept |
| `known250` | 250 words known | as above | known/250 | **listed only while ≥ 250 drillable words exist** |
| `perfect` | Perfect sentence | a sentence typed (rung TYPE) on its **first attempt**, every token hit, no slip | — | A's fix: retries never count |
| `retention` | Recall at 90% | ≥ 20 tracked and average R ≥ 0.9 | — | kept |
| `backup` | Backup code taken | — | — | **retired as a target**: never listed unless already earned |
| `unit1` | First unit | any `P.units[*].passed` | 0/1 | new |
| `part-<id>` | e.g. "At home" | every unit in the part passed, with no planned units left in it | passed/units in part | new, generated from `units.json` parts |
| `fixed25` / `100` / `500` | 25 / 100 / 500 mistakes fixed | Σ history `fixed` (A's counter) ≥ N | sum/N | new; celebrates the error loop |
| `read1` / `read10` | First reading / 10 readings | count of `P.readings[*].first` (C) | count/N | new |
| `run10` / `run20` | 10 / 20 right in a row | `S.summary.bestRun ≥ N` in one lesson (B's run) | — | new; the combo's only lasting trace |

- **Reachability** (`reachable(badge, ctx)`): a locked badge appears as a target only when its condition can be met with the content that exists today. This fixes the "dead badge" problem without deleting history.
- **"Next" list:** at most 2 locked, reachable badges with measurable progress, sorted by have/need descending.
  - *Why:* a visible near finish line (goal-gradient).
  - Badges as informational milestones, not checklists (research-science 5).
  - Mandatory badges plus leaderboards harmed motivation in Hanus & Fox 2015.
- **Front-loading:** tiers now run from day 1 to day 365. For a fresh learner the old 6 badges in week 1 become about 5 in week 1 and about 15 spread over the year. Fred already holds most of the early ones.
- **Evaluated at every close:** lesson `finish()` (all badges), a Path checkpoint's done (`unit1`, parts), the Read tab's done (`read*`) and the grammar done screen (none today). A badge earned on the other device and arriving by sync is never celebrated here, because newly earned = evaluated now minus `P.badges` at that moment (as `app.js:341-343` does today).

### 3.7 A lesson always exists (practice fallback)

When `buildSession()` returns no due and no new words, `todaySession()` still builds a lesson:

- **practice**: up to 8 cards of the introduced drillable words with the lowest R. `buildPractice()` sorts by R ascending, then by id. Cards follow `mcMode` and carry `practice: true`, so they are **ungraded** by FSRS, like checkpoint items;
- the checkpoint, if one is due;
- the reading, if C has one ready.

Finishing it writes the day's history row (`reviews: 0`), so the day counts. XP follows the normal rule.

*Why:* a streak that breaks on days with nothing to do punishes the content ceiling, not Fred. Ungraded practice keeps the FSRS schedule untouched (research-science 1b). The day still requires answered questions, so the streak rule holds. This is decision **D8**.

### 3.8 Quests: none

- No daily or weekly quests in this design (decision **D7**).
- *Why:* the complaint is legibility. Quests are a parallel goal system with their own list, rules and resets.
  - The near goal is already supplied twice: by the lesson (today) and by the unit (this week).
  - Coherence: removing extraneous elements helps, median d ≈ 0.86 (research-science 6).
  - Adding layers before consolidating is a named pitfall (research-science pitfalls).
- The option kept for later is in D7.

### 3.9 Done events and the milestone flag

`doneEvents({ pre, post, summary, newBadges, units })` is pure, in `goals.js`. It returns the ordered list of events:

1. `part`, then `unit`: from `summary.checkpoint.passed`.
2. `badge`: one per newly earned id.
3. `restUsed`: `pre.pending.length > 0` and this is the first lesson of the day. `pre` is `streakState` before `recordDay()`, `post` after it.
4. `restEarned`: `post.earned > pre.earned`.
5. `best`: today's row xp crosses the previous best over `xv === 2` rows, with at least 7 such earlier rows.

- `S.summary.milestone = events.some(e => e.kind === 'part' || e.kind === 'unit' || e.kind === 'badge')`. That is B's `doneCue()` input, replacing `leveledTo` and `goalCrossed`.
- Rest and best-day events use the normal `finish` cue, so the chord stays rare and meaningful (research-science 4: "used rarely so it stays meaningful").

### 3.10 What "numbers are real" forbids

**Forbidden outright:**

- Leagues, leaderboards, rivals or "learners like you": Fred is the only user, so any opponent would be invented.
- Gems, coins or any spendable currency, including buying rest days.
- Chests, random or variable rewards, and mystery XP.
- Rewards for opening the app, or for a login.
- XP multipliers, double-XP periods, combo XP, and bonuses for finishing, streaks or units. XP is defined as points per answer, and any multiplier breaks that definition.
- Hearts, lives or energy that stop study after mistakes. They contradict point 1 and the errorful-learning evidence.
- "% fluent", CEFR-level claims, or a headline "B1 by <date>": nothing in the app measures fluency, and the projection swings by years.
- Head-start or illusory progress, such as pre-filled bars or "you're already 20% there". The goal-gradient literature shows it works, but it is invented.
- Rest days drawn as done, or a renumbered week.
- Badges or units awarded for anything except their stated condition.
- Urgency copy that is not true, such as "streak in danger!".
- XP or badges for appeals, rereads or retries.

**Allowed, because each traces to an event:**

- the per-answer score;
- the streak with earned rest days;
- unit fill from FSRS state, and completion by checkpoint;
- badges with conditions and progress;
- personal bests and last-week comparisons;
- the combo as a real count (sound and label only);
- one celebration screen.

**Needs an explicit amendment (decision D11):**

- INSTRUMENT principle 3 (XP definition, levels, streak);
- the week-strip states;
- the Done callouts;
- `goals.js` design decision 1.

Sound itself is B's D1.

### 3.11 Edge cases

| Case | Behaviour |
|---|---|
| Fred leaves mid-lesson (✕) | Graded items keep their grade and XP (each is committed on Continue). No history row is written, as today. A checkpoint in progress is discarded: no `tries` and no `last`, so it is offered again. |
| Sync `adopt()` mid-lesson | `S.summary` is untouched. At finish, `recordCheckpoint` writes into the newer `P`. Badges newly earned are diffed against `P.badges` at finish time (§3.6). |
| The other device passed the same unit offline | The merge keeps the earlier `passed` (§4.4). The later device's Done still shows its own pass, because it happened there. |
| A unit's word leaves `words.json` | It is ignored. A unit with no words left is hidden. |
| `P.units` has an id no longer in `units.json` | It is ignored and kept (additive). |
| Unit has fewer than 5 qualifying sentences | Word-card fill (§3.5). The `units.json` integrity test asserts that 5 items can always be built once every word is introduced. |
| Two lessons in one day | Both add XP to the same row (`recordDay` sums `xp`). The streak square is already done. Only the first can carry `restUsed`. |
| Today's lesson is only practice | It counts as a lesson day with `reviews: 0`. |
| Clock or time zone | `dayKey()` local day keys, unchanged. `REST_FROM` is a local day key. |

---

## 4. Data & state

### 4.1 New content file: `src/data/units.json`

```json
{
  "parts": [
    { "id": "home", "title": "At home", "badge": "At home" }
  ],
  "units": [
    { "id": "u01", "part": "home", "title": "Rooms and furniture",
      "can": "Name what is in a room",
      "words": [90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106],
      "grammar": ["g_byna"], "readings": [],
      "source": "Booklet days 1–3 (pp. 2–5)" }
  ]
}
```

| Field | Rule |
|---|---|
| `id` | `/^u\d{2,}$/`. Permanent, never reused. It keys `P.units`. |
| `part` | must exist in `parts`. |
| `title`, `can` | English chrome, ≤ 5 and ≤ 7 words. They need no native review. |
| `words` | drillable lexicon ids. Every drillable word appears in exactly one unit. Empty only with `planned: true`. |
| `grammar`, `readings` | ids in `grammar.json` / `readings.json`. Links on the unit sheet only, never a completion condition. |
| `source` | a printed-page cite, as `tools/alternatives.py` cites. |
| `planned` | optional `true`: a syllabus placeholder with no words (D10). |

The file is copied by `build.py`'s wholesale `data/` copy and precached by `sw.js` automatically (`build.py:75-77, 124-128`).

### 4.2 Synced progress `P` (additive)

| Field | `blank()` default | Shape | Written by |
|---|---|---|---|
| `units` | `{}` | `{ [unitId]: { tries, last, passed?, right?, of? } }`. `passed` is a day key, set once. `right`/`of` are the passing score. | `recordCheckpoint()` |
| `badges` | existing | new ids only | `earnedBadges()` |
| `xp` | existing | lifetime counter, now under the new rule | `closeQuestion()` |
| history row `xv` | absent | `2` = every session in this row was scored per answer | `recordDay()` |

`blank()` gains `units: {}` with the comment *"Path progress (src/data/units.json), keyed by unit id. Only checkpoint events are stored; how full a unit is comes from `items`. See core/path.js."*

**`recordDay()` rule for `xv`:**

```js
const scored = entry.xv === 2 && (!prev || prev.xv === 2);
// … the existing upsert and counter sums …
if (scored) row.xv = 2; else delete row.xv;
```

A day that mixes the old and new formulas is never marked as scored, so it can never set a "best day".

**Not stored at all:**

- the streak, rest days and bank (derived from history, §3.4);
- unit fill (derived from `items`);
- level (retired);
- badge progress (derived).

### 4.3 Session-only `S` (`app.js`)

```js
const blankSummary = () => ({
  reviews: 0, right: 0, newWords: 0, xp: 0, onTime: 0, late: 0, newBadges: [], // existing
  missed: 0, fixed: 0, appealed: 0, bestRun: 0,                                 // A, B
  familiarUp: 0,        // words whose s crossed FAMILIAR_S in this lesson's grading
  checkpoint: null,     // { unit, right, of, passed } once its last item closes
  events: [],           // doneEvents(): what Done calls out
  milestone: false      // B's doneCue input
});
// removed: levelBefore, leveledTo
```

| Field | Purpose |
|---|---|
| `S.mode` | `'lesson'` (from Start) or `'checkpoint'` (from the Path). It routes `finish()`. |
| `S.cpAnswers` | `[{ first, right }]` for the checkpoint items in progress. |
| `S.gScored` | set at `grammar-open`: whether this pass scores XP. |
| pending XP | displayed only, computed from `S.fb` / `S.picked`. It is never stored. |

There is **no device-local state** in this workstream. The unit sheet's open/closed state uses E's `S.open`, mirrored to E's prefs key if sticky.

### 4.4 Sync rules (`src/core/sync.js`)

**`mergeStates`** (first sign-in of a device), next to the badges union:

```js
const unitRec = (x, y) =>
  !!x.passed !== !!y.passed ? (x.passed ? x : y)
  : x.passed && x.passed !== y.passed ? (x.passed < y.passed ? x : y)
  : (x.tries || 0) !== (y.tries || 0) ? ((x.tries || 0) > (y.tries || 0) ? x : y)
  : (x.last || '') >= (y.last || '') ? x : y;
out.units = { ...(b.units || {}) };
for (const [u, r] of Object.entries(a.units || {}))
  out.units[u] = out.units[u] ? unitRec(r, out.units[u]) : r;
```

The rule keeps whole records and never mixes fields from two attempts, which is the same principle as `fullerRow`/`moreAttempts` (`sync.js:222-232`). The result does not depend on which device signs in first.

**`rebase`** (offline changes). New records diff into leaf ops (`main.units.u04.tries`, …) because `diff()` recurses into new maps (`sync.js:136-138`).

| Path | Rule | Added to |
|---|---|---|
| `main.units.*.tries` | counter: this device's gain is added | `isCounter` |
| `main.units.*.last` | the later date | `isLatest` |
| `main.units.*.passed` | the earlier date; a later pass never overwrites | `isEarliest`, extended to path length 4 (C extends it for `readings.*.first`, E for `seen.*`. Land one generic table, §6.4) |
| `main.units.*.right`, `.of` | last writer (the default) | — |

- **History `xv`**: a snapshot in the year document, so the default last-writer rule applies. It is not in `ROW_COUNTERS`.
- **`main.xp`**: an existing counter, unchanged.

**Known, accepted gap.** If an old build (an iPhone app that has not reloaded) studies on the same day as the new one, its old-scale XP adds into a row the new build marked `xv: 2`. That is at most one day, because a new version reloads itself when idle (`app.js:690-708`). It is documented in CLAUDE.md.

**Old builds** pass `units` through untouched: `normalise()` and `fromDocs()` keep unknown fields, and `toDocs()` puts them in `main`. Both of Fred's devices have already joined, so the old-build first-join merge (which would take `units` whole from one side) does not apply to him.

**No new Firestore documents and no rules change.**

### 4.5 Backup-code safety

| Code | Result |
|---|---|
| v1 code | `migrateV1()` → `blank()` → `units: {}`. Checkpoints are offered again from real `items`. |
| Pre-path v2 code | `Object.assign(blank(), raw)` → `units: {}`. Old rows carry no `xv` and never set a best day. |
| A populated code | round-trips `units` intact, including `units: {}` (the falsy-value pattern of `test.html:785-787`). |

`importCode()` still **replaces** everything, including `units` (CLAUDE.md).

### 4.6 Migration (first load of the new build): what Fred sees

There is no migration code. Everything is derived or defaults.

- **Level 2 disappears.** Hint `path.intro` explains it once.
  - Unit bars are filled from his real FSRS state on the first render, so nothing is reset.
  - Units whose words are all familiar show **Checkpoint ready**. One rides in each lesson, and more can be taken from the Path (D4).
- **Lifetime XP** stays as it is (e.g. 3,412), in Numbers with the `numbers.xp` ⓘ. It is not converted, because the old figure was real under its own rule.
  - New rows carry `xv: 2`.
  - "Last week" reads `not measured yet` for the first week.
  - "Best day" appears after 7 scored days.
- **Badges:** everything earned is kept. New badges are evaluated at the first close, and most need new events (checkpoints, fixed mistakes, readings). Callouts cap at 3, with `+N more on Progress`.
- **Streak:** unchanged at release. Rest days earned from past lessons are already in the bank, and they start covering gaps from `REST_FROM`.
- **Grammar replays** stop scoring after the first pass of the day, from release.

---

## 5. Content

### 5.1 Part 1 "At home": 11 units over the existing lexicon (ready now)

- Built only from the 154 drillable words already in `words.json`, which Luna signed off in August 2026. Checkpoints use the existing 164 sentences, all `altReviewed: true`.
- **No new Mongolian is written, so Luna and Sarnai spend no time on this part.**
- Sources: Fred's *Mongolian Booklet Words 90–200* (books-small: 7 words a day, Day 1 = p.2, Days 3–15 two pages each, Day 16 = p.30), and the 43 entries `tools/extend-lexicon.py` added from that booklet's sentences (answer key pp. 31–39).

| id | Title | Can-do | Words (ids) | n | Source | Grammar link |
|---|---|---|---|---|---|---|
| u01 | Rooms and furniture | Name what is in a room | 90–106 | 17 | Booklet days 1–3 (pp. 2–5) | `g_byna` |
| u02 | Around the house | Say where things are | 107–120 | 14 | days 3–5 (pp. 4–9) | `g_qparticle` |
| u03 | Housework | Say what needs doing | 121–138 | 18 | days 5–7 (pp. 8–13) | `g_habitual` |
| u04 | Meals | Talk about meals | 139–148 | 10 | days 8–9 (pp. 14–17) | — |
| u05 | In the kitchen | Name food and kitchen things | 149–160 | 12 | days 9–11 (pp. 16–21) | — |
| u06 | The cat | Talk about a pet | 161–170 | 10 | days 11–12 (pp. 20–23) | `g_tai` |
| u07 | Books | Talk about reading and writing | 171–180 | 10 | days 12–13 (pp. 22–25) | `g_accusative` |
| u08 | The garden | Talk about the garden | 181–192 | 12 | days 14–15 (pp. 26–29) | — |
| u09 | Describing things | Say what things are like | 193–200, 251–255 | 13 | days 15–16 (pp. 28–30) + key | — |
| u10 | Home, days and family | Say when, and who | 231–247 | 17 | answer key (pp. 31–39) | — |
| u11 | Everyday verbs | Say what people do | 248–250, 256–273 | 21 | answer key (pp. 31–39) | — |

- The units total 154, exactly the drillable set. A test asserts this partition.
- The grammar links match the Booklet's implicit grammar per day range (books-small, "Booklet Days 1–4 … X дээр Y байна; хаана байна?"; "Days 5–7 … habitual -даг"; "Days 11–12 … -тай юу?"). The five topics' own cites are unchanged.
- **Fred's time:** about 10 minutes to approve the titles and the order (D9).

### 5.2 Later parts: the outline the Content engine turns into units

This is a proposal only. The Content engine owns the final syllabus, the word lists and the reviews.

- Each unit follows one textbook lesson's topic, grammar order and exercise format. Its can-do title is written fresh in English, never copied, and cites printed pages.
- Until a unit's words exist it may ship as `planned` (D10).

**Part 2, "Getting by"** (Survival Book 023, 12 can-do lessons). The books-surv best assets name this as the visible unit path.

| Unit | Can-do title (ours) | Survival lesson, printed pages |
|---|---|---|
| u12 | Say hello and who you are | L2, pp. 9–17 |
| u13 | Say where you're from and what you speak | L3, pp. 18–25 |
| u14 | Numbers, age and the time | L4, pp. 26–38 |
| u15 | Take a taxi | L5, pp. 39–46 |
| u16 | Food you like, and buying it | L6, pp. 47–58 |
| u17 | Order in a café | L7, pp. 59–66 |
| u18 | Colours and clothes | L8, pp. 67–74 |
| u19 | Talk about family | L9, pp. 75–81 |
| u20 | Talk about the weather | L10, pp. 82–89 |
| u21 | Say what you can do | L11, pp. 90–93 |
| u22 | Say what you did | L12, pp. 94–98 |

The review lesson (p.99) is the model for the checkpoint format (§3.5).

**Part 3, "Daily life"** (Beginner Mongolian Part 1 lessons 4–10, printed pp. 34–137). Lessons 1–3 overlap Part 2.

| Topic | Printed pages |
|---|---|
| What you're doing now | 34–47 |
| Where things are (байна/байгаа/байдаг) | 48–63 |
| Yesterday | 64–81 |
| Plans | 82–100 |
| Describing people | 101–110 |
| What's easy or hard | 111–120 |
| Whose and the home | 121–137 |

**Part 4, "Towards B1"** (Modern Mongolian chapters 1–14, printed pp. 1–177): one unit per chapter, after Parts 2–3.

**Content-engine contract for every new unit:**

- 10–21 drillable words, all new to the path;
- at least 5 sentences that pass the checkpoint filter once the unit's words are introduced;
- an English `title` and `can`, and a `source` cite;
- optional `grammar` and `readings` links.

The Mongolian goes through the engine's normal `review-sheet.py` pass (Luna). **This workstream adds nothing to her review load.** Part titles and badges are English chrome.

### 5.3 Native-speaker time for this workstream

- **Luna: 0 minutes.** No Mongolian is written: badge names are English, and the existing `mn` badge labels are already approved.
- **Sarnai: 0 minutes.**
- **Fred: about 10 minutes** for unit titles (D9), plus the decisions in §8.

---

## 6. Build

### 6.1 Files and functions

**`src/core/path.js`** (new, DOM-free):

- Constants: `FAMILIAR_S = 7`, `CHECKPOINT_N = 5`, `PASS_RIGHT = 4`.
- `loadUnits(raw, words)`: normalises `units.json`, drops missing or `drill:false` ids, and keeps `planned` units.
- `pathOrder(units, words)`: the ids for `buildSession({ order })`.
- `wordState(p, id)`, `unitProgress(p, unit)`, `pathState(p, units, today)`.
- `checkpointDue(p, units, today)`, `buildCheckpoint(p, unit, sentences, byId, opts)`.
- `scoreCheckpoint(answers)`, `recordCheckpoint(p, unitId, score, today)`, `partProgress(p, units, partId)`.
- `composeLesson(base, { checkpoint, practice })`: puts the main items, then the checkpoint, then the trailing reading; practice only when `base` is empty.

**`src/core/goals.js`:**

- **Remove:** `LEVELS`, `levelFor`, `XP_BASE`, `XP_CAP`, `xpFor`, `GRAMMAR_XP_*`, `xpForGrammar`.
- **Add:**
  - `xpForAnswer`, `XP_SCALE = 2`;
  - `REST_EVERY`, `REST_MAX`, `REST_FROM`, `streakState`;
  - `scoredDays`, `bestDayXp`, `weekXp`;
  - the reworked `BADGES` (with `measure`, `need`, `family`), `badgeCatalog(units)` (which adds part badges);
  - `earnedBadges(p, ctx)` with the new ctx `{ stats, today, units, perfectTyped, bestRun, fixedTotal, readCount, pool }`;
  - `badgeProgress(p, ctx)`, `reachable(b, ctx)`, `doneEvents(...)`.
- **Change:** `streak()` and `bestStreak()` wrap `streakState()`. `weekCells()` and `monthCells()` add the `'rest'` state. Rewrite the header's two design decisions: rest days, and the path as the near horizon with B1 in Numbers.

**`src/core/progress.js`:** `units: {}` in `blank()`; the `xv` rule in `recordDay()`.

**`src/core/sync.js`:** the `units` merge rule; the `isCounter`, `isLatest` and `isEarliest` entries. Update the header and the `mergeStates` docblock.

**`src/core/scheduler.js`:** `opts.order` for `fresh`; `buildPractice(p, words, { today, n: 8 })`.

**`src/ui/app.js`:**

- **Boot:** `UNITS = loadUnits(...)`, fetched like `readings.json`, outside the `Promise.all`, with `.catch(() => ({ parts: [], units: [] }))`.
- **`todaySession()`:** `composeLesson(buildSession(P, WORDS, SENTENCES, { readings, order }), …)`.
- **`closeQuestion({ first, right, typed })`:** XP into `S.summary.xp` and `P.xp`. It is called from every Continue:
  - `card-next`;
  - `grade` (sentences, typed cards, tiles via A);
  - deck check (A);
  - reading continue (C);
  - grammar continue (when `S.gScored`).
- **`awardGrade()`:** stops adding XP, and counts `familiarUp`.
- **`grade()`:** skips `awardGrade()` for `item.checkpoint || item.practice`, and pushes checkpoint answers to `S.cpAnswers`. After the last one it sets `S.summary.checkpoint` (lesson) or calls `recordCheckpoint` directly (Path mode).
- **`deck-known`:** gives 0 XP until A's verified check lands. That closes the 20-XP loophole on day one of this workstream.
- **`finish()`:** branches on `S.mode`.
  - Lesson: `pre = streakState(...)`, then `recordDay({ …, xv: 2 })`, `post`, badges, `recordCheckpoint`, `doneEvents`, `milestone`.
  - Checkpoint mode: `recordCheckpoint`, badges, the small done screen, and no `recordDay`.
- **New acts:** `checkpoint-start` (from the Path) and `unit-open` (through E's `open`).
- **Remove:** `levelFor` imports and the `levelBefore`/`leveledTo` logic.

**`src/ui/views.js`:**

- `lessonBar(done, total, xp)`;
- Today's `streakLine()` and `unitLine()`;
- `viewDone` (events, XP headline, unit line);
- `viewPath()`, `viewUnit()`, `viewBadges()`, `viewCheckpointDone()`;
- `weekStrip()` and `monthGrid()` with the `rest` class;
- the `Checkpoint n/5` head tag;
- grammar done shows XP only when scored;
- delete `viewAchievements` and the `levelFor` import (with E's D5).

**`src/ui/base.css`:**

- `.bar.rest` and `.month i.rest` (gold hatch fill);
- `.path .row`;
- `.unitmeter` (the blue meter);
- `.badge.locked` with a gold meter;
- no new keyframes.

**`build.py` / `sw.js`:** **no change.** `core/` and `data/` are copied wholesale (`build.py:63-65, 75-77`), and the precache list is generated (`:124-128`). No new UI module and no new external request, so CI's URL check is unaffected.

### 6.2 `tools/test.html`

**Remove** (they pin retired mechanics):

- levels (`:618-623`);
- `xpFor` (`:626-629`);
- `xpForGrammar` (`:749-754`).

**Change:**

- the BADGES shape test (`:632`) to `b.id && b.en`, with `mn` required only where `reviewed: true`;
- the simulation helpers (`:836, :848`) to `xpForAnswer`.

**Add:**

- **XP rule:** typed-right 3, helped-right 2, wrong 1, retry 0. Failing then fixing is less than helped-right. An appeal does not change XP.
- **`streakState`:**
  - a plain run;
  - a 1-day gap after `REST_FROM` with bank ≥ 1 is covered, and the run continues without an increment;
  - a gap before `REST_FROM` breaks the run;
  - a gap longer than the bank breaks the run and keeps the bank;
  - earning at 7 and 14, with a cap of 2 (the earning is lost at the cap);
  - a pending trailing gap is drawn as rest and the streak stays alive;
  - an unfinished today is never a miss;
  - `best` excludes rest days;
  - `streak()` and `bestStreak()` give the same results as before on histories with no gaps after `REST_FROM`, so the existing tests at `:566-574` stay green.
- **Cells:** `weekCells`/`monthCells` produce `'rest'`. `full-week` ignores rest squares.
- **`recordDay` `xv`:** a new row is scored; a second scored session keeps it scored; an unscored earlier row plus a scored session is unscored.
- **`bestDayXp`:** only `xv` rows count, and it needs at least 7 of them. **`weekXp`** handles this week and last week, with `null` before a full scored week.
- **Path:**
  - `wordState` thresholds;
  - `unitProgress` ignores missing and `drill:false` ids;
  - `ready` only when every word is familiar;
  - `passed` persists after the words decay;
  - `checkpointDue` skips `last === today` and picks the earliest ready unit.
- **`buildCheckpoint`:**
  - 5 items;
  - deterministic per (unit, tries), and different for tries 0 and 1 when the pool allows;
  - every sentence has at least one unit word and all its ids introduced;
  - directions are 3 English → Mongolian and 2 Mongolian → English;
  - word-card fill when sentences are short.
- **`recordCheckpoint`:** passes at 4/5, fails at 3/5 with `tries` incremented, one attempt per day.
- **Ungraded items:** answering checkpoint and practice items leaves `P.items` deep-equal (simulated through `grade()`'s pure helper).
- **`composeLesson`:** the order is main items, then checkpoint, then reading. Practice appears only when the base is empty, and never mixed with due items.
- **`buildSession` with `opts.order`:** `fresh` follows the path order. Without it, the output is deep-equal to today's.
- **`units.json` integrity:**
  - ids are unique and match `/^u\d{2,}$/`;
  - parts exist;
  - every drillable word is in exactly one unit, and every unit word is drillable and exists;
  - planned units have no words;
  - with every word introduced, `buildCheckpoint` yields 5 items for every unit;
  - titles are ≤ 5 words and contain no Cyrillic.
- **Badges:**
  - `earnedBadges` covers each new condition;
  - `badgeProgress` gives have/need;
  - `known250` is not reachable with 154 drillable words;
  - `backup` is never listed unless earned;
  - an earned id survives a state that no longer meets its condition;
  - `perfect` ignores retries and tile answers.
- **`doneEvents`:** each kind; their order; `milestone` only for unit, part or badge; at most 3 shown.
- **Backup codes:**
  - v1 and pre-path v2 codes import with `units: {}`;
  - a populated `units` round-trips;
  - `units: {}` survives.
- **Sync (`test.html` sync section):**
  - `toDocs` puts `units` in `main`;
  - a pass diffs into leaf ops under `main.units.<id>`;
  - `mergeStates`: passed beats unpassed, the earlier pass wins, and sign-in order doesn't matter;
  - `rebase`: `tries` adds, `passed` keeps the earliest, `last` the latest;
  - a grade still sends exactly the word and `main.xp` (`:925`).

### 6.3 `tools/engine-test.html` and `tools/smoke.html`

**`tools/engine-test.html`:**

- Replace the `xpFor` import in `record()` with `xpForAnswer`.
- Two devices pass the same unit offline: online keeps the earliest `passed` and the summed `tries`.
- A pass on the laptop reaches the phone.
- The phone's later offline fail of that unit does not unset `passed`.
- An old-build device (no `units` in its `blank()`) saves without dropping `main.units`.

**`tools/smoke.html`** (built app, two frames):

- Today shows the unit line (`Unit 1`) and the streak, with no `Level`.
- A right multiple-choice answer moves the lesson-bar XP by 2. After Continue, stored `xp` grew by the same 2. The existing laptop-to-phone `xp` equality check (`:142-149`) stays green.
- A fixture with every u01 word at `s = 8`:
  - Today reads `checkpoint today`;
  - the lesson ends with five `Checkpoint n/5` items;
  - after 4 right, Done shows `Unit 1 complete`;
  - `stored.units.u01.passed === today`;
  - `P.items` is unchanged by the checkpoint answers.
- A fixture with nothing due: Start reads `Practice`; finishing writes a history row with `reviews: 0`.
- Progress shows `of 11 units`. No Achievements tab (with E).
- A fixture with history for days 1–14 and day 15 missed (after `REST_FROM`): Today's day-15 square has class `rest`, and the streak is 14.

### 6.4 Docs

**`docs/INSTRUMENT.md`** (decision D11):

- **Principle 3** becomes:

  > **Numbers are real, including the game.** Every figure is derived from an event that actually happened. XP is counted per question: 1 for answering on the first try, 1 more if it was right, 1 more if it was typed; a retry earns nothing. Units on the path fill as their words become familiar (stability ≥ 7 days) and complete when their checkpoint is passed. A streak day requires a finished lesson; a rest day, earned every 7 lesson days with at most 2 saved, covers a missed day and is drawn as rest, never as done. Badges are checkable conditions and show their progress. Nothing can be earned without the work, nothing is bought, and no figure is invented to make a screen feel better.

- **Colour:** gold covers the goal layer, the path panel, the streak, rest squares and badges. Unit meters are blue (progress).
- **Components:**
  - The week strip gains a rest square (a gold hatch).
  - New **Path** row and **Unit sheet** components.
  - The badge gains a locked form with a gold meter.
  - Remove "Level".
- **Layout & motion:** the session-close paragraph gains "…and at most three callouts (unit, part, badge, rest day, best day), each rising in; plus B's sound line."
- **Copy:** remove the "level and badge names … pending" sentence. Badges are English only.

**`CLAUDE.md`:**

- the Rules paragraph on the Instrument system (XP, units, rest days);
- State: `xp` (lifetime; rule changed on `REST_FROM`; rows marked `xv`), `units`, `badges` (new list), history `xv`;
- Layout: `core/path.js`, `data/units.json`;
- a Content schema subsection for `units.json`;
- the known old-build gap (§4.4);
- delete the stale line "Interface chrome is Mongolian; telemetry labels are uppercase Latin mono" (audit, "Stale documentation"), unless E already has.

**`src/core/goals.js` header:** the rewritten design decisions.

**`ROADMAP.md` §2:** "content packs are units on the path; see units.json".

**Joint with C and E:** land `isEarliest` as one table of path patterns (`main.createdAt`, `main.seen.*`, `main.readings.*.first`, `main.units.*.passed`). Three workstreams otherwise edit the same line.

---

## 7. Size & dependencies

| Step | Contents | Size |
|---|---|---|
| **D1 Core** | `path.js`, `goals.js` rework (XP, `streakState`, badges, events), `progress.js`, `sync.js` rules, scheduler `order` and `buildPractice`; `test.html` and `engine-test.html` sections | **M** (2 sessions) |
| **D2 Units data** | `units.json` Part 1, integrity tests, Fred's title check | **S** (0.5) |
| **D3 UI** | `app.js` rewiring (`closeQuestion`, checkpoint/practice items, `finish` modes, acts), `views.js` (Today elements, lesson bar, Done, Path, Unit sheet, Badges, rest squares), `base.css`, smoke updates | **M** (2 sessions) |
| **D4 Docs** | INSTRUMENT, CLAUDE.md, the `goals.js` header | **S** (0.5, alongside D3) |

**Total: L, about 5 focused sessions.**

**Must land first:**

- Fred's answers to D1–D4 and D11. They retire levels, change XP and amend INSTRUMENT and `goals.js` decision 1.
- E1 (the hint registry, `S.open`, prefs), for `path.intro`, `done.xp`, `today.rest` and the unit sheet's open state.

**Independent:**

- D1 and D2 need nothing else and can land before A, C and E.
- XP works on today's flows: `typed` = mcMode off or sentence; no retries exist yet, so `first` is always true.

**Lands with E2:** D3 should land with E2 (Today, Done, Progress layout) to avoid laying out these screens twice.

**A dependency, soft:**

- A's `item.retry` and `S.attemptMin` make retry = 0 and typed-vs-helped exact.
- A's `fixed` row counter powers the `fixed*` badges. They are hidden as unreachable until A ships.

**What it unblocks:**

- **B:** `S.summary.milestone` for `doneCue`, and the run badges.
- **C:** reading XP constants (1 per question, +1 if right, first read only), the `read*` badges, and the unit-sheet links.
- **Content engine:** the unit schema, the path order for new words, and the per-unit contract (§5.2). From now on every content pack is a visible unit.

**Interfaces with the other workstreams:**

| Workstream | This design consumes | This design provides |
|---|---|---|
| A, Learning loop | `item.retry`, `S.attemptMin` (TYPE vs helped), `S.summary.{missed, fixed, appealed, right}`, history `fixed`/`right`, the verified deck check | XP rule (retry 0; failing first never pays); checkpoint and practice items flagged `checkpoint`/`practice` so `grade()` skips FSRS; `perfect` restricted to first TYPE attempts; Done owns the "mistakes fixed" line placement |
| B, Sound | `S.summary.bestRun`, combo run (no XP) | `S.summary.milestone` (unit, part, badge) instead of `leveledTo`/`goalCrossed`; the first-pass-per-day rule for listen-drill XP |
| C, Reading | `P.readings[*].first`, the reading item at the lesson's end, its question verdicts | XP per question 1/+1 (replaces C's 3/+3 proposal); checkpoint placed before the reading; tab reading is not a study day (agrees with C's D5); empty days run practice + reading inside the lesson, so C's extra "Read: <title>" Today button is not needed |
| E, Less text | hint registry, `S.open`, prefs, Numbers, budgets | Today: the unit line replaces the goal-meter slot (≤ 7 words; +2 net); the streak panel gains rest squares and new `today.week`/`today.rest` copy; lesson bar `+N XP`; Done block and callouts (≤ 34 words with 3 callouts); Progress path + badges block (≤ 36 closed, against E's ≤ 20 slot: **ask E for +16**, or collapse badges to `Badges · 9 ›` plus one Next row for ≤ 28); Numbers rows; Achievements tab removed (agrees with E's D5 A); hints `path.intro`, `path.checkpoint`, `done.xp`, `today.rest`, `numbers.xp` |
| Content engine | Part 2+ units, words, sentences, reviews | `units.json` schema, `pathOrder`, checkpoint contract, `planned` units |

E's Today mock puts the streak panel on a red spine. INSTRUMENT puts the streak in the gold domain and keeps red for "act now". This design asks E to use gold, or a bare panel, for the streak.

---

## 8. Decisions for Fred

| # | Decision | Options | Recommended default |
|---|---|---|---|
| **D1** | What happens to levels | (a) retire levels; the unit path is the only ladder, and known words move to Numbers as the B1 meter; (b) keep levels, driven by XP, beside the path; (c) keep levels on known words (today) | **(a)**. One ladder whose next step is days away, not weeks. (b) recreates two currencies, and (c) freezes at level 5 with this corpus. |
| **D2** | XP | (a) a per-answer score (1 / +1 right / +1 typed, retries 0) shown in the lesson bar and on Done, driving nothing; (b) the same score driving levels (needs D1 b); (c) drop XP from learner screens, keeping it in Numbers only | **(a)**. Verifiable by eye, rewards typing, and gives in-the-moment feedback without becoming a second goal. |
| **D3** | Streak repair (**reverses `goals.js` decision 1**) | (a) rest days: 1 per 7 lesson days, max 2 held, used automatically, drawn as rest; (b) no repair (today); (c) a one-day grace any time | **(a)**, spending only on gaps from the release day so no past streak is rewritten. |
| **D4** | Units Fred has effectively finished already | (a) each needs its checkpoint: one rides in each lesson, more can be taken from the Path; (b) auto-credit units whose words are all known (s ≥ 21) at release, marked "credited" | **(a)**. Each pass is a real production test and a quick win. Catching up is about a week of 2-minute checkpoints, with a chord each time. |
| **D5** | Checkpoint | (a) 5 items, pass at 4 right first time, blocks allowed, retry next day; (b) pass at 5/5; (c) typed only | **(a)**. It sits in the 80–90% band and keeps Fred's "building blocks" escape. |
| **D6** | Daily goal | (a) one finished lesson, drawn as today's streak square; (b) a separate XP target ring (e.g. 30 XP) | **(a)**. Duolingo found an XP-based day confusing. One habit, one square. |
| **D7** | Quests | (a) none; (b) one weekly focus chosen from real events (e.g. "Fix 15 mistakes", "Read 3 passages"), on Progress only, no XP | **(a)** now; revisit after a month of use. |
| **D8** | A day with nothing due | (a) the lesson becomes 8 ungraded practice cards (plus a checkpoint or reading if ready), and finishing counts the day; (b) such days spend a rest day | **(a)**. The streak should never punish the content ceiling. |
| **D9** | Part 1 unit titles and order (§5.1) | approve as listed / edit | Approve; about 10 minutes. |
| **D10** | Show planned units (e.g. Part 2's titles) before their content exists | (a) yes, as grey `Coming` rows once the Content engine commits the outline; (b) only built units plus "more coming" | **(a)**. A visible syllabus says where the course is going, and it is labelled as not yet built. |
| **D11** | INSTRUMENT amendments: principle 3, rest squares, Done callouts, Path and badge components | approve together / change | **Approve together**, in the same commit as D3 (UI). Sound is B's D1. |

---

## 9. Risks and how each is contained

| Risk | Containment |
|---|---|
| **The content ceiling stalls the path** (Part 1 ends at 154 words; new material runs out around day 31–35) | Checkpoints give about 11 near-term wins over existing content. XP and the streak keep moving on review-only days. The practice fallback keeps the streak fair. The path says "more coming" or shows planned units instead of a frozen bar. More content is the Content engine's job, and every pack it ships is a visible unit. |
| **Retiring Level 2 feels like a demotion** | Unit bars fill from his real FSRS state on the first render, and ready units say "Checkpoint ready". The one-time hint explains the change. Nothing he earned (badges, XP, streak) is touched. |
| **Rest days make the streak meaningless** | Earned only by 7 real lessons, at most 2 held, so at most 1 miss per 8 days long-run. Rest squares are drawn distinctly. Rest days are excluded from the count and from `full-week`. |
| **The XP scale change confuses** (lifetime 3,412, but +46 a day) | Lifetime XP moves to Numbers with an ⓘ naming the change. Bests and week totals use only days scored the new way (`xv: 2`), and only after 7 of them. "Last week" says `not measured yet` until a full week exists. |
| **Checkpoints are gamed** (repeat attempts, memorised sentences, blocks) | One attempt per unit per day. A fresh seeded draw per attempt. Never FSRS-graded, so they cannot inflate memory. Blocks score less XP. 4 of 5 is a real bar. |
| **Checkpoints block progress** | They gate nothing: new words keep coming. A failure costs nothing and returns tomorrow. |
| **Sync conflicts on `P.units`** | Whole-record merge, earliest `passed`, `tries` as a counter. Engine tests for offline double-passes and late fails. No new documents. |
| **Old iPhone build mixes XP scales on one day** | Documented, and at most one day: the new version reloads itself when idle. A mixed row can't set a best only if the old build ran first that day; the reverse case is the known gap. |
| **A badge burst on the first Done after release** | At most 3 callouts plus `+N more on Progress`. Most new badges need events that don't exist yet. |
| **Practice feels like busywork** | It appears only when nothing is due, is short (≤ 8 items), uses his weakest words, and is ungraded. |
| **Three workstreams edit `sync.js` predicates** (A, C, E and this one) | One table-driven `isCounter`/`isLatest`/`isEarliest` change, landed once (§6.4). Each workstream adds rows. |
| **Pinned tests break** (levels, `xpFor`, `xpForGrammar`) | Listed explicitly in §6.2, removed and replaced in the same commit as D1. The streak tests at `:566-574` stay green by construction. |
| **Gold creeps into type, or green into game elements** | Copy is always ink on a gold fill. Meters are blue (unit) or gold (badge). The combo label uses green only on the right verdict itself (B). Covered by INSTRUMENT review in D11. |
| **Text creeps back onto Today** | Today's game elements are capped at 3 (unit, streak, Start). E's word-budget test counts them, with the ceilings in §2 and §7. |

---

## 10. Versus Ling

What Ling's gamification does, from research-competitors ("Ling: course structure", "Ling: mistakes, review, audio and gamification", "Ling: reported weaknesses"; https://ling-app.com/blog/ling-app-review/, https://eurolinguiste.com/ling-app-review-trying-out-the-ling-language-learning-app/, https://www.langoly.com/ling-app-review/):

- **Its levels and skills come from one template** shared by about 60–80 languages.
- **Its unit exam is timed and fails after 4 mistakes.**
- **It has points, a leaderboard, daily challenges, a streak and a "fluency %".**
- **It has mascot celebrations, and it tops out at A1–A2.**
- **No independent review of its Mongolian course was found.**

What this design gives Fred instead:

1. **A path made from his own textbooks.**
   - Part 1 is his own Booklet vocabulary.
   - Part 2 follows the Survival Book's 12 can-do lessons, and later parts follow Beginner Mongolian and Modern Mongolian toward B1.
   - Every unit has a plain can-do title and a page cite.
   - Ling's units are the same in every language and stop around A2.
2. **Checkpoints that teach instead of failing him.**
   - Five production answers, untimed, with building blocks allowed and mistakes repeated until right.
   - "Again tomorrow" instead of a failed exam.
   - They never touch his spaced-repetition schedule.
3. **A score he can audit.**
   - 1 per answer, +1 right, +1 typed, 0 for retries.
   - Ling's points, and its "fluency %", cannot be traced to anything Fred did.
4. **No fake competition.**
   - Ling's leaderboard needs other learners. Fred is the only one, so his rival is last week's Fred, with real numbers.
5. **A streak that forgives a missed day, but only one he earned.**
   - Rest days come from real lessons, are capped, and stay visible on the strip.
   - Ling users ask for more streak freezes, and Ling sells them.
6. **Badges that show the way there.**
   - Each locked badge shows have/need.
   - None is unreachable or opaque, and none is awarded for opening the app.
7. **One celebration, with sound, that means something.**
   - The chord plays only when a unit, part or badge was actually crossed.
   - Ling's mascot celebrations fire on everything.
8. **Every figure on screen is backed by a recorded event** (§3.1). This is the INSTRUMENT promise, kept for the game layer too.
