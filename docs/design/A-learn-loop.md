# Workstream A: the learning loop

Covers mistakes that repeat until they are right, sentences that get easier after a miss, building-block tiles, and the honesty bugs around grading.

This answers Fred's feedback point 1. It also closes four places where the app currently prints or awards something that did not happen. Every figure below was measured on the shipped code or by a replay of it (`scratchpad/design/sim/ladder.html`). Textbook pages are **printed** page numbers, with the PDF page in brackets the first time each appears.

---

## 1. Problem

Fred, verbatim: *"There is no direct learnings -> a mistake is not being repeated until correct, sentences don't get easier if wrong, there is no option to use 'building blocks' to order the sentence the right way if typing it is too difficult."*

The code agrees with him:

- **Nothing is ever asked again.** `advance()` only moves forward (`src/ui/app.js:312-320`). The item list is built once (`src/core/scheduler.js:169-177`), and the `S.graded` guard (`app.js:370-372`) skips any later sentence carrying the same word.
- **Sentences are always typed.** Their direction alternates by position (`scheduler.js:147`), and nothing makes them easier after an error (`views.js:661-664`). `strictness` never changes, and `sentSkill` is dead (`progress.js:23`, never read).
- **The building-blocks pieces exist only in Grammar.** That build drill grades one exact order, case-sensitively, and ignores alternatives (`src/core/grammar.js:35-37`). Its tiles give away the first word through its capital letter (`grammar.json:29-31, 61-63, 94-96, 126-128, 158-160`). Its shuffle is identical on every visit (`app.js:417`).
- **Four honesty bugs** break INSTRUMENT principle 3, "numbers are real":
  1. **The "NEXT 4h" readout is false.** After a wrong answer the view prints FSRS's sub-day interval (`views.js:600, 102`), but `applyGrade` schedules the word at least a whole day out (`scheduler.js:200`). Sentences preview only `targetIds[0]` (`app.js:211`).
  2. **A known-wrong answer can still be self-graded Good or Easy.** All four grade buttons stay live after a MISMATCH (`views.js:98-104, 648, 693`), and Enter does nothing there (`app.js:613-614`).
  3. **"I know this" is never checked.** It calls `awardGrade(id, 4)` with no recall at all (`app.js:450`): 16.15 days of stability and the 20 XP cap for one tap.
  4. **The 'perfect' badge has a hole.** It is set on any correct, all-hit submit (`app.js:504`), so once retries exist, a copied retry would earn it.
- **Two smaller faults the loop would expose:**
  - `diffTokens` is blind to word order (`grade.js:152-161`). A swapped order shows every word green under a red MISMATCH.
  - A re-shown multiple-choice card would reuse the same seeded option order (`app.js:122-129`).

---

## 2. What Fred will experience

**Word budget.** Each screen's count is its **chrome words**: labels, buttons, placeholders and the lesson-bar counter. The Mongolian and English being taught or tested is content and is not counted: prompts, answers, tiles, options and context chips. These counts assume the Less-text workstream drops `i+1 · NN% KNOWN`, the boxed `TRANSLATE` label and `CARD · REVIEW`. This design adds nothing that depends on those three.

### 2.1 A sentence, typed (the default for a word he knows)

1. The prompt reads "The door is open." The answer box placeholder says `type in Mongolian`.
2. Under it are two buttons: primary `Check` and ghost **`Use blocks`**. "Use blocks" is always there on a graded sentence. Tapping it swaps the text box for tiles, the escape Fred asked for.
3. If any target word in this sentence was missed last time, a small mono tag `MISSED LAST TIME` sits beside the direction tag. Yesterday's mistake is visibly coming back.

### 2.2 A sentence on building blocks

1. Same prompt. Below it is an empty build line reading `tap blocks to build`, then a bank of lowercase tiles.
   - Example: `нээлттэй` `хаалга` `байна` `хаалгыг` `хаалгаа` `том`. Three are the answer and three are distractors. Two of the distractors are other forms of хаалга taken from Luna-reviewed sentences, so picking the right case ending is part of the task.
2. Tapping a bank tile moves it to the end of the line. Tapping a placed tile sends it back. On the laptop, keys `1`–`9` place bank tiles and `Backspace` returns the last one.
3. `Check` (primary) lights once enough tiles are placed for the shortest accepted answer. The ghost `Type instead` button lets him type after all, but the attempt still counts as a blocks attempt (§3.3).
4. Sentences start on blocks by themselves when a target word is new or shaky (§3.2). On the 45-day replay that was 18 of 26 sentences in week 1 and 11 of 56 in week 4, so tiles fade as words stabilise.

### 2.3 Right answer

- A green panel reads `CORRECT` and shows the answer.
  - If he matched a listed alternative rather than the canonical answer, a mono `ALSO ACCEPTED` line appears.
  - If he typed it with a one-letter slip, it shows the existing `SPELLING` was → is block.
- Top right, `NEXT` / `4D` is the day the scheduler will **actually** set, in whole days, minimum 1.
- Buttons depend on how he answered:
  - **Typed, exact:** green `Continue` (Good), plus ghost `Was hard · 2D` and `Was easy · 9D`. This needs an INSTRUMENT amendment (decision D3).
  - **Typo, or on blocks:** just `Continue`. The app already knows the grade.

### 2.4 Wrong answer (the graded first attempt)

1. A red panel reads `MISMATCH` for typed and tiles, or `WRONG` for multiple choice.
2. It shows the expected answer with an **order-aware** diff:
   - Right word in the right place: plain.
   - Right word in the wrong place: underlined.
   - Missing word: red.
3. `You: …` shows what he gave, with any wrong tile struck through. The target chips (`хаалга · door`) stay, because they are content pairs.
4. Top right: `NEXT` / `THIS LESSON`. That is now true.
5. Buttons:
   - Secondary `Continue`. The grade is **Again**, decided by the app; no four-way bar.
   - Ghost `My answer was right` (typed and tiles only). One tap grades Hard, saves his phrasing for Luna to check, queues no retry, and moves on.

### 2.5 The mistake comes back

1. About three screens later the same sentence returns, tagged `FIX`, one rung easier: typed → blocks, blocks → fewer blocks.
2. If he gets it right: green `FIXED` and `Continue`. No NEXT readout, because nothing is rescheduled. A retry earns no grade and no XP.
3. If he misses again: `MISMATCH`, the diff, the line `One more go at the end`, and `Continue`.
4. At the end of the lesson it returns once more as `STUDY`:
   1. The prompt and the full answer are shown, with one button, `Build it`.
   2. The answer hides and the bare answer tiles appear.
   3. A tile tapped in the wrong place is refused: it flashes red and stays in the bank, with the soft wrong sound from the Sound workstream.
   4. The build therefore always ends correct, then `FIXED` and `Continue`. The loop always finishes.

### 2.6 Word cards

- **Multiple choice, wrong** (`WRONG`, the pair, `NEXT THIS LESSON`, `Continue`): about three screens later the card returns as `FIX` with **two** options, the right one and the one he actually picked. If that is missed too, it ends with `STUDY`:
  - shows `хаалга — door`
  - `Got it`
  - two options, where a wrong pick is refused
  - `FIXED`
