# Plan: an app that answers back, reads, sounds right and keeps an honest score

*Final plan, Mon 12 Oct 2026. It merges six designs, covering the learning loop, sound, reading, gamification, less text and content, with the research behind them and four reviews of the draft. A "session" is one focused build session with Claude.*

## TL;DR

- **The common cause.** Each complaint has a cause in the code. Under all five, the app has had no new words since about day 33, so a lesson is only 2-7 steps. That figure is simulated; step 0 checks it against Fred's real progress.
- **R1 (6 sessions, about 13-20 Oct):**
  - sound on every answer;
  - honest "Back in N days";
  - **57 new words**, 6 a day;
  - missed cards that come back until right;
  - the frozen level, the 2071 date and the "+10" badges gone from view;
  - Start always works.
- **R2 (5 sessions, to about 27 Oct):**
  - a score he can check by eye;
  - a short passage about his home at the end of each lesson;
  - **Use blocks** on every sentence.
- **R3 (6 sessions, to about 4 Nov):** Today at half the words, plus one path of units with checkpoints and earned rest days.
- **Later:**
  - **R4:** the Read tab.
  - **R5:** the weekly content routine, grammar inside lessons, and conversation practice.
  - **R6:** Luna's voice, if she agrees to record.
- **Pace.** Dates assume 5 sessions a week; at 2-3 a week, double them.
- **Always:**
  - one FSRS grade per word per lesson;
  - real figures only;
  - no new Firestore documents;
  - no book text;
  - nothing Claude writes in Mongolian goes live unreviewed.
- **Fred answers four questions; "OK" accepts the other defaults.**

## Before R1: four questions and three jobs

**The questions.** Defaults apply after a day.

1. **Silent switch.** Is your iPhone usually on Silent while you study?
   - If so, effects can play through the switch, but each cue briefly pauses music and takes over Bluetooth.
   - *Default:* respect the switch. We test both ways with you in session 1.
2. **Blocks.** Should a sentence start on blocks by itself when a word is shaky?
   - *Default: no.* Type first, with blocks one tap away.
   - Starting on blocks grades Hard. That permanently raises the word's difficulty, which can mean about 80% more reviews of it in a year.
3. **Home units.** Should your 154 studied words be credited from your memory data, or each unit need a checkpoint? *Default: credited.*
4. **Rest days.** Should every 7 lessons earn one rest day (at most 2 saved) that covers a missed day? *Default: yes.*

The new Today mock is shown beside his June prototype's home screen when he answers 3 and 4.

**The jobs (step 0, about 30 minutes):**

- **Check where Fred really is.** Fred exports a backup code, and `tools/progress-report.py` reports, for the last 14 days:
  - words introduced, against all drillable words;
  - words due per day;
  - steps per lesson.

  If more than 30 drillable words are still unintroduced, session 3 goes before session 2.
- **Ask Luna.** One message:
  - the four open ROADMAP questions;
  - will she also check sentences and passages (about 20-30 minutes a week more)?
  - will she record for R6, and may her recorded voice be published?
  - The pilot passages go to her too.