- **Typed card, mismatch:** `Continue` (Again) plus `My answer was right`. The retry is multiple choice with fresh options in a new order, then `STUDY`.
- **Typed card, exact:** `Continue` plus `Was hard`/`Was easy`, as for sentences.

### 2.7 New-word deck: "I know this" is checked

1. Front face (Mongolian): `Learn` (primary) and `I know this` (secondary).
2. `I know this` turns the card into a `CHECK`: the Mongolian stays and four English meanings appear.
   - **Right:** `CORRECT`, the pair, `NEXT 3D`, `Continue` (Good) and ghost `Was easy · 16D`. The word's later card is skipped.
   - **Wrong:** `WRONG`, the pair, `Learning it instead`, `Continue`. No grade; the word goes through the normal Learn path.
3. After flipping, `I know this` disappears. Having to look means it was not known.

### 2.8 Lesson bar

The bar shows `9 / 21` before any mistake. When a mistake queues a retry:

- a new segment is drawn into the rail where the retry will appear, hatched until it is answered;
- the counter becomes `9 / 22 · 1 FIX`.

The total grows exactly when, and by how much, a retry is created. Nothing is pre-allocated or hidden.

### 2.9 Session close, Settings, Progress

- **Done screen:** one line from this workstream, `3 mistakes fixed`, plus `1 answer saved for review` when he appealed. Layout belongs to the Gamification workstream.
- **Settings › Options:** a new row `Sentences` with a button cycling `Auto` / `Type` / `Blocks`. The first-view caption reads `Auto starts on blocks when a word is new or shaky`.
- **Progress:** one stat, `FIRST TRY 84%`, with the gloss `last 3 study days · pace steady`. Before enough data it reads `not measured yet`.

### 2.10 Word budgets (chrome words, before → after)

| Screen | Now (measured, audits-gami) | After | Chrome on screen after |
|---|---|---|---|
| Sentence, typed, unanswered | 12–14 | **10** | bar 2, direction tag 2, placeholder 3, `Check`, `Use blocks` |
| Sentence, blocks, unanswered | — | **11** | bar 2, tag 2, `tap blocks to build` 4, `Check`, `Type instead` |
| Sentence verdict, right | 30 (+8 alternative, +12 typo) | **12** | bar 2, `CORRECT`, `NEXT 4D`, `Continue`, `Was hard · 2D`, `Was easy · 9D` |
| Sentence verdict, wrong | 30–32 | **12** | bar 2, `MISMATCH`, `You:`, `NEXT THIS LESSON`, `Continue`, `My answer was right` |
| Retry (FIX), unanswered | — | **10** | bar 3, `FIX`, tag 2, `tap blocks to build` 4 (no rung switch on retries) |
| Retry verdict, right | — | **5** | bar 3, `FIXED`, `Continue` |
| Retry verdict, wrong | — | **10** | bar 3, `MISMATCH`, `One more go at the end` 5, `Continue` |
| STUDY | — | **6** | bar 3, `STUDY`, `Build it` / `Got it` |
| Multiple choice, wrong | 23 | **9** | bar 2, tag 2, `WRONG`, `NEXT THIS LESSON` 3, `Continue` |
| Pair retry | — | **4** | bar 3, `FIX` |
| Deck front | 23 | **8** | bar 2, `NEW WORD`, `Learn`, `I know this` |
| Deck check | — | **3** → **8** after answering | `CHECK`; then `CORRECT`, `NEXT 3D`, `Continue`, `Was easy · 16D` |

---

## 3. Mechanics

### 3.1 Rungs

A rung is how much help one attempt gets. Lower numbers mean more help. Rungs live on the session item (`item.rung`) and are never stored in progress.

| # | Sentence rung | What it shows | Word rung | What it shows |
|---|---|---|---|---|
| 3 | `TYPE` | free typing | `TYPE` | free typing (mcMode off) |
| 2 | `BLOCKS` | answer tokens + 3 distractors | `CHOICE` | 4 options (mcMode on, the default) |
| 1 | `EASY` | answer tokens + 1 distractor (a same-stem sibling if one exists), multi-word lexicon entries merged into one tile | `PAIR` | 2 options: the target and his own confusion |
| 0 | `STUDY` | answer shown → `Build it` → answer tiles only, wrong taps refused | `STUDY` | pair shown → `Got it` → `PAIR`, wrong picks refused |

**Why a ladder.**