- **Move the textbooks.** Claude copies the extracted textbook text from the temporary session folder to `C:\Users\frede\Documents\mongolian-books\`, outside the repo, and notes the path in CLAUDE.md.

## What we learned

1. **"No direct learnings."**
   - Nothing is asked twice.
   - Sentences are always typed.
   - Four things are untrue:
     - "NEXT 4h" after a miss, when the word actually returns tomorrow;
     - a wrong answer can still be graded Good;
     - "I know this" pays 20 XP unchecked;
     - quitting after a miss restarts the same card.
2. **"No sound effects."** There is no audio code, INSTRUMENT forbids fanfare, and neither device has a Mongolian voice.
3. **"No reading material."** The 164 sentences contradict each other when grouped into a story, and no textbook passage is above 78% known. Fred's June prototype had a reader; the rewrite dropped it.
4. **"The gamification is absolutely shit."**
   - XP reaches 8,409 and buys nothing.
   - The level freezes at 5; nine of the 14 levels are unreachable.
   - Locked badges show only "+10".
   - The B1 date swings between 2029 and 2071.
   - Today shows the streak five ways.
   - A day with nothing due disables Start and breaks the streak.
5. **"A lot of text."** Question screens are lean, but the Grammar intro has 143 words, Settings 101 and Today 86. Most of it is tiny uppercase mono, and panels close on every sync redraw.

**Underneath: content.**

- The 154 drillable words run out by about day 35.
- The lexicon covers 44% of the textbooks' running words and misses 231 of the 300 commonest.
- The word matcher confuses long and short vowels.

**Review debt.** 74 live sentences and all 5 grammar topics have never been on a review sheet.

## The design

**Page references** give the printed page, then the PDF page in brackets. The books are Beg (*Beginner Mongolian Part 1*), Surv (*Survival Book 023*) and MM (*Modern Mongolian*). A reference names the format borrowed; no text is ever copied.

### 1. Mistakes come back until right

**What Fred sees.**

- **On a miss:** the answer, with misplaced words underlined.
- **About three screens later:** the item returns as **Fix**, one step easier:
  - a typed sentence → blocks with 3 decoys;
  - blocks → 1 decoy;
  - a multiple-choice card → the right option and his pick;
  - a typed word → four fresh options.
- **At the end of the lesson:** it returns at its original step. Right there counts as **fixed**.
- **If he misses again:** **Study** shows the answer, then he builds it. This counts as *shown*, not fixed, and the item comes back tomorrow.
- **On every sentence:** **Use blocks** sits under Check.
- **"I know this"** becomes a four-option check.

**How it works.**

- **Only the first attempt is graded.**
  - The grade is saved at the verdict, so quitting can't undo a miss.
  - Retries never touch the schedule, XP or review counts. Two code checks enforce this.
- **Typed answers:**
  - exact: Good, with quiet *Was hard* and *Was easy*;
  - one-letter slip: Hard;
  - miss: Again, plus **I was right**, which grades Hard and logs his phrasing for Luna.
- **Blocks:**
  - English → Mongolian: Hard, because the blocks supplied the Mongolian;
  - Mongolian → English: Good;
  - never Easy.
  - Typed first scores 3 XP, help scores 2, and the app says so.
- **Decoys.**
  - They come only from reviewed sentences, and other forms of the same word come first (хаалга / хаалгыг).
  - A decoy is never part of an accepted answer.
  - If Fred picks the wrong form of the right word, the app says *Right word, wrong ending*.
  - Only word orders Luna has listed are accepted.
- **Calibration.** Each word records how it was last answered, so R5 can check whether block grades predict recall.

**Grounding.**

- Ordering drills: Beg p54, 69-70 [55, 70-71]; Surv p15, 92 [17, 94].
- Order changes meaning: MM p6, 155-156 [18, 167-168].

**Evidence.**

- **High** for re-asking after feedback, then spacing across days: Karpicke & Roediger 2008; Pashler 2005; Rawson 2018.
- **Medium** for blocks, since no study compares them with typing directly. Because recall beats recognition (Nakata 2016), blocks stay a fallback.

### 2. Sound

**What Fred hears.**

| Moment | Sound |
|---|---|
| Right answer | a two-note rise |
| Wrong answer | a soft fall, never a buzzer |
| Every 5th unassisted first-try answer in a row | a third note |
| Lesson closes | an arpeggio, or a held chord after a unit or badge |

- **Settings:** *Sound effects On / Soft / Off*, set per device.
- **Choosing a set.** Fred picks one of three sets on his iPhone at `?dev=sounds`. A richer set can be rendered as WAV files with Python's `wave` module.
- **From R6:**
  - Luna's recording plays after each verdict, with its own switch.
  - New drills: listen and choose, dictation, and *Hear the difference*. That last covers long and short vowels, words that sound alike, and front and back vowels.

**How it works.**

- **Synthesised in the browser**, with no files and no network requests.
- **When sound plays:** only on a tap that answers a question or closes the lesson.
- **When it never plays:** on navigation, sync, the reading text, a refused tap, or over a recording.
- **Never built:** a machine voice or speech scoring.

**Grounding.** Vowel length: Surv p5, 7 [7, 9]. Sound-alikes: Beg p30, 105 [31, 106].

**Evidence.**

- **Low** for effects. Sound that follows success raises felt competence (Kao 2024); irrelevant sound hurts (Moreno & Mayer 2000).
- **Medium-high** for hearing several speakers (HVPT meta-analysis).

### 3. Baby paragraphs

**What Fred sees.**

- Most lessons end with a short passage about Fred, Luna, the cat and Luna's parents. It is set in 22px, with no English under it.
- One tap gives a word's meaning; a second gives the sentence's English. Taps are never penalised.
- Two to four questions follow, one per screen:
  - in English at first;
  - one in Mongolian from level 3;
  - all in Mongolian from level 4.
- He can reopen the text during the questions, but without English.
- A wrong answer underlines the line that held the answer. Afterwards every line shows its English.

**How it works.**

- **Unlocking.** A passage unlocks at 95% *expected coverage*, meaning the average recall probability of its words, with unstudied words counting as 0. It may contain at most 3 unknown words. Passages are written to reach 98%. Taps on words the app believed known are counted, which tunes this threshold.
- **Levels.** L1-L4 run 15-80 words. L5-L7 go up to 300 words or more and add gist questions and typed answers.
- **Scoring.** Reading never changes the review schedule. A first read scores 1 per question, plus 1 if right. The score is stored once, so two devices can't count it twice.
- **Pace.** One new passage a day. If the main lesson is over 20 items, the day gets either a reading or a checkpoint, not both.
- **Pilot.** Five passages that need no new words, using Fred's June samples where they fit. Pack 1 then adds 13 more.

**Grounding.**

- MM p10-11 [22-23]
- Surv p17-98
- Beg p107-108 [108-109]

**Evidence.**

- **High** for the 95-98% coverage band (Hu & Nation 2000; Schmitt 2011).
- **Medium** for glosses on tap (Yanagisawa 2020).

### 4. Gamification: one path, one habit, one score

**What Fred sees.**

- **Today:** his purpose line, then one gold panel holding:
  - the unit his new words come from (*Unit 3 · Numbers · 12 new words*);
  - *12 lessons in a row*, with the week strip;
  - *Start · 18 items · ~8 min*.
- **Done** is the one celebration: *+46 XP · 17 of 21 right first time · 3 fixed*, then today's square fills in. At most three callouts follow.
- **Progress** holds the path, badges showing how close he is, and words made familiar this week against last week.
- **A closed Numbers panel** keeps every figure that left the main screens: lifetime XP, the last level, the B1 projection, RET and ACC.

**How it works.**

- **Path.**
  - **Home 1-11** are his 154 words. A home unit is done when all its words are familiar, meaning they will last 7 days.
  - **Unit 1-28** follow the textbooks. When a unit's words are familiar, a 5-item checkpoint rides in the next lesson.
  - **Checkpoint pass:** 4 right first time, at least 3 of them typed.
  - **Checkpoint limits:** one attempt per day, recorded at the first answer, so quitting counts. A checkpoint never touches FSRS, and its missed words become next day's sentence targets.
- **Habit.**
  - Finish today's lesson. Every 7 lessons earn a rest day, with at most 2 saved.
  - A rest day covers a missed day. It is drawn as a gold hatch, never as done.
  - A day with nothing due becomes 8 practice cards: the least-remembered words not graded today, graded as normal.
  - *Practise today's mistakes* runs after Done and is not graded.
- **Score.**
  - XP is per first attempt: 1 for answering, +1 if right, +1 if typed.
  - Retries, rereads, appeals and a second practice in one day score 0.
  - XP is shown on Done only and drives nothing.
- **Badges** show have/need. Mistake badges count *words recovered*.
- **Retired:** levels and the B1 date, which move to Numbers.
- **Forbidden:** leagues, gems, chests, multipliers, hearts, "% fluent", pre-filled bars and urgency.

**Grounding.**

- Beginner titles each lesson by a question (Beg p2-137).
- Survival's review lesson (Surv p99 [101]).

**Evidence: medium.**

- Near goals help (Bandura & Schunk 1981).
- Badges with leaderboards harmed motivation (Hanus & Fox 2015).
- Repairable streaks reduce drop-off (Silverman & Barasch 2023).

### 5. Less text

**What Fred sees.**

- One task per screen.
- Details sit behind an ⓘ, and a new control explains itself once per device.
- Labels are plain English.
- Each release brings one "What's new" tip.
- Settings shows the app build, so he can see when the iPhone has updated.

| Screen | Words now | After |
|---|---|---|
| Today | 86 | about 40 |
| Settings | 101 | about 35 |
| Progress + Achievements | 136 | about 60 |
| Done | 59-73 | 22-34 |
| Sentence verdict | 32 | about 12 |

**How it works.**

- At most one tip per screen.
- Panels survive sync redraws.
- A smoke test enforces the word limits.
- Translations that would give the answer away are deferred, never removed.

**Evidence: high.** Removing extra material helps (median d≈0.86).

### Content engine

**What Fred sees.**

- **New words:** 6 per calendar day. The cap counts words first graded today, so a second lesson can't add six more.
- **Lessons** grow from about 5 steps to about 20.
- **From R5:**
  - a grammar topic per unit inside lessons;
  - generated drills for numbers, time, weekdays, family and prices;
  - a 10-minute weekly routine (`/next-unit`).

**Syllabus.**

| Units | Content |
|---|---|
| Home 1-11 | his existing words |
| Unit 1-15 | Beginner, with Survival's practical lessons mixed in (A1) |
| *A visit*, after Unit 4 | greetings, polite та, food, thanks, aimed at Tsagaan Sar 2027 |
| Unit 16-24 | MM chapters 1-10 (A2) |
| Unit 25-28 | MM chapters 11-14 (B1) |

That is about 1,070 words in total. At about 20 a week, the 2,500-word B1 estimate lands around **early 2029**. To beat that, R5 decides on a source beyond the books and a recognition-only track.

**One unit schema.**

- `units.json` holds metadata only. Each word in `words.json` carries its `unit`.
- Ids are `h01…` and `u01…`, and they are permanent.
- Labels ("Home 4", "Unit 4") come from a unit's order.

**Supply rules (simulated):**

- about 22 new words a week;
- two sentences per word;
- release two units ahead;
- sentences go live within 7 days of their words;
- keep a 14-day reserve;
- 5 readings per unit;
- connecting words come first.

**Review rules.**

- **Live but flagged:** single words read off the books' lists, and rule tables. Glosses are written and checked, never copied.
- **Waits for review:** personal or unattested words (голланд, хадам), and everything Claude writes.
- **A `reviewed` flag on sentences.**
  - The 90 already reviewed are true.
  - The other 74 are *legacy*: they stay live and go on Luna's first sheet.
  - Only reviewed sentences feed decoys and checkpoints.
- **Who checks what.** Luna checks everything: words, grammar, tables, decoys, sentences and passages.
- **Fallback.** If that is too much, or a sheet waits more than 10 days, new words drop to a cap of 4 a day. Words keep flowing.

**Safeguards.**

- **Matcher first.** The matcher is fixed before anything else: exact match wins, long vowels stay long, noun and verb suffixes are kept apart, and a self-test runs in CI.
- **Copyright gate.** `overlap.py` runs before anything modelled on a book is committed.
  - It blocks any 5-word run shared with a book.
  - It blocks any whole sentence of 3+ words that matches one. Set phrases are allowlisted, each with a reason.
  - Book text and drafts stay out of the repo.
- **The folk tale** is retold from a traditional telling, not MM's.
- **Generated drills** combine reviewed rows only.

**Grounding.**

- Numbers: Surv p26 [28]
- Time: MM p65 [77]
- Family: Surv p81 [83]
- Glossary: MM p195-220 [207-232]

### Where the designs and reviews disagreed

Each conflict is settled above; items 6-18 of "Changes after review" list them.

## Releases

### Sequencing and pace

**Order: feel first, with content in week one.**

- New words need no review, so they arrive in session 2, and the retry loop runs on full lessons.
- Review starts in week one and never blocks a build.
- R3 must come before R4, because the Read tab needs the tab slot that R3 frees.

**Shipping and rollback.**

- Each session ends with tests green and pushed. Unfinished screens wait behind `?dev`.
- Sentences and passages that come back reviewed go live at the start of the next session (about 15 minutes).
- All new synced fields land in one session, S7, before anything writes them.
- DEPLOY.md gains a two-device check: laptop plus installed iPhone, including the iPhone still on the old build.
- Rollback is `git revert` and push. A revert can't un-write synced fields, which is why they land together.

**How long a lesson gets.**

| When | Lesson | Time |
|---|---|---|
| Now | 2-7 steps | |
| After R1 | 12-20 items, plus 2-6 retry screens | 6-9 min |
| After R2 | plus one reading | 8-11 min |
| After R3 | at most about 28 steps | 9-12 min |

From R5 on, add about one content session a week.

**Always green:**

- `test.html` 925: a grade sends 2 operations.
- 500: collisions.
- The backup-code round-trips.
- The engine suite.
- Smoke 142-149: XP passes laptop to phone.

### R1: The lesson answers back (6 sessions, 13-20 Oct)

R1 adds no synced fields.

| # | Session | Fred notices |
|---|---|---|
| S1 | **Sound and honest numbers.** `build.py` copies every ui module and stylesheet, and fails on any unresolved import (also in CI). Adds `ui/prefs.js`, `ui/sound.js` and `?dev=sounds`. Intervals in whole days. *Was hard* / *Was easy* and *I was right*. "Perfect" only on a real first try. Build row in Settings. Stale doc lines fixed. Pilot passages drafted and handed over on paper. | Sounds; "Back in 4 days"; fewer buttons |
| S2 | **New words.** Matcher hardening with its self-test. Fred approves a retag of about 7 sentences. Ids never reused. The daily cap. Unit 1-2 words (57), connecting words first. | Tomorrow's deck: бас, харин, хоёр… |
| S3 | **Mistakes come back (cards).** Grade saved at the verdict. Fix, the end retry, Study. FIX segments in the lesson bar. "I know this" check. | A missed word returns until right |
| S4 | **Copyright gate.** `overlap.py`, `docs/CONTENT.md`, review-sheet sections for passages and sentences, and a minimal `release.py`. | – |
| S5 | **Unit 1 sentences** (about 85, two per word), run through the gate and sent to Luna. **Unit 3 words** (35) go live. | Number words in the deck |
| S6 | **Game, part 1.** Level, B1 date and lifetime XP move into Numbers. Badges named, with have/need. Practice fallback. Lean Done. *Practise today's mistakes*. Grammar XP on the first pass of the day only. | No level 5 or 2071; Start always works |

**Tests.**

- **New:**
  - intervals match `applyGrade`;
  - a quit after a miss keeps the Again;
  - progress is identical whether retries pass or fail;
  - the cap holds across two lessons;
  - matcher gold set;
  - ids ≥ 1,000 sync;
  - overlap self-test;
  - practice never re-grades a word.
- **Rewritten:** `idsOf`, the once-per-word guard, and the runway test (167-181, 351, 367-370).
- **Smoke:** a retry never moves XP.
- **iPhone:** sound tested with the switch both ways.

**Review.**

- **Luna (L1, about 30 min):** the open questions, the 57 words and the 74 legacy sentences.
- **The pilot:** about 10 min.
- **Luna, second sitting:** the Unit 1 sentences, about 25 min.

**Exit.** Suites green. A week later, Fred says whether complaints 1, 2 and 4 feel fixed.

### R2: A score to check, passages, blocks (5 sessions, to about 27 Oct)

| # | Session | Fred notices |
|---|---|---|
| S7 | **The sync batch** (see the table below), with engine tests. XP per answer. *I was right* logged. New counters and the review log. Sentence `reviewed` and `legacy` flags. | Done: *+46 XP · 17 of 21 right first time · 3 fixed* |
| S8 | **Reader pilot.** Reading is the lesson's last step, using the scheduler's own memory picture. Word, then sentence taps; questions without English; the evidence line; line pairs afterwards. Kept behind `?dev` until the passages are reviewed. | A passage about his home ends the lesson |
| S9 | **Blocks core.** `tiles.js`, `orderDiff`, `tools/tiles.py`. Decoys only from reviewed sentences, and a reviewed pool is never rewritten. *Right word, wrong ending*. | – |
| S10 | **Use blocks everywhere.** The sentence ladder, the grammar-drill loop, and build drills graded against the canonical answer until reviewed. The *Sentences* setting. | **Use blocks** under Check |
| S11 | **Content.** Unit 2 and Unit 3 sentences drafted (about 130 sentences, may take two sittings) and sent to Luna. | – |

**Tests.**

- **New:**
  - every field passes the backup-code, merge and rebase tests;
  - engine tests: appeals and counters from two offline devices, one first-read score, and an old build dropping `g`;
  - appeals never change *right*, *fixed* or badges;
  - reading never calls `applyGrade`;
  - live passages are reviewed;
  - decoys are excluded after every `--apply`;
  - only listed word orders pass.
- **Rewritten:**
  - the `xpFor` tests (626-629, 749-754, 836, 848). `xpFor` stays exported until the engine tests move.
  - grammar build (717-728).

**Review.**

- **Luna:** first the grammar topics, then the decoys and Unit 3 words. Each takes about 25 minutes.
- **Luna, then:** the Unit 2-3 sentences, about 40 minutes in two sittings.

**Exit.** Passages live, and the two-device check passes. Fred says whether complaint 3 feels answered.

### R3: Less text, one path (6 sessions, 28 Oct-4 Nov)

**R3a: no data changes.**

- **S12: lean Today.** The smoke test moves to `data-` hooks (smoke 72-162) in the same commit. Tips, "What's new", plain labels, and the Settings disclosure.
- **S13: the path.**
  - `units.json`, Home 1-11, unit bars from FSRS.
  - Levels retired; Achievements folded into Progress.
  - Word-state dots, from his June prototype.
- **S14: Grammar pages.** Intros collapse on revisit; *Why?* behind a tap.

**R3b: checkpoints and rest days.**

- **S15: path logic.** `path.js`, where attempts survive quitting, and `streakState` with rest days.
- **S16: screens.** Checkpoint screens, rest squares, callouts, and the milestone chord.
- **S17: content.** The other 13 pack-1 passages, plus Unit 4 and *A visit* words.

**Tests.**

- **New:**
  - every word is in exactly one unit;
  - no retake after quitting the same day;
  - a pass needs 3 typed answers;
  - the rest-day rules hold;
  - engine: an offline double pass keeps the earliest pass.
- **Rewritten:** the level tests (618-623, 632) and the streak tests (566-574).

**Review.**

- **Fred:** approves the unit titles (10 min).
- **Luna:** reviews the Unit 4 and *A visit* sentences (about 20 min).

**Exit.**

- The main pages total 180 words or fewer (398 now).
- Start is never disabled.
- The first checkpoints pass.

### R4-R7

**R4: Reading shelf (3 sessions, about 5-9 Nov).**

- **S18:** the Read tab and rereads. Locked passages name their words.
- **S19:** order questions, a retell, Mongolian questions and the tap log.
- **S20:** Unit 1 readings drafted. Pack 1 goes live as Luna reviews it, in two sittings of about 30 minutes.
- **Exit:** the shelf opens with the pilot passages, and every locked passage names its words.

**R5: Routine, grammar, conversation (6 sessions, about 10-17 Nov).**

- **S21:** the full `release.py`, `syllabus.py` (which also reports the readable pages of his books), and the runway line.
- **S22:** scoped review sheets and the `/next-unit` skill.
- **S23:** a grammar topic per unit, with 1-2 tallied grammar items in each lesson. These never touch FSRS.
- **S24:**
  - *Pick the reply*, built from question-and-answer pairs;
  - *Say it to Luna*;
  - *Write two sentences*.
- **S25 (cuttable):** generated drills.
- **S26:** evaluation from the review log, plus the beyond-the-books decision.
- **Exit:**
  - a 14-day reserve held for four weeks;
  - sentences within 7 days of their words;
  - 10 minutes a week or less of Fred's time.

**R6: Luna's voice (5 sessions, from about 18 Nov; only if she agrees to record).**

- **S27:** an iPhone spike behind `?audio-test`.
- **S28:** the recording tool and a 5-minute pilot.
- **S29: audio build.** `build.py` copies `src/audio` with its own manifest, kept out of the precache. The cache survives updates, Range requests are answered, and `*.m4a` is binary. All of this stays inactive until clips exist.
- **S30:** ▶ Luna after verdicts, at 0.75× if wanted.
- **S31:** listening drills. Dictation never adds a second FSRS grade.
- **Rules:** no clip is committed before Luna says yes to publishing it.
- **Exit:** reviewed items play offline on the iPhone.

**R7, later:**

- suffix blocks (Unit 16);
- letter blocks (Surv p77 [79]);
- sentence splitting (MM p138 [150]);
- conversation packs;
- quests.

## New synced fields (all in S7)

Every field gets a `blank()` default, a merge rule, a rebase rule, backup-code tests and an engine test. Everything lives in `main`, `items-N` or the year documents, so there are **no new Firestore documents and no rules to paste.**

| Field | Lives in | Merge at first sign-in | Offline rebase | Old iPhone build |
|---|---|---|---|---|
| `sentenceMode` (`'type'`) | main | later device's settings | last writer | passes through |
| `appeals.<key>` | main | union | last writer per key | passes through |
| `items[id].g`, `.m` (last grade, answer mode) | word record | later review | whole record | drops at next grade |
| history `ans`, `right`, `fixed`, `rec` | year doc | fuller row | counters; `recordDay` uses `ROW_COUNTERS` | keeps, adds none |
| history `xv` (new XP scale) | year doc | fuller row | last writer | may mix scales for a day |
| history `log.<id>` (grade, mode, predicted recall, days elapsed) | year doc | fuller row | last writer per key | keeps |
| `readings.<id>` | main | more reads, then later | `reads`/`taps` add; `last` later; `first` one value, earliest wins | passes through |
| `units.<id>` | main | passed, then more tries | `tries` adds; `last` later; `passed` one value, earliest wins | passes through |

- *Right* and *fixed* come from the verdict, so appeals never count toward them.
- Device-only settings live in `${KEY}:prefs`, outside progress and backups.

## Content calendar

| Week of | Words live | Sentences live | Readings | Luna |
|---|---|---|---|---|
| 12 Oct | Unit 1-2 (57) | – | – | L1, 30 min; pilot, 10 min |
| 19 Oct | Unit 3 (35) | Unit 1 (85) | pilot (5) | grammar topics, 25 min; Unit 1, 25 min |
| 26 Oct | – | – | – | decoys and Unit 3 words, 25 min; Units 2-3, 40 min |
| 2 Nov | Unit 4 + *A visit* | Units 2-3 | – | 15 min; Unit 4 + *A visit*, 20 min |
| 9 Nov | Unit 5 | Unit 4 + *A visit* | pack 1 as reviewed | 20 min; pack 1, 2 × 30 min |
| 16 Nov on | a unit about every 9 days | within 7 days of the words | 5 per unit | 35-45 min a week |

- **Catching up.** Units 2-3 sentences arrive about two to three weeks after their words. Until then those words come up as cards. From Unit 4 on, the 7-day rule holds.

- **Recording weeks.** In late November Luna records two sittings of about 35 minutes, if she agrees. That week's sheets stay small.
- **If the load is too much,** the cap drops to 4 new words a day.
- **Steady state:** about 22 words, 50 sentences and 4 readings a week, plus 10 minutes of Fred's time.

**Milestones** (simulated; the runway line corrects them):

| Milestone | Expected |
|---|---|
| 135 new words | early December |
| Stage A (about 404) | late February 2027 |
| Stage B (about 734) | June 2027 |
| Stage C (about 1,070 in all) | late August 2027 |
| 2,500 words | about early 2029 at this rate |

## Decisions for Fred

Items 1-4 are the four questions. "OK" accepts the rest.

| # | Decision | Default |
|---|---|---|
| 1 | iPhone silent switch | Respect it; test both ways with Fred |
| 2 | Sentences start on blocks by themselves | No; type first, blocks one tap away |
| 3 | Home units | Credited from memory |
| 4 | Rest days (reverses `goals.js` decision 1) | 1 per 7 lessons, at most 2 |
| 5 | Sound | Verdict and closing cues; combo as sound only; tile tick off |
| 6 | After a right typed answer | Continue (Good) plus quiet *Was hard* / *Was easy* |
| 7 | Block grades | English → Mongolian Hard, Mongolian → English Good; XP typed 3, helped 2 |
| 8 | *I was right* | Hard, logged for Luna |
| 9 | XP | 1 / +1 right / +1 typed; retries 0; Done only |
| 10 | Levels and the B1 date | Off the main screens, kept in Numbers |
| 11 | Labels | Plain sentence-case English |
| 12 | Tips seen | Remembered per device |
| 13 | English deferred (principle 5) | One tap away in reading and grammar revisits; never removed |
| 14 | Checkpoints | 5 items, pass at 4 with at least 3 typed, one a day; quitting counts |
| 15 | Nothing due | Graded practice; a second practice in a day scores 0 |
| 16 | Achievements tab | Folded into Progress |
| 17 | Live before review | Words and tables from the books, flagged |
| 18 | 74 legacy sentences, 5 grammar topics | Stay live, go on the first sheets; counted as reviewed if Luna wrote the Booklet |
| 19 | Reviewers | Luna checks everything. Fallback: a cap of 4 new words a day |
| 20 | New words a day | 6 per calendar day |
| 21 | Syllabus | Beginner and Survival, then MM; *A visit* after Unit 4 |
| 22 | Connecting words | Practised as words |
| 23 | Reading | In the lesson and a tab; never changes the schedule; unlocks at 95% expected coverage |
| 24 | Public site | First names only; review timings local; recordings only with consent |
| 25 | Copyright, folk tale | Adopt; retell from a traditional telling |
| 26 | Generated drills | Answers only from reviewed tables |
| 27 | Difficulty band | Off until R5 has data |
| 28 | Recordings | After each verdict, with their own switch; Luna's voice, with her consent; no machine voice |
| 29 | Beyond the books | Decide in R5: a stage D source and a recognition-only track |

## Rule amendments (for Fred's approval)

### INSTRUMENT.md

**Principle 3** (decisions 4, 9, 10, 14). Replace it with:

> **Numbers are real, including the game.** Every figure is derived from an event that actually happened. XP is counted per first attempt: 1 for answering, 1 more if right, 1 more if typed; retries, rereads and appeals earn nothing. A unit fills as its words become familiar (stability ≥ 7 days); a home unit completes when all its words are familiar, a textbook unit when its checkpoint is passed. A streak counts finished lessons in a row; a rest day, earned every 7 lessons with at most 2 saved, covers a missed day and is drawn as rest, never as done. Badges are checkable conditions and show their progress. Nothing is earned without the work, nothing is bought, and no figure is invented to make a screen feel better.

**Principle 5** (decision 13). Add:

> A translation may be deferred, never removed. Where the English would give away what is being tested or read — a prompt until answered, a flashcard until flipped, a reading line until tapped, a grammar example on a revisit — it sits one tap away on the same screen, the tap is never penalised, and once the question is settled the pair is shown.

**SRS grade bar** (decisions 6, 8). Replace it with:

> After a typed answer the app gives the verdict and commits the grade at once. A match offers Continue (Good) and two quiet cells, Was hard and Was easy, each printing its interval; a mismatch offers Continue (Again) and *I was right* (Hard, logged for review). Intervals are whole days, exactly as `applyGrade` schedules them.

**Closed-set rule** (decision 7). Append:

> Building blocks are a closed set too: a correct build is Hard when the blocks supplied the Mongolian, Good when they supplied only the English, never Easy. Only an item's first attempt is graded; a missed item returns a few screens later one step easier and again at the end at its own step, and retries are never graded, scored or counted.

**Sound** (decision 5). A new section:

> One short cue when a question is answered — right or wrong, with a third note on every fifth unassisted first-try answer in a row — and one when the lesson closes, a held chord only when a unit, part or badge was crossed. Nothing sounds on navigation, sync, the reading text, a refused tap or over a recording; no music, loops or vibration. The level is per device; a tapped recording always plays.

**Layout, type and colour** (decisions 5, 11).

- **Lesson bar:** "the phase rail, the step count, hatched retry segments, and a way out".
- **Celebration:** "The one celebration is the session-close screen — XP, first-try answers, mistakes fixed, today's square and at most three callouts — a summary, not a fanfare."
- **Motion:** new components use only the existing motion vocabulary.
- **Type:**
  - labels are sentence-case Geologica, with uppercase mono only in Numbers and Details;
  - reading text is 22px;
  - the credit chip reads "▶ Luna".
- **Colour:** gold also covers the current-unit panel and rest squares; unit meters are blue.

**Machine-written Mongolian** (decision 17). Add:

> …and machine-spoken. Single words read off the books' lists, and rule tables, may be studied before sign-off, flagged. Personal words, sentences, passages, grammar topics, alternative orders and generated answers go live only after Luna says yes.

**Badges and components.**

- Badge names are English. The 12 approved Mongolian names stay in `goals.js`.
- New components: blocks, retry segments, rest squares, path rows, badge meters, tips, Numbers, the reader and the credit chip.

### CLAUDE.md and ROADMAP.md

- **Delete** "Interface chrome is Mongolian; telemetry labels are uppercase Latin mono".
- **Fix** «Сайн»/«Дахин» to Good/Again, and "Тохиргоо" to Settings.
- **One-grade rule.** Add these four points:
  - the grade is committed at the verdict;
  - retries never grade;
  - checkpoints, reading and today's-mistakes practice never call `applyGrade`;
  - practice grades only words not graded today.
- **State and Content schema** gain:
  - the field table;
  - the prefs key;
  - the new data files and folders;
  - `docs/CONTENT.md`.
- **Elsewhere:**
  - XP is moved by `closeQuestion()`;
  - `BADGES` become `reviewed: true`;
  - "Known limit" becomes the runway rule.
- **`goals.js` decision 1** becomes: "A streak counts finished lessons in a row; a rest day, earned every 7 lessons (at most 2 held), covers a missed day, is computed from history, and never counts as a lesson."
- **ROADMAP:**
  - §3 drops "shadowing beats dictation", because the evidence is weak; hearing several speakers is the stronger finding.
  - 2b is superseded.
  - 2c moves to Luna's first sheet.

## Versus Ling

This is against Ling's general template. No review of its Mongolian course was found.

| | Ling | This app | From |
|---|---|---|---|
| Depth | A1-A2, one template | 28 units on his textbooks toward B1; words beyond the books still need a source | R1-R3 |
| Review | historically random | spaced, graded on the first attempt | now |
| Mistakes | retried at the end of the lesson | back easier soon, then at full difficulty | R1-R2 |
| Blocks | ordering mini-game | other forms of the same word as decoys; only Luna's orders count | R2 |
| Reading | closing dialogue | passages about his home, unlocked by his memory | R2 |
| Dialogue | pick-your-reply chatbot | *Pick the reply*, *Say it to Luna* | R5; **Ling ahead until then** |
| Audio | native recordings; unreliable speech scoring | Luna's voice and listening drills | R6; **Ling ahead until then** |
| Game | points, leaderboard, fluency % | one score he can check, one path | R2-R3 |
| Native check | none known | Luna signs off | R2 |

## Risks

| Risk | Containment |
|---|---|
| A word is graded twice | Two code checks; practice skips words graded today; the retry test |
| A miss is erased, or XP is farmed | Grade committed at the verdict; checkpoints recorded at the first answer; practice and grammar score once a day |
| A decoy is also correct | Decoys excluded from accepted answers; Luna marks pools; *I was right* |
| Review lags and words run out again | Flagged words; 14-day reserve; fallback cap of 4; sheets of 30 minutes or less |
| Wrong Mongolian is taught | Legacy flags; review before new text; matcher self-test |
| Copyright or family details on a public site | No book text; the gate; first names; logs local; consent before any clip |
| Sync loses data | One batch, with rules, tests and the two-device check |
| iPhone audio quirks | Switch settled with Fred; a check each release; audio inactive until clips exist |
| Bursty pace | Planned in sessions; `?dev`; one-line rollback |

## Sources

**Textbooks:**

- Beg p2-137, 30, 54, 69-70, 105, 107-108.
- Surv p5, 7, 15, 17-98, 26-27, 77, 81, 92, 99.
- MM p6, 10-11, 65-66, 138, 155-156, 195-220, ix-x.
- Also: the Peace Corps lessons, the Booklet, and Fred's June prototype.

**Research:**

- Retry loop:
  - https://pubmed.ncbi.nlm.nih.gov/18276894/
  - https://www.yorku.ca/ncepeda/publications/PCWR2005.pdf
  - https://docs.ankiweb.net/deck-options.html
- Blocks:
  - https://gwern.net/doc/psychology/spaced-repetition/2005-koriat.pdf
  - https://pubmed.ncbi.nlm.nih.gov/17645161/
- Reading: https://www.lextutor.ca/cover/papers/schmitt_etal_2011.pdf
- Sound:
  - https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full
  - https://tecfa.unige.ch/tecfa/teaching/methodo/Moreno_Mayer00.pdf
- Streaks: https://www.colorado.edu/business/news/2023/04/20/research-streaks-marketing-tech-barasch
- Less text: https://nngroup.com/articles/progressive-disclosure/

**Competitors:**

- https://ling-app.com/blog/ling-app-review/
- https://www.langoly.com/ling-app-review/
- https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks
- https://docs.clozemaster.com/article/103-how-do-points-work
- https://blog.thelinguist.com/what-are-lingq-mini-stories-and-why-they-work/

**Platform:**

- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://bugs.webkit.org/show_bug.cgi?id=184447
- https://bugs.webkit.org/show_bug.cgi?id=237322

## Changes after review

1. **New words come earlier:** R1 session 2. A five-passage reading pilot is drafted in session 1.
2. **R1 is six numbered sessions,** each saying what Fred will notice. Dates are given at two paces, and content sessions are counted.
3. **Step 0 added:** measure real progress, ask Luna, and move the textbook text somewhere permanent.
4. **The game clean-up moves into R1,** and Start is never disabled.
5. **Four plain questions** replace the 26-item list; the rest default.
6. **Type first** is the default, which resolves the pedagogy blocker.
7. **Retries end at the original step.** *Study* counts as shown, and badges count words recovered.
8. **Loopholes closed:**
   - grades are committed at the verdict;
   - checkpoint attempts are recorded at the first answer;
   - the new-word cap counts per calendar day;
   - practice scores once a day.
9. **Review debt flagged.** Only reviewed sentences feed decoys and checkpoints.
10. **One sync batch, with a field table.** Scores are atomic, and appeals stay out of *right*.
11. **Copyright gate moved earlier** and made stricter. The folk tale gets a new source.
12. **The build checks itself in CI.** R6 gains its audio build work.
13. **One unit schema.** Home units are credited. Checkpoints need typed answers.
14. **Practice is graded.** *Practise today's mistakes* added.
15. **Reading** unlocks on expected coverage, with no English during questions and levels up to L7.
16. **Added:**
    - grammar inside lessons;
    - *Pick the reply*;
    - *Say it to Luna*;
    - *A visit*;
    - listening drills in Luna's voice.
17. **Honesty:**
    - the B1 date is stated (about 2029);
    - every section names the evidence for it;
    - projections are marked as simulated;
    - the Ling table gains a "From" column and drops its unsourced row.
18. **Smaller changes:**
    - XP on Done only;
    - the combo counts unassisted answers only;
    - the tick is off;
    - the streak counts lessons;
    - prefs live in `ui/`;
    - test lists per release.
19. **Rejected:** synced tips, and an early difficulty band.