- Support that helps novices hurts as expertise grows. The remedy is fading tied to progress, which beats fixed fading (Kalyuga 2003; Salden 2010, in research-science 2b).
- Diminishing cues gave the best final recall (Finley 2011, research-science 2b).
- Every major competitor scaffolds production in steps: Duolingo recognise → type, Babbel chunks → letters → type, Memrise choice → type (research-competitors, "Difficulty ladder", https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo, https://www.babbel.com/en/magazine/writing-in-a-second-language).

**Why these rungs.** Only `TYPE`, `BLOCKS` and `CHOICE` are ever graded. The rest exist only inside the retry loop.

Two candidates are **deferred**:

- *Stem + suffix chips*: needs a reviewed morphology table (Content engine; ROADMAP 4 warns about vowel harmony).
- *Letter tiles for a word*: modelled on Survival Book p77 (PDF 79), the anagram exercise. Decision D9.

### 3.2 Starting rung, worked out from FSRS state (nothing stored)

`startRung` runs in `buildSession`, so the rung is fixed for the whole session from state at session start.

**Sentence items, `P.sentenceMode`:**

- `'type'` → `TYPE`.
- `'blocks'` → `BLOCKS`.
- `'auto'` (default) → `BLOCKS` if **any** target `t` needs support, otherwise `TYPE`. A target needs support when:
  - `isNew(t)`: no `items` entry. It met the deck today and was not drilled.
  - or `R(t) < 0.6`: the scheduler's own `isWeak`.
  - or `items[t].s < S_TYPE`.
  - or `items[t].g === 1 && items[t].s < S_LAPSE`: the last review was a miss and the word has not re-stabilised.
  - Closed-class words (`drill:false`) never need support.

**Card items:** `P.mcMode !== false` → `CHOICE`, else `TYPE`. This is unchanged; an `auto` word rung is decision D9.

`S_TYPE` and `S_LAPSE` come from the difficulty band (§3.10). The steady values are 3 days and 7 days.

- 3 days sits just under the first Good interval (3.26 d). A word recalled once cleanly is typed in its first sentence the next day.
- A Hard (1.18 d) or a recent lapse puts it on blocks.

**Measured fading** (`scratchpad/design/sim/ladder.html`): the real `buildSession`/`applyGrade` replayed over 45 days, from a fresh start, with a once-per-word guard and deterministic misses (1 in 7 typed and multiple-choice attempts, 1 in 10 tile attempts).

- 29% of sentences started on blocks overall.
- Week 1: 18 of 26 (69%). Week 4: 11 of 56 (20%). From day 40: 0–1 a session.
- Fred is very probably past the content ceiling (content-fit: new material runs out on day 31–35). For him, blocks will mostly mean lapsed reviews, the button, and retries.

**Why a fallback and not the default:**

- Recall builds stronger productive knowledge than recognition: Nakata 2016; Kang 2007; generation effect d≈0.40 (research-science 2a).
- Recognition-style practice inflates confidence (Koriat & Bjork 2005).
- So blocks start only where typing would most likely fail, and fade as stability rises.

### 3.3 The attempt rung (button switching)

- `S.attemptMin` is the **lowest** rung shown during one attempt.
  - `Use blocks` on a typed sentence sets it to `BLOCKS`. Once tiles are seen, `Type instead` cannot raise it back.
  - Switching a word card from typed to multiple choice sets it to `CHOICE` (today's behaviour, unchanged).
- The grade (§3.4) is read from `attemptMin`, never from the rung the answer was finally checked on. Seeing the tiles and then typing is still a blocks attempt.
- Retries offer no switch buttons.

### 3.4 Grade policy (first attempt only)

| Item | Attempt rung | Outcome | FSRS grade |
|---|---|---|---|
| word | `TYPE` | exact | 3 Good; `Was hard` → 2, `Was easy` → 4 |
| word | `TYPE` | one-letter slip (`typoDistance`) | 2 Hard |
| word | `TYPE` | mismatch | 1 Again; `My answer was right` → 2 |
| word | `CHOICE` | right | 3; `Was easy` → 4 (existing) |
| word | `CHOICE` | wrong | 1 |
| deck `CHECK` | 4-way, Mongolian → English | right | 3; `Was easy` → 4; the later card is skipped |
| deck `CHECK` | — | wrong | **no grade**; normal Learn path |
| sentence | `TYPE` | exact or listed alternative | 3; `Was hard` → 2, `Was easy` → 4 |
| sentence | `TYPE` | slip | 2 |
| sentence | `TYPE` | mismatch | 1; appeal → 2 |
| sentence | `BLOCKS` | right, **English → Mongolian** | **2 Hard** |
| sentence | `BLOCKS` | right, **Mongolian → English** | **3 Good** |
| sentence | `BLOCKS` | wrong | 1; appeal → 2 |
| anything | a retry (`item.retry ≥ 1`) | anything | **none**: no `applyGrade`, no XP, no review count |

**Never Easy on a tile rung.** A tile build has no `Was easy` button.

**Evidence for splitting the tile grade by direction** (decision D1):

- **English → Mongolian.** The tile supplies the Mongolian spelling and suffix, which is exactly what production would have had to retrieve. Hard is the honest grade. A tile-assisted success caps at Hard (research-science 2a; competitor "Difficulty ladder": tiles = Hard, never Good or Easy).
- **Mongolian → English.** The Mongolian is the prompt. What the tiles remove is typing in English, which is not the skill FSRS tracks for a Mongolian word. That matches INSTRUMENT's precedent that a right Mongolian → English multiple-choice pick is Good.
- **Cost of Hard.** On a new word, Hard starts difficulty at 6.24 against 4.88 for Good (`initDifficulty`, `fsrs.js:43`). Good barely reverts it (w7 = 0.0069), so every later stability gain is about 22% smaller ((11−d) factor, `fsrs.js:56`).
- **Measured over 45 days:**

| Policy | Known words (s ≥ 21 d), day 45 | Mean difficulty |
|---|---|---|
| Split (recommended) | 106 | 6.00 |
| All tiles Hard | 99 | 6.16 |
| All tiles Good | 105 | 5.86 |

The split costs almost nothing against all-Good and keeps the honest cap where production was supplied.

**Why only the first attempt is graded:**

- With the app's weights a same-day Good multiplies stability by about 1.285, and a same-day Again by about 0.285 (`fsrs.js:68-70`).
- The Anki manual and the FSRS documentation say same-day repeats add little and are poorly modelled (research-science 1b, https://docs.ankiweb.net/deck-options.html).
- CLAUDE.md "one grade per word per session".
- The `S.graded` guard stays the single gate, and `gradeFor()` returns `null` for retries as a second, testable gate.

### 3.5 The retry loop

**When.** After a graded first attempt whose outcome is `miss` (grade 1). An appeal queues nothing. A miss on retry 1 queues retry 2. The deck check never queues a retry, because its card follows anyway.

**What.** `nextRetry(item, outcome, ctx)` returns `{...item, retry: n, rung, confusion, origin}`:

- **Retry 1** is one rung lower than the attempt rung:
  - sentence `TYPE → BLOCKS`, `BLOCKS → EASY`;
  - word `TYPE → CHOICE`, `CHOICE → PAIR`.
- **Retry 2** is always `STUDY`.
- `MAX_RETRIES = 2`. `STUDY` cannot fail (wrong taps are refused), so an item is presented at most 3 times and the session always ends.

**The surface always changes:**

- A retry is always on a different rung.
- `CHOICE` retries are seeded `${id}:${dir}:${day}:r${n}`, so fresh options in a new order.
- `PAIR` uses `confusion`:
  - the option he actually picked;
  - for a typed miss, the lexicon word whose face equals what he typed;
  - otherwise the top-ranked distractor.

Why: otherwise he can recognise the option he saw marked correct 20 seconds earlier (research-science 1a; pitfalls 2).

**Where.** `retryIndex(items, i, r)`:

- **Retry 1** goes to `i + 1 + RETRY_GAP` (`RETRY_GAP = 3`, i.e. three other screens between) if that position is not past the last original item. Otherwise it is appended to the end.
- **Retry 2** is always appended to the end.
- The end of the session therefore becomes the **"fix your mistakes" round**, ordered by when each mistake happened. There is no interstitial screen. If the miss was on the very last item, the retry follows immediately, at its lower rung, because there is nothing to space it with.

**Why these numbers:**

- *Gap 3–5:* an immediate re-ask tests working memory. Longer absolute gaps gave large gains (Karpicke & Bauernschmidt 2011, research-science 1a). Duolingo re-inserts missed items later and at the end (competitor "Duolingo: wrong answers come back").
- *Criterion 1:* spaced relearning across days does the long-term work; 3 sessions × 1 recall beat 3 crammed recalls, 68% vs 26% (Rawson 2018). Per minute, one in-session retrieval was the most efficient (Nakata 2017).
- *Cap 2:* uncapped loops trap the learner (research-science pitfalls; competitor recommendations).
- *Corrective feedback first:* the answer and the diff are shown at every miss, which is what made errors useful in Pashler 2005, Kornell 2009 and Metcalfe 2017 (research-science 1a, 2a).
- *End round:* Babbel's correction step and Ling's end-of-lesson retry (competitor items).

**What is counted.** These are session-only `S.summary` fields, with the history row counters in §4:

- `missed`: first attempts graded 1, counted per item.
- `fixed`: retries answered right.
- `appealed`.

`perfect` is set only when `!item.retry && attemptMin === TYPE && ok && !typo && every orderDiff token is a hit`.

**Lesson bar.**

- `lessonBar(items, i, deckI)` draws one segment per step, in item order. A retry item gets class `fix` (hatched until done).
- The counter is `done / total` plus ` · N FIX` while N retries are still ahead.
- `total` is `stepCount` over the live list, so it grows by exactly the retries created. The Today estimate (`lessonWorth`) stays the planned count, because retries do not exist yet when it is shown.

### 3.6 Building blocks: tiles

All of this is pure functions in a new `src/core/tiles.js`, except `orderDiff`, which goes in `grade.js`.

**Tokens.**

- `tokensOf(text)` splits the **canonical** form (`s.mn` for English → Mongolian, `s.en` for Mongolian → English) on spaces. It strips `.,!?;:"'`’` at token edges for display and keeps internal apostrophes ("don't").
- The norm used for grading is `grade.js:norm`.
- Question particles уу/вэ/бэ are already separate tokens, so they are their own tiles. The textbooks do the same in their ordering exercises: Beginner Mongolian p54 [PDF 55] Ex. 1; Survival Book p15 [PDF 17] Дасгал 11 and p92 [PDF 94] Дасгал 6.
- No Mongolian sentence repeats a token. English sometimes does, so the index-based tap model from the grammar drill is kept.

**Display case.** Tiles are lowercase, so nothing leaks the first word. Exceptions:

- English `I`;
- a proper noun: any token that appears capitalised in a non-initial position anywhere in `sentences.json` or as a capitalised headword in `words.json`.

The reveal shows the canonical sentence with its capitals.

**Chunks (EASY only).** Adjacent tokens that together equal a multi-word lexicon entry (24 entries, e.g. тоос сорогч) merge into one tile.

**Distractor pool, precomputed.** A new tool, `tools/tiles.py`, writes `s.tiles = {mn: [≤5], en: [≤5]}` and `s.tilesReviewed` into `sentences.json`. It is the only writer of those two fields, as `alternatives.py` is for `alt`.

- **Mongolian candidates** are every token of every canonical and `alt.mn` form, i.e. Luna-reviewed Mongolian, never generated inflections. Ranking:
  1. Same-stem siblings of the sentence's own tokens. A token's stem is the longest lexicon headword prefix, with a verb's final -х dropped and a noun's final short vowel dropped, so хаалга → хаалг- matches хаалгыг and хаалгаа, and муур matches муурыг and мууранд. At most 3 siblings.
  2. Look-alikes: same first letter, length within ±2.
  3. Then by corpus frequency.
- **English candidates** are tokens of other sentences' canonical English, excluding:
  - a stoplist (a, an, the, is, are, am, was, were, be, to, of, in, on, at, it, this, that, my, your, his, her, our, their, and, please);
  - every word in the English gloss of any id in this sentence (so `yard/fence` cannot be a distractor for хашаа).
- **Exclusion invariant, both languages:** no pool token may appear in **any** accepted form of this sentence (`[canonical, ...alt]`). A distractor then can never complete another listed answer: хаалга is in the accepted «Хаалга хаагаач», so it is never a distractor for «Хаалгыг хаагаач». `tools/tiles.py --check`, `tools/test.html` and the runtime picker all enforce it.
- **Measured on the corpus:** 86 of 164 sentences have at least 1 same-stem sibling available (29 have 1, 9 have 2, 48 have 3 or more); 78 have none and use look-alikes.
- **Why morphological distractors:** a bank with no wrong suffixes trains ordering, not Mongolian, and can be solved by elimination (research-science 2a(3); competitor "Word bank vs keyboard": semantic, orthographic and phonetic distractor classes, https://patents.google.com/patent/US9875669B2/en). The textbooks' morpheme columns (Beginner p69 [PDF 70]) and harmony tables (Survival p19, p47, p75, p94-96 [PDF 21, 49, 77, 96-98]) teach these contrasts. Version 1 gets them from whole-word siblings that already exist in reviewed sentences, so nothing is generated.

**Picking at runtime.**

- `bankFor(item, sentence, {rung, seed})` uses the seed `${sentenceIndex}:${dir}:${day}:${retry||0}`.
- `BLOCKS`: answer tiles + 3 from the pool, with siblings preferred.
- `EASY`: answer tiles + 1, the first sibling if any (chunked).
- `STUDY`: answer tiles only.
- Two-token sentences (46 of them) therefore get 5 tiles on `BLOCKS`: a blind guess succeeds 1 time in 20. Duolingo banks carry about 4 extra words (research-competitors).

**Check enables** when the number of placed tiles is at least the token count of the **shortest** accepted form. The 4 sentences whose `alt.mn` drops the copula (canonical length 3, shortest accepted 2) can then be submitted.

**Grading.** `gradeBuild(placed, accepted) = gradeAnswer(placed.join(' '), accepted, 1)`, where `accepted = [canonical, ...alt]`.

- Strictness 1 means exact only: tiles have no typos.
- An order is accepted **only** if Luna listed it (4 approved reorderings in `alt.mn`, 33 in `alt.en`). The app never permutes anything (CLAUDE.md p18 rule).
- Textbook backing: in Modern Mongolian p155-156 [PDF 167-168] (drills ii–iv, keys p253-254 [PDF 265-266]) the same word set builds two sentences of opposite meaning. Order is meaning. This is also why an unlisted order must be rejected rather than guessed at.
- The collision test (`tools/test.html:500`) keeps passing, because the shared grader is not loosened.

**Order-aware diff.** `orderDiff(given, correct)` → `{want: [{tok, state}], got: [{tok, state}]}`:

- LCS over exact token matches gives `hit`.
- A correct-form token found among the unmatched given tokens is `moved`: right word, wrong place.
- Otherwise, an unmatched given token within one edit (length ≥ 3) is `near`.
- Otherwise `miss`.
- Given tokens left over are `extra`, and are struck through on the `You:` line.

It replaces `diffTokens` on sentence verdicts, typed and tiles alike, so a swapped order stops showing all green. `diffTokens` stays for grammar transforms until they move too.

### 3.7 Mismatch defaults to Again, with an explicit appeal

- **On `fb.ok === false`:**
  - `Continue` grades 1. It is in the Enter order.
  - `My answer was right` (typed and tiles only):
    - grades 2 (Hard, decision D4);
    - writes `P.appeals[key] = {k, dir, ref, given, day}`, where `key = 'a' + hashSeed(dir + ref + norm(given)).toString(36)` and `ref` is the canonical `mn` for a sentence or the word id;
    - queues no retry, adds 1 to `S.summary.appealed`, and advances.
  - On a retry the appeal is logged and counted as fixed; it changes no grade.
- **Why:**
  - Once the app is live there is nobody else to appeal to (`grade.js:6-12`).
  - Today's override is the unlabelled four-way bar, which also allows Easy.
  - The Lingvist pattern does the same: the verdict comes first, then corrective work, graded on the first attempt (competitor "Lingvist").
- **The list stops growing at 500 entries.** Later appeals still grade Hard but are not logged, and the Done line reads `review list full`.
- **Luna's side:**
  - `py tools/review-sheet.py --appeals code.txt` reads a pasted backup code. It lists Mongolian appeals not already present in that sentence's accepted forms. Zөв adds the phrasing through `alternatives.py`'s `HAND` table.
  - English appeals are printed for Fred or Claude to add to `HAND`, since English is not Luna's job.
  - Resolved entries drop out by content (already in `alt`), so nothing is ever deleted from the synced map.

### 3.8 A verified "I know this"

- `I know this` is only offered on the unflipped face.
- It runs `buildChoices(word, POOL, {dir: 'mge', seed: `${id}:check:${day}`})`:
  - **Right** → grade 3, or 4 via `Was easy`, and `S.skip.add(id)`.
  - **Wrong** → no grade, and the card stays queued.
  - **Unusable choices** (`usable === false`) → `I know this` is hidden.
- XP for a verified Good is 6 + 3 = 9, against today's unverified 20.
- Why:
  - Letting learners drop cards they claim to know slightly hurt learning (Kornell & Bjork 2008, research-science 1a).
  - The claim was the one ungraded route to the XP cap (audits-gami "bends numbers are real").

### 3.9 Honest intervals

- New `scheduledDays(ivl) = Math.max(1, Math.round(ivl))`, exported from `scheduler.js` and used by `applyGrade` **and** every readout. One source of truth.
- Readouts print `fmtInterval(scheduledDays(ivl))`, so no minutes or hours ever appear.
- After a graded miss the readout is `THIS LESSON`. It is true, because §3.5 always queues a retry.
- For a sentence with several targets the readout is the range over its targets (`NEXT 2–5D`), instead of `targetIds[0]` alone.
- Retries show no readout.

### 3.10 Light adaptive difficulty: rolling first-attempt accuracy

`difficultyBand(history, today)` runs once at `start`:

- It looks at the last 3 history rows with `reviews > 0` (today's earlier session included) and sums the new `right` field against `reviews`.
- Below **15** graded words it returns `null` and Progress says `not measured yet`.

| Band | First-try accuracy | `S_TYPE` | Lapse rule (`g === 1 && s < …`) | New words |
|---|---|---|---|---|
| `ease` | < 78% | 7 d | 10 d | `room − 2`, min 0 |
| `steady` | 78–92%, or not measured | 3 d | 7 d | `room` |
| `push` | > 92% | 1.5 d | 3 d | `room + 1` |

- `room` is the scheduler's existing figure (`scheduler.js:69`), and the back-off for a review pile-up still applies first.
- The band never changes mid-session. The 3-day window is the hysteresis.
- Why:
  - Wilson 2019's ~85% is a machine-learning result, so treat it as a band, not a target.
  - Adapt slowly, over several sessions.
  - Duolingo's Birdbrain predicts difficulty per exercise.
  - (research-science 2b and recommendations P1; https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain)
- The scheduler's comprehensibility scoring is unchanged. Past the content ceiling only the rung lever matters, and the plan says so on Progress rather than pretending.

### 3.11 Grammar drills (reuse and fix the build drill)

- **Build drills** use `tiles.js`:
  - tiles = `tokensOf(drill.mn)`, lowercase, so no first-word leak;
  - bank = tiles + optional authored `drill.extra` distractors;
  - grading = `gradeAnswer(join, [drill.mn, ...(drill.alt||[])], 1)`;
  - the shuffle is seeded on `${drill.id}:${day}:${pass}`;
  - a placed tile can be tapped back, replacing `⌫ Remove last`.
- **Missed drills** are appended once to the end of the pass as ungraded retries:
  - `choice` → the same options reshuffled with seed `r1`;
  - `transform` → tiles of `drill.to`, using tokens of `drill.from` that are not in the accepted forms as distractors (e.g. байна against байхгүй);
  - `build` → `STUDY`.
- `P.grammar` right/wrong and grammar XP count the first attempt only.
- Done: `4 of 5 right first time · 1 fixed`.

### 3.12 Edge cases

- **Leaving mid-lesson (✕):** retries vanish with the session. The Again is already saved, so FSRS brings the word back tomorrow. As today, no history row is written.
- **Two sentences sharing a target:** the second stays ungraded (existing). A retry is of the item that was missed, never of its words one by one.
- **Sync arrives mid-lesson (`adopt`):** retries live in `S` and are untouched. `awardGrade` already grades against the newer `P`.
- **A card skipped through the deck check:** `S.skip` still applies. Retries never come from skipped cards.
- **Keyboard:**
  - Enter order becomes `submit, check-word, tiles-check, grammar-check, grammar-build-check, attempt-continue, card-next, retry-continue, study-build, got-it, grammar-continue, deck-learn, next`.
  - `1`–`9` place bank tiles when a bank is on screen. They pick options as today otherwise.
  - `Backspace` outside a text field returns the last placed tile.

---

## 4. Data & state

**Synced `P`.** These fields are additive, have `blank()` defaults, and travel in the backup code.

| Field | `blank()` default | Read as | Where it travels | `mergeStates` | `rebase` |
|---|---|---|---|---|---|
| `sentenceMode` | `'auto'` | anything except `'type'`/`'blocks'` → `'auto'` | `main` | settings from the primary copy (existing rule, no code) | last writer (existing fallback) |
| `appeals` | `{}` | map `key → {k:'s'|'w', dir, ref, given ≤120 chars, day}` | `main.appeals.<key>`, one op per key | **new union**: `out.appeals = {...b.appeals, ...a.appeals}` | last writer per key. Keys are content hashes, so both devices write identical values |
| `items[id].g` | absent = unknown | last FSRS grade 1–4, written by `applyGrade` | inside the word's record in `items-N` (atomic) | `laterItem` (existing) | `isItem` (existing) |
| history row `right` | absent = 0 | words graded > 1 on first attempt that session | year document | `fullerRow` (existing, whole row) | **add to `ROW_COUNTERS`** (`sync.js:59`) and to `recordDay`'s sum list (`progress.js:66-70`) |
| history row `fixed` | absent = 0 | retries answered right | year document | as above | as above |

**Notes:**

- **No new Firestore documents**, so Fred never pastes new rules.
- A word's `g` adds no operations: a grade still sends exactly the word and `xp`, so `tools/test.html:925` stays green.
- **An old build on the iPhone drops `g`** at its next grade of that word. Missing means unknown, and the rung falls back to `s`/`R`.
- Old builds pass `sentenceMode`, `appeals` and the extra history counters straight through (`toDocs` rest → `main`; `normalise` is `Object.assign`).
- **No device-local state** in this workstream. The sound mute belongs to the Sound workstream.

**Session-only `S`.** These live in `app.js` and are never saved:

- `S.rung` and `S.attemptMin`;
- `S.bank` (tile objects) and `S.build` (placed indices), shared with grammar so `S.gBank`/`S.gBuild` disappear;
- `S.study` (`'show'|'build'`);
- `S.check` (deck check: `{choices, picked}`);
- `S.band`;
- `S.summary.{missed, fixed, appealed}` (`right` and `perfect` already exist).

Retry metadata lives on the spliced items (`retry`, `rung`, `confusion`, `origin`). `advance()` resets all per-item fields.

**Backup-code safety.**

- **Tests to add:**
  - a v1 code and a pre-ladder v2 code import with `sentenceMode: 'auto'`, `appeals: {}` and items without `g`;
  - `sentenceMode: 'type'` and `'blocks'` survive a round-trip (the falsy-value pattern of `test.html:785-787`);
  - `g` survives `toDocs`/`fromDocs`;
  - a code from this version imports into the shape an older build expects (unknown fields kept).
- `sentSkill` stays untouched: it is dead but additive-only.

---

## 5. Content

**New: `tiles` pools, generated, Mongolian half reviewed.**

- `tools/tiles.py` builds them from the reviewed corpus. No machine-written Mongolian is introduced.
- The open question is whether any pool word, swapped into the sentence, would *also* be correct. If it would, Fred's right answer would be graded wrong (the appeal covers that meanwhile).
- **Luna's task:** a new section in `tools/review-sheet.py`. Per sentence it shows the sentence, its English, and its ≤5 Mongolian pool words, and asks her to tick any that would also make a correct sentence.
  - `--apply` removes ticked words and sets `tilesReviewed: true`.
  - **About 35 minutes for all 164 sentences**, at 10–15 s each.
  - If time is short, do the 86 sentences with same-stem siblings first (the risky kind, about 20 minutes). Look-alikes from unrelated words rarely form a valid sentence.
- English pools are not hers. They follow the stoplist and gloss exclusions in §3.6, and Fred's appeals catch the rest.

**Grammar build drills (5 items).**

- Optional `extra` distractors (1–2 each, picked from the topic's own contrast: байдаг vs байна, -ыг vs bare noun, бэ vs уу) and any `alt` orders.
- Written by Claude, `reviewed:false`, in the same sheet: **about 5 minutes**.
- Basis:
  - the opener triplets and transformation sets (Beginner p37, p68, p86 [PDF 38, 69, 87]);
  - the зөв/буруу correction set (Beginner p90-91 [PDF 91-92]);
  - the existing topic cites in `grammar.json`.

**Appeals (ongoing).** Mongolian ones only, about a minute each. Expect a handful a month: 128 `alt.mn` and 435 `alt.en` forms already cover most legitimate phrasings.

**Formats this design follows.** Each is cited by printed page. Nothing is copied: tiles are Fred's own sentences.

| Format | Where in the books | Used for |
|---|---|---|
| Scrambled words → sentence, with the particle as its own tile | Beginner p54, p69-70, p89 [PDF 55, 70-71, 90]; Survival p15, p92 [PDF 17, 94] | `BLOCKS` / `EASY` |
| Same word set, two orders, two meanings (both keyed) | Modern Mongolian p155-156, keys p253-254 [PDF 167-168, 265-266]; word-order minimal pairs, key p221 [PDF 233], key p237 [PDF 249], p152 [PDF 164] | accept only listed orders; never permute |
| Noun + stem + suffix columns; vowel-harmony suffix tables | Beginner p69 [PDF 70]; Survival p19, p47, p75, p94-96 [PDF 21, 49, 77, 96-98] | why distractors are same-stem siblings; the later suffix-chip rung |
| Complex sentence broken into its two simple sentences | Modern Mongolian p138 [PDF 150]; keys p239-240 [PDF 251-252] and p250 [PDF 262] | **deferred** `SPLIT` rung (D10): an optional `parts: [{mn, en}]` field, written by the Content engine, `reviewed:false`. Only 16 current sentences have 5+ tokens, so it matters once B1 content arrives |
| Letter anagrams | Survival p77 [PDF 79] | deferred word rung (D9) |

**Sarnai:** nothing in this workstream.

---

## 6. Build

**New files**

- `src/core/ladder.js`, DOM-free:
  - constants `RUNG`, `MAX_RETRIES = 2`, `RETRY_GAP = 3`, `BANDS`;
  - `needsSupport(item, R, band)`, `sentenceRung(p, targetIds, ctx)`, `cardRung(p)`, `lower(kind, rung)`;
  - `gradeFor({kind, rung, dir, retry}, outcome)`, which returns 1–4 or `null`;
  - `nextRetry(item, outcome, ctx)`, `retryIndex(items, i, retry)`, `difficultyBand(history, today)`.
- `src/core/tiles.js`: `tokensOf`, `properNouns(sentences, words)`, `chunkMulti(tokens, words)`, `bankFor(item, sentence, opts)`, `acceptedFor(sentence, dir)`, `minAcceptedLen(accepted)`, `gradeBuild(placed, accepted)`.
- `tools/tiles.py`: writes `tiles` and `tilesReviewed` into `sentences.json`. `--check` verifies the exclusion invariant and pool sizes, with exit 1 on failure. Run it after `alternatives.py` and after any `review-sheet.py --apply`.

**Changed files**

- `src/core/scheduler.js`:
  - export `scheduledDays`;
  - `applyGrade` uses it and writes `g`;
  - `buildSession` takes `opts.band` (rung thresholds and the new-word delta) and attaches `rung` to sentence and card items. Its output shape is otherwise unchanged, and it never contains retries.
- `src/core/grade.js`: add `orderDiff`.
- `src/core/grammar.js`: `gradeDrill('build')` accepts an array or a string and grades through `gradeAnswer(…, 1)` against `[mn, ...alt]`. The `words` field stays readable but is no longer the answer key.
- `src/core/progress.js`: `blank()` gets `sentenceMode`, `appeals`; `recordDay` sums `right` and `fixed`.
- `src/core/sync.js`: `ROW_COUNTERS` += `right`, `fixed`; `mergeStates` unions `appeals`.
- `src/ui/app.js`:
  - the `S` fields above;
  - `commitAttempt(choice)` replaces `grade(g)`: works out the outcome, runs `gradeFor`, runs `awardGrade` once per id, logs any appeal, then `nextRetry`/`retryIndex` splice, `save`, `advance`;
  - new actions `use-blocks`, `type-instead`, `tile`, `tile-back`, `tiles-check`, `attempt-continue`, `attempt-hard`, `attempt-easy`, `appeal`, `retry-continue`, `study-build`, `got-it`, `deck-check`, `deck-check-pick`, `sentences-mode`;
  - `card-next` keeps its name (`tools/smoke.html:143-150` depends on it);
  - `choicesFor` seeds with `:r${retry}`;
  - `perfect` gate (§3.5);
  - `finish()` writes `right`/`fixed`;
  - the Settings row; the Enter and number-key changes.
- `src/ui/views.js`:
  - `lessonBar(items, i, deckI)` with `fix` segments and `· N FIX`;
  - a shared `verdictPanel()` and `tileBoard(bank, build, opts)`;
  - `viewSentence` gains `TYPE`/`BLOCKS`/`EASY`/`STUDY` branches;
  - `viewCard` gains `PAIR`/`STUDY` and honest `NEXT`;
  - `viewDeck` gains the check;
  - the grammar build uses `tileBoard`;
  - a `MISSED LAST TIME` tag when any target has `g === 1`.
- `src/ui/base.css`: `.rail i.fix` (hatched), `.tile-word.placed`, `.diff .moved` (underline) and `.extra` (strike), `.tag.fix`.
  - Placing a tile uses the existing `rise` under `.reveal`.
  - A refused `STUDY` tap uses the existing `mark` with a red border, 200 ms, and no movement.
  - Both are covered by `prefers-reduced-motion`.
- `src/data/sentences.json`: `tiles`, `tilesReviewed`, written by the tool only.
- `src/data/grammar.json`: optional `extra` and `alt` on build drills.
- `tools/review-sheet.py`: a tiles section and `--appeals`.

**Tests: `tools/test.html`**

*Fix first:*

- `idsOf` at 167-169 handles retry items, which have `retry` set and are skipped by every grading loop.
- Add the once-per-word `seen` guard to the scheduler and trajectory loops (180-181, 351), so the day-31 figure stops being inflated.

*New section `ladder`:*

- `needsSupport` cases: new, R < 0.6, s < 3, lapsed with s < 7, stable, `drill:false`.
- Band thresholds move `S_TYPE`.
- `sentenceMode` `'type'`/`'blocks'` override `'auto'`.
- `gradeFor` table, every row of §3.4. No tile rung ever returns 4. Every retry returns `null`.
- `nextRetry`:
  - rung drops exactly one, then `STUDY`;
  - never a third retry;
  - an appeal returns `null`.
- `retryIndex`:
  - the gap is ≥ 3 when there is room, otherwise the end;
  - retry 2 is always last;
  - end-round order is the order of the misses.
- A simulated session loop with deterministic misses calls `applyGrade` at most once per id. `P.xp` and `P.items` are identical whether the retries succeed or fail, and the first grade stands.
- `perfect` is never set from a retry or a tile attempt.

*New section `tiles`, for every sentence and both directions:*

- the pool is disjoint from every accepted-form token;
- canonical tiles joined → accepted;
- every listed alternative that is a reordering or subset of canonical tokens → accepted;
- a sample of unlisted permutations → rejected;
- `minAcceptedLen` equals the shortest listed form;
- no first-word capital except `I` and proper nouns;
- `EASY` merges the multi-word entries;
- the bank is stable for one seed and different across days and retries.
- `orderDiff`: «хаагаач хаалгыг» against «Хаалгыг хаагаач» gives one `hit` and one `moved`.

*Honest intervals:* for random states and every grade, `scheduledDays(preview[g])` equals `daysBetween(today, applyGrade(…).due)`.

*Grammar:* replace 717-728. Each build drill's own tokens (lowercase) are accepted; a swap is rejected unless listed; tiles are never capitalised; `extra` is disjoint from the accepted tokens.

*Backup and sync:*

- the round-trips in §4;
- `mergeStates` unions `appeals`;
- `rebase` adds `right`/`fixed` gains;
- `recordDay` sums them;
- `g` rides inside the item and still produces 2 operations (925).

**Tests: `tools/engine-test.html`**

- Two devices log different appeals offline; both survive the first join and later sync.
- Offline `right`/`fixed` gains on two devices add up.
- A device that drops `g` (simulated old build) is resolved by `laterItem`, never crashes, and `g` reappears when a current build grades the word.

**Tests: `tools/smoke.html`**

- Keep the existing pick → `card-next` → xp moves step.
- Add, on the laptop frame:
  1. `mc-off`, type `zzz`, `check-word` → `MISMATCH` is shown, and `Continue` moves xp exactly once.
  2. The rail gains a `.fix` segment and the counter shows `FIX`.
  3. Advance to the `.tag.fix` item and answer it. Stored xp is **unchanged**.
  4. The Done screen shows `fixed`.

**Docs**

- **`docs/INSTRUMENT.md`**, subject to Fred's decisions:
  - *SRS grade bar* becomes: a match gives Continue (Good) plus Was hard/Was easy with intervals; a mismatch gives Continue (Again) plus the appeal; intervals are scheduled whole days.
  - *The app grades a closed set itself* gains the tile and retry rules.
  - A new component, **Building blocks**.
  - *Lesson bar*: FIX segments.
  - *Copy*: `FIXED`, `STUDY`, `CHECK`, `THIS LESSON`.
- **`CLAUDE.md`:**
  - the one-grade rule names retries as ungraded (`gradeFor` → null);
  - the grade policy;
  - State gets `sentenceMode`, `appeals`, `items.g`, history `right`/`fixed`;
  - Content schema: `tools/tiles.py` is the only writer of `tiles`/`tilesReviewed`;
  - fix the stale «Сайн»/«Дахин» `mcMode` note and the "Interface chrome is Mongolian" line;
  - document the verified "I know this".
- **`ROADMAP.md`:** a "Learning loop — BUILT" entry.

**`build.py` / `sw.js`:** no change. `src/core/*` and `src/data/*` are copied and precached wholesale (`build.py:63-65, 75-77`), and all new UI stays in `views.js`/`app.js`. Run `py build.py && py tools/run_tests.py tools/smoke.html` after the UI work regardless.

---

## 7. Size & dependencies

| Slice | Contents | Size |
|---|---|---|
| A1 Honesty pack | `scheduledDays` + honest readouts and ranges; mismatch → Again + appeal (`appeals`, merge rule, tests); `perfect` gate; verified "I know this" | **S** (1) |
| A2 Retry loop | `ladder.js` (`gradeFor`, `nextRetry`, `retryIndex`); `commitAttempt`; `PAIR`/`STUDY` word rungs; lesson-bar FIX; history `right`/`fixed`; grammar retries; test-helper fixes; smoke step | **M** (1–2) |
| A3 Building blocks | `tiles.js`, `orderDiff`, `tools/tiles.py` + data; `BLOCKS`/`EASY`/`STUDY` sentence views; Use blocks/Type instead; keyboard; grammar build migration; tests | **M** (2) |
| A4 Start rung + band | `items.g`, `sentenceRung`, `sentenceMode` row, `difficultyBand`, Progress stat, tests | **S** (1) |
| A5 Review plumbing | tiles section and `--appeals` in `review-sheet.py`; Luna's ~40 min | **S** (0.5) |

**Total: L, about 5–7 focused sessions.**

**Order.** A1 → A2 → A3 → A4. A5 can run alongside A3.

**What must land first:**

- Fred's answers to D1 (tile grade), D3 (grade bar) and D4 (appeal grade), because they amend INSTRUMENT.
- The `tools/test.html` helper fixes, at the start of A2.

**Interfaces with the other workstreams**

- **Sound.**
  - This workstream calls `sfx('right'|'wrong'|'fixed'|'tile'|'refuse')` **only inside click and keydown handlers**: verdict reveal, a resolved retry, placing a tile, a refused `STUDY` tap.
  - Sound owns `ui/sound.js`, the mapping, the mute setting, and the `build.py` copy/rewrite lines for a new UI module.
  - The ladder adds no new module.
- **Gamification.**
  - It receives `S.summary.{missed, fixed, appealed, right, reviews}` and the history `right`/`fixed` counters.
  - Retries earn 0 under the current XP definition. If Gamification moves to fixed points per event, a fixed mistake must never earn more than a first-try success, or failing first becomes the better strategy.
  - The verified "I know this" closes the 20-XP loophole it flagged.
  - It owns the Done-screen layout of `N mistakes fixed`.
- **Less text.**
  - It owns the shared `verdictPanel` layout and disclosure: context chips, `You:` hidden when it equals the answer, the typo explanation shown only the first time, first-view captions.
  - The budgets in §2.10 assume its removals (`i+1`, `TRANSLATE`, `CARD · REVIEW`). This workstream adds the `FIX`/`STUDY` copy.
- **Reading.**
  - May reuse `nextRetry`/`RUNG` for a missed comprehension question: `CHOICE → PAIR`, then highlight the answer line, which stands in for `STUDY`.
  - Its "graded today" guard (`items[id].last !== today`) is compatible, and `applyGrade` writes `g` for reading grades too.
  - Retries never grade, so the two cannot double-grade.
- **Content engine.**
  - Every new sentence pack must run `tools/tiles.py` (and `--check`) and keep `ids` complete. New Mongolian pools go to Luna's sheet.
  - It may add `parts` for long sentences (D10).
  - A reviewed morphology table later enables the suffix-chip rung.

**What this unblocks.** Honest numbers for Gamification; the sound events; a retry contract for Reading; and the "easier if wrong" path any future content pack gets for free.

---

## 8. Decisions for Fred

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | FSRS grade for a correct tile build | (a) English → Mongolian Hard, Mongolian → English Good; (b) all tiles Hard; (c) all Good | **(a)**. Measured at day 45: 106 / 99 / 105 known words. It caps only where the tile supplied the Mongolian. Never Easy on tiles in any option. |
| D2 | Do sentences start on blocks by themselves? | `Auto` (new or shaky targets → blocks); `Type` (always type first; blocks only via the button or a retry); `Blocks` | **Auto**. 69% of week-1 sentences, 20% in week 4, about 0–1 a session past the content ceiling. |
| D3 | After a correct typed answer | (a) `Continue` = Good, plus ghost `Was hard · 2D` / `Was easy · 9D`; (b) keep the four-cell grade bar | **(a)**: 12 chrome words instead of 30, and it matches multiple choice. **Amends INSTRUMENT "SRS grade bar"**. |
| D4 | Grade for `My answer was right` | Hard / Good | **Hard**. The app cannot verify it until Luna rules. The phrasing goes to her list either way. |
| D5 | Verified "I know this", when right | Good + optional Easy / Easy | **Good + optional `Was easy`**. 4-way recognition is real but not production evidence. |
| D6 | Retry cap | 1 retry; **2 (one rung down, then Study)**; uncapped | **2**. Study cannot fail, so every mistake ends right and the lesson always finishes. |
| D7 | Lesson-bar honesty | grow the bar with hatched FIX segments; or a separate "fix round" counter after the main bar | **Grow the bar**. The total changes only when a mistake happens. |
| D8 | Adaptive pace band | on (78/92% over 3 study days) / off | **On**. It moves only the blocks threshold and ±new words, and it is visible on Progress. |
| D9 | Word-card ladder extras | add `mcMode: 'auto'` (typed once stability ≥ 21 d) and letter tiles (Survival p77); or not yet | **Not yet**. Keep his current multiple-choice setting; revisit after A1–A4. |
| D10 | `SPLIT` rung for long sentences (complex → two simple, Modern Mongolian p138) | build when sentences of 5+ tokens arrive from the Content engine; or now | **Later**. Only 16 of 164 sentences qualify today. |

---

## 9. Risks and how each is contained

| Risk | Containment |
|---|---|
| A retry reaches `applyGrade`: same-day ×1.285 / ×0.285 compounding, double reviews and XP | Two gates: `gradeFor` returns `null` for `retry ≥ 1`, and `S.graded`. The core test asserts identical `P` whether retries pass or fail; the smoke test asserts xp is unchanged on a FIX. |
| Endless loop, or a lesson that balloons | At most 2 retries per item. The last is `STUDY`, which cannot fail. At ~2 first-attempt misses a session (replay), a session grows by ~2–4 screens, about 1 minute. |
| A distractor makes an unlisted but correct sentence, so a right answer is graded wrong | Pools exclude every accepted-form token; Luna ticks pool words that would also be correct (~35 min); `My answer was right` grades Hard and logs the phrasing for her. |
| Tiles breed overconfidence or dependence | Start on blocks only for new or shaky targets, and fade by stability (69% → 20% in four weeks). English → Mongolian tiles cap at Hard. Never Easy. The `Type` mode is available. |
| Hard grades inflate difficulty permanently | Split policy (D1): mean difficulty 6.00 against 6.16 for all-Hard, and 7 more known words by day 45. Appeals are rare. |
| Old iPhone build drops `g`, or ignores new fields | Missing `g` means unknown, and the rung falls back to `s`/`R`. New `main` fields pass through untouched (`Object.assign`). No new Firestore documents. |
| The `appeals` map is lost on first sign-in, or grows without bound | Union rule in `mergeStates` plus an engine test. Cap of 500, with a visible "review list full". Entries resolve by content, never by deletion. |
| History counters lost offline or overwritten by a second session | `right`/`fixed` added to `ROW_COUNTERS` (`fold`, `isCounter`) and to `recordDay`'s sum list, with tests. |
| Smoke and existing tests break (`idsOf`, build-drill JSON equality, `card-next`) | `idsOf` and the guards fixed first. Grammar tests 717-728 rewritten to the new grader. `card-next` name kept. |
| `tiles` go stale after a content edit or Luna rewrite (sentences have no ids) | `tools/tiles.py --check` and the `test.html` invariant fail loudly. The runtime picker also filters accepted tokens out, so a stale pool degrades to fewer distractors, never to a wrong grade. |
| Past the content ceiling, the band's "push" has nothing to add | Stated on Progress. The rung threshold is the lever that still works. More content is the Content engine's job. |
| Text creep from new controls | Every screen is budgeted (§2.10). Retries offer no switch buttons. Explanations go through Less-text's first-time-only disclosure. |

---

## 10. Versus Ling

**What Ling does** (research-competitors, Ling items: https://ling-app.com/blog/ling-app-review/, https://www.langoly.com/ling-app-review/, https://eurolinguiste.com/ling-app-review-trying-out-the-ling-language-learning-app/):

- lets you retry a mistake at the end of the lesson;
- has a sentence-ordering mini-game;
- per reviewers, has historically used random rather than spaced review;
- runs one template across 60–80 languages;
- tops out around A1–A2.

**What this workstream gives Fred that Ling's Mongolian course does not:**

1. **A mistake comes back twice, and easier each time.** Three screens later on a lower rung, then as a study-and-build at the end, so every mistake ends with a correct answer. Ling's retry is a repeat at the end, with no change of difficulty.
2. **Building blocks that teach Mongolian, not just word order.** Distractors are other case and verb forms of the same stem (хаалга / хаалгыг / хаалгаа), taken from Luna-reviewed sentences. A language-agnostic template cannot pick them.
3. **Every order Luna approved counts; none she didn't.** The app never permutes Mongolian. Two orders with opposite meanings (Modern Mongolian p155-156) cannot be confused by the grader.
4. **An appeal that reaches a native speaker.** "My answer was right" lands on Luna's sheet, and her yes becomes an accepted answer for good.
5. **Grades that reflect what was actually recalled, feeding FSRS.**
   - A tile success in the production direction is Hard, and so comes back sooner.
   - Retries never inflate a memory.
   - The NEXT readout is the real date.
   - Mistakes return on later days with `MISSED LAST TIME` and on blocks.
   - Ling's reviewed review is random by comparison.
6. **The difficulty moves with him.** A slow first-try-accuracy band shifts how much help sentences get, and the figure behind it is printed on Progress.
