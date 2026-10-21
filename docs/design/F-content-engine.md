# F — Content engine: textbooks → syllabus, lexicon and packs

**The binding constraint, again.** Every other workstream (the learning loop, sound, reading, gamification, less text) needs a steady supply of new, reviewed Mongolian. Today that supply has run out. This document designs the machinery that turns Fred's four textbooks into:

- a syllabus spine of units that the gamification path can display;
- a lexicon that grows in a deliberate order;
- sentence, reading and grammar packs per unit;
- rule-generated drills that need no new writing;
- a review pipeline sized to Luna's real time;
- a copyright policy for a public repo;
- a calendar that keeps material ahead of Fred's pace.

**Page convention.** Every citation is written `printed pN [PDF M]`.

| Book | Short name | Printed page = |
|---|---|---|
| Beginner Mongolian Part 1 (Nomiin Ger) | **Beg** | PDF − 1 |
| Survival Book 023 | **Surv** | PDF − 2 |
| Modern Mongolian: A course book (Gaunt & Bayarmandakh) | **MM** | PDF − 12; front matter is roman |
| Peace Corps lessons | **PC** | PDF |

`grammar.json` already cites printed pages. `alternatives.py` cites MM by PDF index (its "p18" is printed p6 [PDF 18]); §6 normalises it.

**Simulation.** The figures in §3.2 come from `scratchpad/design/simF/supply.html` + `supply.py`. They replay the real `buildSession`/`applyGrade` headless, using the `tools/run_tests.py` harness, with a once-per-word grade guard.

---

## 1. Problem

Fred, verbatim:

1. "there is no direct learnings … sentences don't get easier if wrong"
2. "there is no reading material"
3. "the gamification is absolutely shit and too hard to follow"

The learning loop, reading and gamification workstreams answer the mechanics. Underneath all three sits the same fact: **he has nothing new to learn.**

**New words come only from `words.json`, in file order, and the file is exhausted.**

- `fresh = words.filter(w => w.drill !== false && !introduced.has(w.id)).slice(0, room)` (`src/core/scheduler.js:70-73`).
- 154 drillable words exist.
- Re-measured in this session with the real scheduler (1 in 7 graded Again):
  - new words run out on **day 33-35**;
  - by day 45 a session is **7 steps**;
  - by day 60-100 it is **2-5 steps**.
- Fred has studied daily since August (sync live since 29 Sep), so he is past this point.
- `tools/test.html:365-370` records the dry day as a fact rather than guarding against it.

**The lexicon is household-themed. The textbooks open on people, family, numbers and movement.**

- Fred's lexicon covers about 44% of the four textbooks' tokens, against 93% of his own sentences (content-fit `per_book`).
- 231 of the 300 most common words are absent (books-small, Top300).
- The textbooks' core is missing outright: ирэх, очих, гэр, ажил, хүн, багш, найз, нэр, монгол, хэл, every number above seven, and the family terms (content-fit `missing_high_freq`).
- No textbook passage is readable today. The best is 77.8% known (content-fit `readable_now`).

**One sentence per word leaves the i+1 selector no choice.**

- 164 sentences over 154 drillable words (ROADMAP 2b).
- All 164 come from the Booklet answer key (books-small).
- They cannot be chained into paragraphs: no connectives exist in the lexicon (content-fit `existing_corpus_paragraphs`).

**The pipeline is hand-made and fragile.**

- New entries are hard-coded Python lists (`tools/extend-lexicon.py:29-112`).
- Review results are keyed by the Mongolian text (`tools/review-sheet.py:402-405`), which breaks when Luna rewrites a sentence.
- `alternatives.py` cites the wrong authors in its docstring (`tools/alternatives.py:7-8`, "Sanders & Bat-Ireedui"; the book is Gaunt & Bayarmandakh) and uses PDF indices as page numbers (`:52-56`).

**The matcher mis-tags long vowels, and more lexicon makes it worse.**

- `stem_match()` applies the fleeting-vowel rule to long vowels (`tools/coverage.py:88-91`): дэр↔дээр, тос↔тоос, хол↔хоол.
- That mis-schedules «Дэр…» and «Тос…» today (content-fit `method_notes`).
- Measured in this session, three more collisions arrive with the new words:
  - хэл + -ний would tag as хэлэх;
  - хүн would tag as хүү + -н;
  - зах (market) would tag as за + -х.

---

## 2. What Fred will experience

The content engine is mostly invisible. Its job is that the screens other workstreams design are never empty. Five things change on screen. One routine changes in Fred's week as the owner of the content.

### 2.1 The first week: new words again

The first build session (§7, F0-F2) releases units 1 and 2: 58 new drillable words.

- **The next lesson** starts with the new-word deck again, as it did in his first month.
- **The deck shows 6 words a day** (`dailyNewCap`, unchanged): «нэр», «багш», «найз», «хоёр», «бас», «харин»…
- **Sessions grow** from about 5 steps to about 20 within a week (simulation, §3.2).
- **Sentences come back** about a week later, once Luna has checked them. In that week the words travel as cards; by their second or third review they appear inside sentences, where the i+1 selector wants them.
- **Reading** (workstream C) can open its first pack the same week. The 11 glue words it needs (бас, харин, дараа нь …) sit at the head of unit 1.

### 2.2 The unit card: once per unit, in the lesson

When a lesson's deck contains the first word of a unit he has not started, one card comes before the deck.

```
UNIT 3 · NEW                         mono label        3
Numbers, age and time                title             4
Та хэдэн настай вэ?                  content (mn)      –
How old are you?                     content pair      4 (shown per Reading's D3 gloss rule)
35 new words · 5 readings            mono              5
[ Start ]                            primary           1
```

- **Chrome budget:** 13 words, plus one content pair. No paragraph and no grammar.
- **"35 new words"** is the count of that unit's drillable words in `words.json`. Units are released whole, so it never grows behind his back.
- **"· 5 readings"** counts only released readings, and is omitted when there are none.
- **When it shows** is derived from FSRS state: the session's `fresh` holds a word of unit U, and no word of U is in `p.introduced`. Nothing new is stored. If two units start in one session, only the first gets a card.
- **The completion moment** belongs to Gamification, which may fold this card into its path screen (D11).

### 2.3 Inside lessons: nothing new to learn about the screens

New words, sentences and readings use the screens the other workstreams design. The visible differences are content, not chrome:

- **Sentences are longer as units progress**: 3-6 tokens in stage A, 4-9 in stage B, 6-12 in stage C.
- **More of them are questions and answers.**
- **Each new word turns up in at least two different sentences** within its first month (§3.2).

### 2.4 Generated practice: new topics in the Grammar tab

Four topics appear in the Grammar list with unit 3, one with unit 4, one with unit 8 and one with unit 25. They use the existing grammar drill screens (choice and typed), and their right/wrong tally uses the existing `P.grammar[topicId]`.

| Row title (chrome) | Unit | Example prompt | Example answer (content) |
|---|---|---|---|
| Numbers | U3 | `47` | дөчин долоо |
| Numbers before a noun | U3 | `35 minutes` | гучин таван минут |
| What time is it? | U3 | `4:30` | дөрөв хагас (also accepted: дөрөв гуч) |
| Days of the week | U3 | Day after · «Мягмар» | Лхагва |
| Family puzzles | U4 | «Миний ээжийн аав миний хэн бэ?» | the reviewed answer set (§3.9) |
| Prices | U8 | `2,500₮` | хоёр мянга таван зуун төгрөг |
| Dates | U25 | `12 Oct 2026` | year → month → day order, from the reviewed table |

The time answers above follow MM printed p65-66 [PDF 77-78] and Surv p32 [PDF 34]. The number-before-noun form follows the linking -н rule, Surv p26 [PDF 28].

A drill screen carries the lesson bar (`NUMBERS · 3 / 8`), the prompt and four options or a field. That is **at most 6 chrome words**, inside Less-text's grammar-drill budget of 15-20.

- **Distractors differ in value** (47 → 49, 74, 37), never in form. A different form might be an accepted variant.
- **The one exception** is the "before a noun" topic. There the contrast *is* the lesson, and both forms come from the reviewed table.

Each pass draws 8 items, seeded by the day, so a replay is not memorised. XP for these follows Gamification's anti-replay rule: the first pass per topic per day counts.

### 2.5 Progress → Numbers: one runway line

Inside Less-text's "Numbers" disclosure on Progress, one line is added:

```
NEW WORDS READY   47 · about 15 days
```

- **The count** is drillable words in `words.json` that are not yet introduced.
- **"about N days"** is shown only when the measured intake over the last 14 days is at least 1 word/day. At the ceiling it shows the count alone. With no history it shows "not measured yet" (INSTRUMENT, Copy).
- **Budget:** 7 words.
- **Lessons never show it.** No "running low" banner.
- **It is the trigger** for Fred's weekly routine below.

### 2.6 Fred as content owner: one short weekly routine

On Mondays (any day works):

1. Fred glances at **NEW WORDS READY**. If it reads under about 14 days, he opens Claude Code in the repo and types `/next-unit` (a project skill, §6).
2. Claude, in one session:
   - drafts the next unit into `content/units/Uxx/`;
   - runs every gate: coverage, the authoring rule, overlap with the books, alternatives, tiles;
   - releases that unit's words (§3.10);
   - writes review sheets of one sitting each, with time estimates, for example `tools/review-U05-sentences.html (≈ 18 min)` and `tools/review-U05-words.html (≈ 14 min)`.
3. Fred sends each sheet. When the files come back, he drops them in `content/reviews/` and types `/next-unit apply`.
4. Claude applies them, releases the reviewed sentences and readings, runs the tests, and commits and pushes (per his standing preference).

**Fred's own time:** about 10 minutes a week, plus forwarding two files. The English checks for reading questions (workstream C) fold into the same session.

### 2.7 Luna: smaller, scoped sheets

The sheets are the same self-contained file she knows (double-click, Зөв / Буруу / Мэдэхгүй, «Дуусгах» downloads a file), with three differences:

- **Each sheet holds one kind of item:** sentences and readings, or words, grammar and tables (§3.11).
- **Each is sized to one sitting:** the top says *"about 15 minutes"*, computed from her own measured pace last time.
- **Sentences that share a pattern are grouped** ("These 5 share one pattern — tick any that sound wrong"), which roughly halves the reading time.

### 2.8 Word budgets (content-engine surfaces only)

| Surface | Chrome words | Notes |
|---|---|---|
| Unit card | 13 + content pair | Once per unit, about every 9 days |
| Generated drill | ≤ 6 | Inside the grammar-drill screen |
| Grammar list rows | 1-4 per new row | e.g. "Numbers before a noun" |
| Progress runway line | 7 | Inside the Numbers disclosure |
| Lessons, Today | 0 | Unchanged |

---

## 3. Mechanics

### 3.1 The syllabus spine

**The ordering rule** has three parts.

1. **Beginner Part 1 is the spine of stage A.** Its 10 lessons are each titled by a question Fred can answer by the end, which makes a path that is easy to follow (books-beg `best_assets`, point 4). Its grammar order is the textbooks' consensus: particles → possessives → -тай → commands → -ж байна → байна/байгаа/байдаг + dative → past → future → adjectives → -х + adjective → genitive (books-beg `grammar_sequence`).
2. **Survival's can-do lessons are interleaved** where Beginner is thin: where-from and languages, numbers and time, food and shopping, weather, ability (books-surv `structure`).
3. **Modern Mongolian deepens stage B (A2) and carries stage C (B1)**, chapter by chapter in its own grammar order (books-mm1, books-mm2 `grammar_sequence`).

The units Fred has already finished (the Booklet's household world) become **H1-H3** at the head of the path.

- **Why a spine, not a frequency list:** the rest of the system needs units. Gamification needs a path with nearby finish lines: proximal goals (Bandura & Schunk) and the goal gradient (research-science 5; research-competitors, Duolingo's move to one path). Readings and grammar topics need a grammar band. Luna's review is easier against a known lesson.
- **Frequency still orders words inside each unit**, and decides which words a unit pulls forward (§3.3).

| Unit | Title (chrome) | Unit question (content) | Sources: printed [PDF] | Grammar point | New drillable words | Generated |
|---|---|---|---|---|---|---|
| H1 | Home: rooms and things | – | Booklet days 1-5 | (done) | 0 (existing 90-120, 231-235) | |
| H2 | Home: chores and food | – | Booklet days 5-10 | (done) | 0 (existing 121-159, 245-250) | |
| H3 | Home: cat, books, garden | – | Booklet days 11-16 | (done) | 0 (rest of existing) | |
| U1 | Who, what and whose | «Энэ юу вэ?» | Beg p2-10 [3-11]; Surv p9-17 [11-19]; MM p11 [23] | бэ/вэ, уу/үү/юу/юү; Тийм/Үгүй … биш; possessives | 37 (11 glue words first) | |
| U2 | Where are you from? | «Та хаанаас ирсэн бэ?» | Surv p18-25 [20-27]; PC p6-7 | ablative -аас + ирсэн; мэдэх; habitual question; харин | 21 | |
| U3 | Numbers, age and time | «Та хэдэн настай вэ?» | Surv p26-38 [28-40]; MM p48-49 [60-61], p63-66 [75-78] | linking -н; хэдэн настай; telling the time; weekdays | 35 | numbers, time, weekdays |
| U4 | Family | «Чи гэрлэсэн үү?» | Beg p11-21 [12-22]; Surv p75-81 [77-83] | -тай/-тэй/-той, -гүй; гэрлэсэн | 20 | family puzzles |
| U5 | Getting around | «Та хаашаа явах вэ?» | Beg p22-33 [23-34]; Surv p39-46 [41-48] | polite -аарай; битгий; voluntative | 22 | |
| U6 | What are you doing? | «Чи юу хийж байна?» | Beg p34-47 [35-48] | -ж/-ч байна, -аагүй байна; question words | ≈28 | |
| U7 | Where are you? | «Чи хаана байна?» | Beg p48-63 [49-64] | байна/байгаа/байдаг; dative -д/-т; надад/чамд | ≈28 | |
| U8 | Food, likes and shopping | «Чи юунд дуртай вэ?» | Surv p47-66 [49-68]; PC p8, p12 | -нд дуртай/дургүй; авъя; measure words; -ооч | ≈32 | prices |
| U9 | Yesterday | «Чи өчигдөр юу хийсэн бэ?» | Beg p64-81 [65-82]; Surv p94-98 [96-100] | past -сан⁴, -аагүй; past time words; тэгээд | ≈28 | |
| U10 | Plans | «Та маргааш юу хийх вэ?» | Beg p82-100 [83-101] | future -на⁴, -хгүй; -х уу/вэ | ≈28 | |
| U11 | Describing things | «Миний хичээл хэцүү» | Beg p101-110 [102-111]; MM p6 [18] | adjective before vs after the noun; биш; -тай/-гүй adjectives; шиг | ≈28 | |
| U12 | Clothes, colours, the body | «Чи ямар өнгөнд дуртай вэ?» | Surv p67-74 [69-76]; Beg p17-18 [18-19] | -тай for wearing; ямар өнгөтэй | ≈25 | |
| U13 | Weather and seasons | «Гадаа ямар байна вэ?» | Surv p82-89 [84-91] | weather -тай; байсан/байна/байх; хэрэгтэй; яагаад гэвэл | ≈24 | |
| U14 | Can, may, easy, hard | «Монгол хэл сурах гоё» | Beg p111-120 [112-121]; Surv p90-93 [92-95] | -х + adjective; -ж чадна / -ж болно | ≈24 | |
| U15 | Whose and of what | «Энэ хэний дэвтэр вэ?» | Beg p121-137 [122-138] | genitive; postpositions with the genitive | ≈24 | |
| U16 | Life on the steppe | «Тэр юу хийж байна вэ?» | MM p1-20 [13-32] | accusative; n-stems; genitive revisited | ≈30 | |
| U17 | Visiting family | – | MM p21-31 [33-43] | dative uses; past -в; -ж with чадах/болох; reflexive | ≈35 | |
| U18 | A day's routine | – | MM p32-41 [44-53] | habitual -даг; ablative "than"; plurals; та/чи | ≈35 | |
| U19 | What happened | – | MM p43-53 [55-65] | -сан continuity; -даг байсан; comitative uses; нь | ≈35 | |
| U20 | On the phone, in town | – | MM p55-71 [67-83] | instrumental; postpositions; -хад 'when'; motion verbs | ≈40 | time with minutes |
| U21 | Sending and asking | – | MM p72-83 [84-95] | case tables; causative; ч, л | ≈40 | |
| U22 | Invitations | – | MM p84-92 [96-104] | voluntative; -лаа; -аад/тэгээд; "but" | ≈35 | |
| U23 | Why and in order to | – | MM p94-105 [106-117] | руу; гэх; purpose -хаар; because | ≈40 | |
| U24 | At Luna's parents' | – | MM p107-116 [119-128] | conditional -вал; бол; бий/мөн/юм; магадгүй; honorifics | ≈40 | |
| U25 | Dates and needs | – | MM p118-132 [130-144] | -тал; дуртай vs хэрэгтэй; -уулаа; ordinals; dates | ≈45 | dates |
| U26 | Wanting, before and after | – | MM p133-146 [145-158] | passive; relative clauses; before/after; 7 ways to want | ≈45 | |
| U27 | Comparing | – | MM p147-158 [159-170] | -лц-; comparative and superlative; emphatic particles | ≈45 | |
| U28 | Directions and amounts | – | MM p160-177 [172-189] | -лд-; positions and directions; "all"; -хан/-втар | ≈45 | |

**Unit questions.** The Mongolian unit question is content and is reviewed with the unit. The stage B and C questions are written when those units are drafted.

**Unit sizes.**

- Stage A (U1-U15) ≈ **404** new drillable words.
- Stage B (U16-U24) ≈ **330**.
- Stage C (U25-U28) ≈ **180**.
- Total ≈ **914**, so about **1,070** drillable words with Home.
- The textbooks reach this far and no further. The B1 estimate of 2,500 needs a stage D beyond the books (D14). The app must say so rather than imply the path reaches B1 vocabulary.

**The folk tale.** Stage C retells MM's serialised folk tale (printed 118-172 [PDF 130-184]) as original A2 episodes, one per stage C unit. It is retold from the plot, never translated (§3.12, D9).

### 3.2 How much content, how fast: the numbers that keep the ceiling away

**Method.** The real scheduler ran over the real corpus for 40 days (Fred at the ceiling). Then synthetic units were released on a schedule for 26 weeks:

- each synthetic sentence holds 1-2 unit words, 2-3 support words from released vocabulary and one closed-class word, as §3.6 requires;
- grading: 1 in 7 Again (realistic) or none (perfect);
- one grade per word per session.

**Natural intake, with unlimited supply, `dailyNewCap` 6:**

| Weeks after release | New words / week | Due / day | Steps / day | i+1 share |
|---|---|---|---|---|
| 1 | 32 | 12 | 20 | 0.85 |
| 2 | 29 | 14 | 22 | 0.87 |
| 3-16 | 22-24 | 18-20 | 24-26 | 0.86-0.97 |
| 17-26 | 18-20 | 21-23 | 26-27 | 0.77-0.93 |
| Average | **21.7** | | | |

- With perfect grading the average is **28.5/week**.
- With `dailyNewCap` 4 it is **14.6/week**, at 16-19 steps a day.
- The back-off `room = cap − ⌊due/6⌋` (`scheduler.js:69`) is what lowers intake as reviews accumulate.

**Sentences per new word (K), weekly units of 35:**

| K | i+1 share (wk 3-26) | Distinct contexts per word, first 4+ weeks | Words never met in a sentence |
|---|---|---|---|
| 1 | 0.47-0.66 | 1.66 | 34 of 496 |
| **2** | **0.73-0.93** | **1.91** | 27 of 496 |
| 3 | 0.86-1.00 | 2.21 | 12 of 496 |

**Release timing (30 words per unit, K = 2):**

| Rule | Effect |
|---|---|
| Release 1 unit ahead | i+1 share in week 1 is **0.45**: support words are still unknown |
| Release **2 units ahead** | i+1 share in week 1 is **0.84**; no day without new words |
| 25 words/week, 1 ahead | 2 days without new words in the first fortnight |
| Sentences **7 days** after their words | Week 1 has no sentences for the new words (cards only); contexts per word 1.91 vs 1.99; recovers from week 2 |
| Sentences **14 days** after their words | i+1 share ≤ 0.04 for 4 weeks; contexts 1.81. **Too slow.** |

**The quantities that follow** (at `dailyNewCap` 6 and realistic grading):

| | Per unit (stage A median) | Per week, weeks 1-2 (catch-up) | Per week, steady state |
|---|---|---|---|
| New drillable words | 28 (20-37) | ≈ 30 | **≈ 22** (≈ 19 after month 4) |
| New sentences (K = 2, +15% recycling) | ≈ 64 | ≈ 70 | **≈ 50** |
| Readings (§3.7) | 5 | – (Reading's home-1 pack covers it) | **≈ 4** |
| Grammar topics | 1 | 1 | **≈ 0.8** |
| Generated topics | 0-3 (U3, U4, U8, U25) | – | – |
| Native review time | ≈ 45 min | ≈ 50 min | **≈ 30-40 min** |

**The buffer rule** never lets the ceiling return.

- At every release, **released-but-not-introduced drillable words ≥ 14 days of measured intake**. That is about 45 words at steady state, roughly two units.
- **A unit's sentences go live ≤ 7 days after its words.**
- **A unit's readings go live by the time half its words are introduced.** Reading's own coverage gate decides when they unlock.
- `tools/syllabus.py --status` checks all three from a backup code. The in-app runway line (§2.5) shows the first.

**Limits of the simulation.**

- Its sentences are synthetic and its grading is a fixed pattern.
- It ignores the learning loop's Hard grade for tile builds, which shortens intervals and lowers intake a little.
- The runway line measures the real rate, so the calendar corrects itself.

### 3.3 Lexicon expansion order: the first 140 entries and why

**Ordering rules**, applied in this order:

1. **Unit order** (§3.1). The deck introduces in `words.json` order (`scheduler.js:70-73`), and `tools/release.py` appends each unit in its intro order. File order *is* the syllabus, so the scheduler needs no change.
2. **Inside a unit, frequency across the four textbooks** (content-fit `missing_high_freq`, and the stem-hit counts measured in this session), with the unit's can-do words kept together.
3. **Glue words first.** The 11 entries Reading's first pack needs (C-reading §5.5) open unit 1. Connectives unlock connected text, and every paragraph needs them (content-fit `existing_corpus_paragraphs`).
4. **Frequency pull-forward.** A lemma with ≥ 40 textbook hits that fits an earlier unit's theme moves into that unit, even if its book teaches it later. For example, өчигдөр and маргааш move to U3, the time unit.
5. **A personal strand.** Words Fred needs that no book lists (his country, his in-laws) join the unit they belong to, flagged `personal: true` (D5).
6. **Never a word the matcher cannot place safely.** Two-letter lemmas and particles get `forms` or `infl: "none"` (§3.4, §3.5).

**What these 140 entries buy** (measured):

- They contain **73 of the 150 most frequent missing textbook lemmas**, including 59 of the top 100.
- The other 41 of the top 100 arrive in U6-U10, inside the first ~270 new words.
- Content-fit's unlock curve: adding the top 100-150 missing lemmas lifts textbook token coverage from 45% to **78-83%**, and the passages at ≥ 90% known from 0 to **35-52 of 137**. The same frequency band is what turns Fred's own books into something he can read (§6, `--books`).

Below, **hits** = stem-matched occurrences across Beg, Surv, MM, PC and Top300, from `simF/batches.py`. `[g]` = `drill:false`. `*` = personal or unattested, needing Luna's spelling.

**U1: Who, what and whose (37 drillable + 5 grammar).** Intro order is the order listed.

| Group | Entries (gloss · hits) |
|---|---|
| Glue (Reading's first pack) | хоёр two; X Y хоёр "X and Y" ·138 · бас also ·68 · харин but, whereas ·85 · дараа нь then (phrase) ·16 · их very; big ·156 · хүйтэн cold ·38 · гэр home; ger ·220 · миний my ·214 · монгол Mongolian ·255 · хэл language ·206 · сурах to learn ·78 |
| People and identity | нэр name ·100 · хүн person ·185 · багш teacher ·158 · оюутан student ·99 · найз friend ·128 · тэд they ·108 |
| Possessives and questions | таны your (polite) ·113 · чиний your ·64 · түүний his/her ·123 · танай your (home/family) ·62 · хэний whose ·45 · ямар what kind of ·221 |
| Yes, no, not | тийм yes; such ·74 · үгүй no ·62 · биш not ·44 |
| Classroom things | анги class ·49 · харандаа pencil ·44 · бал pen ·34 · дэвтэр notebook ·31 · цүнх bag ·34 · утас phone ·63 · цаас paper ·53 |
| Courtesy | баярлалаа thank you ·10 · баяртай goodbye ·26 · уучлаарай sorry ·5 · за OK, well ·79 |
| [g] matcher entries | үү ·185 and юү ·57 (yes/no particle, front-vowel forms of уу) · байх ·1,291 (copula forms байсан/байгаа/байдаг) · нь ·221 (his/her/its; topic) · нар ·271 (plural for people) |

**U2: Where are you from? (21)**

ирэх to come ·263 · очих to go (to a place) ·194 · хаашаа where to ·38 · улс country ·29 · англи English ·78 · америк American ·25 · орос Russian ·40 · хятад Chinese ·21 · голланд* Dutch; the Netherlands ·0 · гадаад foreign ·10 · мэдэх to know ·88 · ойлгох to understand ·17 · жаахан a little ·23 · гэх to say; to be called ·222 · ажил work ·176 · ажиллах to work ·47 · эмч doctor ·22 · жолооч driver ·15 · сургууль school ·84 · их сургууль university ·17 · хот city ·48

Moved out of U2 for low frequency: япон, солонгос, герман, тогооч. They become optional extras in U2's sentence pack, not lexicon.

**U3: Numbers, age and time (35)**

| Group | Entries |
|---|---|
| Numbers | нэг ·168 · гурав ·71 · дөрөв ·66 · тав ·104 · зургаа ·45 · найм ·50 · ес ·47 · арав ·120 · хорь · гуч · дөч · тавь · жар · дал · ная · ер (tens, 10-28 each) · зуу ·134 · мянга ·72 · сая million; just now ·40 |
| Age and time | нас age ·47 · хэд how many ·142 · дугаар number ·15 · минут ·7 · хагас half ·41 · дутуу to (the hour) ·17 |
| Days, weeks, months | даваа · мягмар · лхагва · пүрэв · баасан (MM's weekday names; Fred's lexicon already has бямба, ням) · долоо хоног week ·31 · сар month ·155 · жил year ·46 |
| Pulled forward | өчигдөр yesterday ·67 · маргааш tomorrow ·64 |

долоо (7) already exists (id 243).

**U4: Family (20)**

ах older brother ·91 · эгч older sister ·45 · дүү younger sibling ·90 · эхнэр wife ·15 · нөхөр husband ·15 · хүү son ·263 · охин daughter ·52 · өвөө grandfather ·21 · эмээ grandmother ·24 · гэр бүл family ·18 · гэрлэх to marry ·5 · хадам* in-law ·0 · ач* grandchild ·0 · үеэл cousin ·2 · нохой dog ·59 · хичээл lesson ·139 · мөнгө money ·91 · машин car ·82 · зав free time ·38 · олон many ·78

**U5: Getting around (22)**

асуух to ask ·25 · хүлээх to wait ·35 · уулзах to meet ·87 · амрах to rest ·45 · хэлэх to say ·213 · үзэх to watch ·159 · орох to enter ·82 · гарах to go out ·102 · суух to sit; to live ·69 · босох to get up ·52 · зогсох to stop ·27 · эргэх to turn ·16 · буцах to go back ·25 · зүүн left ·17 · баруун right ·20 · чигээрээ straight on ·9 · битгий don't ·48 · такси ·4 · удаан slow; long ·32 · болох to become; may ·212 · автобус ·51 · зам road ·14

**Total:** 135 drillable + 5 `drill:false`. At about 22 a week, that is about **6 weeks** of new words.

**Collision checks.** хэлэх (213 hits) and хүү (263) are inflated by the collisions §3.5 removes. Their ordering is unaffected: both are in the top 100 on content-fit's stricter clustering.

**Units 6-28** are drafted the same way when their turn comes. Each list is drafted from:

- the unit lesson's vocabulary page (books-beg / books-surv / books-mm `vocab_lists`);
- MM's English-Mongolian glossary, printed 195-220 [PDF 207-232], the clean machine-readable source (books-mm2);
- the remaining top-150 lemmas (content-fit).

Glosses are read off those glossaries and the lesson lists, never recalled. `src` records the page.

### 3.4 Lexicon entry rules

**Drillable or not**, for new entries (D4; aligned with Reading's D9). An entry is **drillable** whenever a card could test it with an English meaning: connectives (бас, харин), possessive pronouns (миний, таны), question words (ямар, хэний), interjections (за).

`drill:false` is reserved for three kinds of entry:

- particles with no standalone meaning (үү, юү);
- copula forms (байх);
- grammatical markers (нь, нар).

**Why:** a `drill:false` word counts as known from day one (`scheduler.js:50-52`). Giving that status to миний would overstate every coverage figure: comprehensibility, reading readiness and the path. Existing `drill:false` entries with meanings (би, чи, энэ, хаана, хэн, юу, одоо…) are not flipped, because Fred knows them. Flipping them would drop 20+ cards into his queue for nothing.

**Phrase entries** (дараа нь, их сургууль, долоо хоног, гэр бүл) follow the existing phrase-first matcher (`coverage.py:134-158`). A single word that is also part of a phrase (машин next to угаалгын машин) is allowed only when it is a real, separate sense ("car"). The release tool lists it for Luna.

**New fields on an entry** (§4):

| Field | Meaning |
|---|---|
| `unit` | e.g. `"U03"`; existing entries get H1-H3 |
| `src` | e.g. `"Surv p27 [PDF 29]"` |
| `forms` | attested irregular forms the matcher accepts exactly, e.g. хорь → ["хорин"], хүн → ["хүмүүс"] |
| `infl: "none"` | particles and interjections never stem-match |
| `personal` | Fred-specific words, e.g. голланд, хадам |
| `reviewedBy` | `"luna"`, set by `--apply` |

**Ids are never reused.**

- `content/ids.json` holds the highest id ever issued. `release.py` issues from it.
- A word Luna rejects outright is **deleted** from `words.json`. The scheduler already drops items whose word has left (`scheduler.js:57-62`, `progress.js:204-210`).
- A wrong spelling or gloss is **corrected in place**. The id and the FSRS state stay, because the concept is the same.

**Extraction hygiene.** Every `mn` must match `^[а-яёөү ]+$` (lowercase Cyrillic and spaces; proper nouns are not lexicon). That blocks the books' extraction defects from entering the lexicon: Latin look-alikes ("op" for ор), Ү read as У, and comma-to-д artefacts (books-mm1/mm2 `extraction_quality`).

### 3.5 Matcher hardening: the prerequisite for any growth

`coverage.py` decides every sentence's `ids`. Those decide comprehensibility, i+1 and grading targets, so a mis-tag teaches the wrong word. Seven changes land before the first new entry.

1. **An exact headword match wins outright** over any stem match. This fixes хүн → хүү + -н.
2. **The fleeting-vowel rule never fires on a long vowel or diphthong.** The guard is `s[-3] not in VOWELS` in the fleeting branch (content-fit `method_notes`). This fixes дээр/дэр, тоос/тос and хоол/хол.
3. **Verb lemmas** (-х, gloss starting "to ") take only verb endings. **Nominal lemmas** take only nominal endings. `SUFFIXES` splits into `NOUN_SUFFIXES` and `VERB_SUFFIXES`. This fixes хэлний → хэлэх, and is the rule content-fit's stricter clustering used.
4. **Candidates are ranked by the length of the matched stem**, then exact > fleeting > final-vowel drop, then headword length. The longest-headword tie-break (`coverage.py:159-163`) is kept only as the last key.
5. **Lemmas of two letters or fewer, and every `infl:"none"` entry, match only exactly or through `forms`.**
   - This fixes зах → за, ачаа → ач and ердөө → ер.
   - The existing үг gets `forms` for the forms its sentences use.
   - The 2-letter floor comment at `coverage.py:94-97` is updated.
6. **`SUFFIXES` grows with each unit's grammar**, each addition carrying its page. Sources: MM's Index of inflexions, printed 178-180 [PDF 190-192], plus the unit's lesson. Examples:
   - -гаа⁴ (байгаа), Reading's prerequisite;
   - negative past -аагүй⁴ (U9);
   - conditional -вал⁴ (U24).
7. **A gold self-test.** `tools/matcher-gold.tsv` holds about 120 `token → id` rows, including every collision named above and in content-fit. `py tools/coverage.py --selftest` must pass. It runs in CI (it is stdlib only and needs no books).

**Retag diff.** After the change, `--apply-tags` re-tags the existing 164 sentences. The tool prints each changed sentence. Content-fit predicts #9, #13, #29, #98, #103, #106 and #116. Fred approves the diff in the same session.

### 3.6 Sentence packs per unit

**Authoring constraints.** `release.py` enforces each of these, and `tools/test.html` re-checks them.

1. **Every token resolves** (no `partial`).
2. **Every id belongs to a released unit ≤ this unit** (Home counts). Never a word from a later unit.
3. **1-2 ids from this unit:** 70% carry one, 30% carry two. That is the shape the simulation used, and it gives the i+1 selector exactly one weak element once the other is learned.
4. **At least K = 2 sentences per new drillable word** (§3.2), **plus 15% recycling sentences** that teach a word from the previous two units in a new context. Home words get new contexts for free as support words.
5. **Length ladder:**
   - stage A: 3-6 tokens, median 4;
   - stage B: 4-9, median 6;
   - stage C: 6-12, median 8.
   - Any sentence of 8+ tokens carries `parts` (its two simple source sentences) for the learning loop's deferred SPLIT rung. The model is the relative-clause breakdown at MM printed p138 [PDF 150].
6. **Never permute word order to make a sentence or an alternative** (CLAUDE.md, MM p6 [PDF 18]). Word-order minimal pairs are written as two canonical sentences with two meanings.
7. **Original text only** (§3.12): no 5-token run shared with any book.
8. **Prefer constructions Luna has already reviewed.** For example, her rewrite «эмнэлэгрүү авч яв» is reused over a new phrasing.

**Formats.** Each format follows a book's exercise type; the items themselves are new.

| Share | Format | Modelled on | What it gives the other workstreams |
|---|---|---|---|
| 35% | Statement / negative / question **triplets** | the lesson openers in Beg p2, 11, 23, 48, 65, 83, 121 [PDF 3, 12, 24, 49, 66, 84, 122] | transformation material for the retry ladder (learning loop) |
| 25% | **Question → answer pairs** linked by `pair` | "make the question for this answer", Surv p10, 20, 25, 53-54, 61-62, 84, 96, 99 [PDF 12, 22, 27, 55-56, 63-64, 86, 98, 101]; MM's echo answers p33 [PDF 45] | dialogue lines; reading questions |
| 20% | **Frame + cue substitution** (one `frame` id over 3-6 sentences) | Surv p14-15, 19, 50, 52, 91 [PDF 16-17, 21, 52, 54, 93] | grouped review (§3.11); tile distractors among siblings |
| 10% | **Contrast** with харин / бас | Surv p50 [PDF 52]; Beg p59 [PDF 60] | connective practice |
| 5% | **"About me"** sentences (Fred's real answers) | MM "answer as it applies to you", printed 30, 40, 52, 70, 91, 103-104, 115-116 [PDF 42, 52, 64, 82, 103, 115-116, 127-128] | personal strand; a high-value review item |
| 5% (stage B-C only) | **Combining** two sentences with a converb or connector, carrying `parts` | MM p90-91, 102-103 [PDF 102-103, 114-115]; key p239-240 [PDF 251-252] | SPLIT rung; B1 complex sentences |

**Accepted answers.**

- `alternatives.py` stays the only writer of `alt` and `altReviewed` (CLAUDE.md).
- It gains a per-unit hand table: `content/units/Uxx/alt.json`, keyed by `sid`. Claude writes 1-3 English paraphrases there per sentence when drafting. The Mongolian alternatives come from the rule set and go to review as today.
- Tile pools come from the learning loop's `tools/tiles.py`, run by `release.py`, and are reviewed on Luna's sheet.

**Stable ids.**

- Every sentence gets `sid` (`s0001…`).
- The existing 164 are backfilled in file order, once.
- Review, alternatives, tiles and audio key on it from then on. Today they key on the text, which a rewrite orphans (`review-sheet.py:402-405`; `alternatives.py:226-227`).

### 3.7 Readings per unit: what the content engine supplies to Reading

Reading owns the reader, `readings.json`, its gates and its first pack (`home-1`, 18 passages inside the current lexicon). From U1 on, the content engine supplies **5 passages per unit**, with `pack` = unit id:

1. **A unit passage** in the format of the unit's reading page. Examples:
   - U1: Surv p17 [PDF 19];
   - U4: Beg p18 [PDF 19];
   - U8: Surv p55 [PDF 57];
   - U9: Beg p76-78 [PDF 77-79];
   - U13: Surv p88 [PDF 90].
2. **A dialogue** in the format of the unit's dialogue page. Examples: U5 Beg p23 [PDF 24]; U10 Beg p83 [PDF 84].
3. **A retell** of passage 1 in another person or tense (LingQ's three-part form, research-competitors).
4. **A cast story**: Fred, Luna, the cat, Luna's parents (C-reading §5.1), using the unit's words at home. This is the personal strand, and nothing in Ling can match it.
5. **A message or letter**, or a Q&A text, in the letter format of Surv p25 [PDF 27].

**Levels.**

- Stage A: Reading's levels L1-L3.
- Stage B: L3-L4.
- Stage C: an L5 of 80-120 tokens that Reading may add. The stage C folk-tale episodes are L5.

**Coverage.** Every passage is authored at ≥ 98% projected coverage, at most 3 unknown words (C-reading §3.2), and only from released units. That is Hu & Nation's band (research-science 3a).

**Supply against consumption.**

- Supply: 5 per unit ≈ **4 per week**.
- Consumption: one passage a day at most in lessons (C-reading §3.4).
- Reading's trigger (`UNREAD READY + LOCKED < 6`) and this buffer rule are checked by the same `--status` run.

### 3.8 Grammar topics per unit

One `grammar.json` topic per unit, in the existing format: summary, 4 examples, 5 drills, `sourceCite` in printed pages. Each carries `unit`.

The 5 existing topics map onto the spine:

| Topic | Unit |
|---|---|
| g_qparticle | U1 |
| g_tai | U4 |
| g_byna | U7 |
| g_accusative | U16 |
| g_habitual | U18 |

All five are still `reviewed:false`; they go on Luna's first sheet. About 23 new topics follow the grammar column of §3.1. Each topic's examples obey §3.6: original text, overlap-checked.

### 3.9 Generated drills: unlimited practice with no new writing

The generators turn **reviewed rule tables** into drills. They never inflect anything themselves.

- **Every Mongolian string a generator outputs is either a table entry or table entries joined by spaces.** Every case form a drill needs (an hour in the dative, a kin term in the genitive) is a **row in the table**, reviewed once.
- The risk ROADMAP 4 names, vowel harmony producing wrong forms, therefore never reaches Fred.

| Generator | Table (`src/data/gen.json`) | Rule source | Items |
|---|---|---|---|
| `numbers` | units 1-9, tens, 100/1,000/1,000,000; each `[independent, attributive]` | Surv p26-27 [PDF 28-29]: linking -н, except 1, 2, numbers ending in 2, and million; thousand before a number vs before a noun. MM p48 [PDF 60], p63-64 [PDF 75-76] | digits ↔ words, 1-9,999; "before a noun" pairs |
| `time` | hour words; хагас; минут; later the 12 dative hour forms | MM p65-66 [PDF 77-78]; Surv p32 [PDF 34] | `H M`, `H хагас`, `H гуч` (both accepted for :30); "N to H" only after the dative rows are reviewed |
| `weekdays`, `months` | MM's weekday names (and the numbered system as accepted alternatives, D10); months in ordinal form | Surv p35-36 [PDF 37-38]; MM p124-128 [PDF 136-140] | day before/after; month order |
| `kin` | kin terms; their genitive forms; relation paths with **answer sets** | Surv p81 [PDF 83]; Beg p127 [PDF 128] | «Миний X-ийн Y миний хэн бэ?», depth ≤ 2, plus Fred's own in-law questions |
| `prices` | `numbers` + төгрөг | Surv p53-55 [PDF 55-57]; PC p12 | figure ↔ words |
| `dates` (U25) | year → month → day patterns with the genitive rows | MM p124-128 [PDF 136-140]; drills vi-viii p130 [PDF 142] | "12 Oct 2026" → words |

**Risk controls.**

1. **Tables ship `reviewed:false` like any lexicon entry**, and their topic stays pending in the Grammar list (as the 5 topics are now). Under D6, a topic offers a generated item **as an answer** only once its table is reviewed.
2. **Golden vectors.** About 40 input → output pairs per generator (e.g. 47, 2,500₮, 4:30, "mother's father") go on Luna's sheet once. They are committed in `gen.json.golden`. `tools/test.html` asserts the generator reproduces each exactly, so any later code change that alters a reviewed output fails.
3. **Answer sets, not single answers**, wherever Mongolian has more than one right form:
   - дөрөв хагас and дөрөв гуч;
   - the paternal/maternal distinctions: «нагац» marks the mother's side, so "mother's father" may be өвөө or нагац өвөө. Luna fills the set.
   - Typed answers grade with `gradeAnswer(…, accepted, 1)`: exact, against all variants.
4. **Distractors differ in value** (another number, another time, another relation). The tests assert that no distractor string is in the item's accepted set.
5. **Bounded scope per unit:**
   - U3: numbers to 100, then to 9,999 after a week of passes;
   - U8: prices;
   - U25: years.
6. **Outside FSRS.**
   - Generated items are practice with a tally in `P.grammar[topicId]`, which already has merge and rebase rules (`sync.js:270-271, 286, 289`).
   - They never grade the lexicon's number words. Grading them would risk a second grade per word per session.

**Morphology (phase 3, with the learning loop's suffix-chip rung).**

- `tools/syllabus.py --paradigms Uxx` proposes rows `{word id, suffix id, form}` from the harmony tables:
  - question particles, Beg p4-5 [PDF 5-6];
  - -тай³, Surv p75 [PDF 77];
  - -аарай⁴, Surv p40 [PDF 42];
  - -сан⁴/-аагүй⁴, Surv p94 [PDF 96];
  - -аас⁴, Surv p19 [PDF 21];
  - dative, Beg p50-51 [PDF 51-52];
  - genitive, Beg p121-125 [PDF 122-126].
- Luna sees a **paradigm grid per word**: about 6 forms, about 25 seconds.
- **Only rows she marks Зөв enter `src/data/morph.json`.** The chip rung's right answer comes only from there. Its wrong chips are the other harmony variants, which are wrong by construction.
- A proposed row is never shown to Fred.

### 3.10 Release gate: draft → review → live

| State | Where | Who sees it |
|---|---|---|
| **draft** | `content/units/Uxx/*.json` (not under `src/`, so never built or shipped) | Claude, Fred |
| **review** | the same files, plus a generated sheet | Luna |
| **live** | merged into `src/data/*.json` by `release.py` | Fred's app |

**What ships before review** (D1, recommended hybrid):

- **Lexicon entries and generator tables** may ship `reviewed:false` the day they are drafted (`release.py Uxx --words`).
  - They are single words and number words read off the books' own lists and glossaries.
  - That is how the 73 entries of August shipped (CLAUDE.md, State).
  - In Luna's August pass, all 73 came back Зөв, 2 of them with usage notes (`docs/mongolian-review.json`). Her corrections were to sentences.
- **Sentences, readings, grammar topics and morphology rows** ship only after review (`release.py Uxx --sentences`, `--readings`).
  - These are Claude-written Mongolian.
  - Luna rejected 7 of 111 machine alternatives (6%) and rewrote 4 of 164 canonicals (2.4%) (CLAUDE.md, Current status).
  - Accepting a wrong answer teaches it (CLAUDE.md, Content schema).
- **Review latency must stay ≤ 7 days.** The simulation shows 14 days collapses i+1 for a month (§3.2).

**Gates `release.py` runs**, in order. Any failure stops the release.

1. JSON validity: `boot()` blanks the app if any data file fails (audits-plat).
2. The Cyrillic validator (§3.4).
3. `coverage.py --selftest`.
4. Tagging, then the **retag diff** for existing sentences.
5. The authoring rules (§3.6).
6. `overlap.py`: blocking (§3.12).
7. `alternatives.py`, then `tiles.py --check`.
8. `py tools/run_tests.py`.
9. Updating `units.json` (`status`, `released`), `content/ids.json`, and the sheet.

### 3.11 The review pipeline

**Roles.** Luna is the one reviewer and signs everything (CLAUDE.md, "pending Luna"). Her items fall into two kinds of sitting (D7).

| Sitting | Items | Why |
|---|---|---|
| **Sentences** (short sittings) | sentence canonicals and their Mongolian alternatives; readings; "how would you say it?" | Naturalness is a native judgement. Her free-text phrasings are the most valuable field (`review-sheet.py:24-26`). Short sittings suit this part. |
| **Words** | lexicon entries and glosses; grammar topics; generator tables and golden vectors; morphology grids; tile pools; unit questions; open questions | These need a grammar authority. They can be done together with Fred, if they both like (D7). |

**Sheet changes** (`tools/review-sheet.py`):

- `--for sentences|words` selects one kind of sitting.
- `--unit U05` scopes the sheet.
- `--budget 15` fills the sheet in unit order until the time estimate reaches 15 minutes.
- **New sections:**
  - «Шинэ өгүүлбэр» (new sentences): a canonical verdict, alternative verdicts and a phrasing box, with sentences grouped by `frame` under one header;
  - «Нэгжийн асуулт» (unit questions);
  - «Дүрмийн хүснэгт» (generator tables and golden vectors as rows);
  - later, «Хувирал» (paradigm grids);
  - «Асуулт» (open questions), e.g. ROADMAP 2c's four.
  - Reading adds the passages section; the learning loop adds tile pools.
- **Keys** by `sid`, word id, passage id or table row. Never by the text.
- **Timing.** The sheet records a timestamp per decision. `--apply` turns them into median seconds per item type in `content/review-times.json`, and the next `--budget` uses them. The "about N minutes" at the top is then a measured figure.
- **Provenance.** `--apply` writes `reviewedBy`. Return files are committed under `content/reviews/YYYY-MM-DD-<who>.json`, following the precedent of `docs/mongolian-review.json`.
- Sheet chrome stays as it is: Mongolian with English, for the reviewers. It is not app chrome.

**Throughput per unit.** These are assumptions until the timing data replaces them.

| Item | Per unit | Seconds each | Minutes | Reviewer |
|---|---|---|---|---|
| Lexicon entries | 28 | 10 | 5 | Luna |
| Unit question | 1 | 15 | < 1 | Luna |
| Grammar topic | 1 | 300 | 5 | Luna |
| Tile pools (same-stem ones, about half) | 32 | 12 | 6 | Luna |
| Generator rows and golden vectors (U3, U4, U8, U25 only) | 20-40 | 5 | 2-3 | Luna |
| Sentences: frame-grouped (40%) | 26 | 10 | 4 | Luna |
| Sentences: single, with 1-2 alternatives (60%) | 38 | 20 | 13 | Luna |
| Readings | 5 | 90 | 7.5 | Luna |
| **Total** | | | **≈ 45** | Luna: sentences ≈ 25, words ≈ 18 |

- At one unit per 1.3-1.5 weeks: **about 30-40 minutes a week**, all Luna's: two 10-15-minute sentence sittings a week, and one 20-35-minute word sitting a fortnight.
- One-off loads on top: Reading's home-1 pack (45-60 min, Luna); the 5 pending grammar topics (≈ 25 min); the first generator tables (≈ 15 min).
- **Batching rule:** never more than ~30 minutes per sheet. Unfinished items roll into the next sheet. The sheet autosaves, so a sitting can stop at any time.
- **Rejected work** (Буруу with a rewrite) follows the existing all-rejected-and-rewritten rule (`review-sheet.py:409-424`) at sentence level. Readings and topics produce a hand-edit worklist, as grammar does now.

### 3.12 Copyright policy

This is written into the repo as `docs/CONTENT.md` and linked from CLAUDE.md. It is a conservative engineering policy, not legal advice.

> **What the textbooks are to this project.** *Beginner Mongolian Part 1* (Nomiin Ger), *Survival Book 023*, *Modern Mongolian: A course book* (Gaunt & Bayarmandakh), the Peace Corps lessons and the Nomiin Ger word lists are Fred's reference copies. The app is published on public GitHub Pages.
>
> 1. **No text from any book enters this repository**: not passages, dialogues, example sentences, exercise items, answer-key lines, glossary definitions, word-search grids or audio. The extracted `.txt` files live outside the repo and are passed to tools by path.
> 2. **What the app takes from the books is facts and structure**: which words a learner at this stage needs, which grammar points come in which order, which topics a lesson covers, and the *format* of an exercise. Individual words, their plain meanings and grammar rules are facts. The app's lexicon is ordered by its own syllabus and by frequency across several books, never one book's list in that book's order.
> 3. **Everything the app teaches is original writing**: sentences, readings, dialogues, questions, grammar summaries and their examples. Every item carries `src`: "Modelled on <book>, <section>, printed pX [PDF Y]: <what was borrowed>. Original text."
> 4. **An automated guard.** `tools/overlap.py <books dir>` must report no run of 5 or more consecutive tokens shared with any book, over every sentence, reading, grammar example and drill in `src/data` and `content/`. `release.py` refuses to release otherwise.
>    - Formulaic phrases of up to 6 tokens (greetings, «Таны нэр хэн бэ?») are listed in `tools/overlap-allow.txt`, each with a reason.
>    - A whole-sentence match of 4 tokens is a warning that Fred reads.
> 5. **The books' characters and settings are not reused.** The app has its own cast (Fred, Luna, the cat, Luna's parents) and invented minor characters. Personal data stays at first names (Reading's D8).
> 6. **Retellings.** The folk tale in MM ch. 11-14 is retold from its plot only, in original A2 Mongolian written or reviewed by Luna. Plot elements may be kept; sentences may not (D9).
> 7. **Answer keys and translations** (MM printed 221-257 [PDF 233-269]) are used only to check a grammar point's meaning, never as a source of sentences.
> 8. **Citations** use `printed pN [PDF M]`. A wrong attribution is a bug: `alternatives.py`'s docstring is corrected to Gaunt & Bayarmandakh.

**`overlap.py` details.**

- Tokens are lowercased Cyrillic.
- Latin look-alikes are mapped to Cyrillic. ү/у and ө/о are folded **for comparison only**. Folding finds more matches, which is the safe direction for a guard; it also covers the books' Ү→У extraction defect.
- Page markers give `book, PDF page` for each hit.
- The existing 164 Booklet sentences are baselined in the first run, and are expected clean.
- It cannot run in CI, because the books are not in the repo. `release.py` runs it locally and records the result and the books' file hashes in `content/overlap-log.json`. Fred commits that log with each release.

### 3.13 Content calendar

Today is Mon 12 Oct 2026. Fred is at the ceiling.

| Week (Mon) | Words go live (provisional) | Sentences go live (reviewed) | Readings, topics, generators | Luna's word sheet (L) | Luna's sentence sheet (S) |
|---|---|---|---|---|---|
| W1 · 12 Oct | **U1 + U2** (58 + 5 grammar) after F0-F2 | – | Reading's home-1 drafted | L1: U1-U2 lexicon (63), ROADMAP 2c questions, numbers + weekday tables, 5 grammar topics · **≈ 40 min** | S1: U1 sentences (≈ 85) · ≈ 25 min |
| W2 · 19 Oct | U3 (35) | U1 | numbers, weekdays topics (tables reviewed) | L2: U3 lexicon, time table, U1 tiles, home-1 part 1 · ≈ 35 | S2: U2 sentences (≈ 48) · ≈ 14 |
| W3 · 26 Oct | U4 (20) | U2 | time; U1 readings | L3: U4 lexicon, kin table and golden set, home-1 part 2 · ≈ 35 | S3: U3 sentences (≈ 80), U1 readings · ≈ 30 |
| W4 · 2 Nov | U5 (22) | U3 | family puzzles; U2 readings | L4: U5 lexicon, U2-U3 tiles · ≈ 20 | S4: U4 sentences, U2 readings · ≈ 20 |
| W5 · 9 Nov | U6 (≈ 28) | U4 | U3 readings | L5: U6 · ≈ 18 | S5: U5 · ≈ 20 |
| W6 · 16 Nov | U7 | U5 | U4 readings | L6 · ≈ 18 | S6 · ≈ 22 |
| W7 onward | One unit when the runway is < 14 days: **≈ every 9 days** | the unit released before it | 5 readings per unit; 1 topic per unit | ≈ 18 per unit | ≈ 25 per unit |

**Milestones.** These are projections from the measured intake: 22/week falling to 19/week, cap 6. The runway line corrects them.

| Point | Date | New words |
|---|---|---|
| First 135 introduced | ≈ late Nov 2026 | 135 |
| Stage A complete (U15) | ≈ mid-Feb 2027 | ≈ 404 |
| Stage B complete (U24) | ≈ early June 2027 | ≈ 734 |
| Stage C complete (U28) | ≈ mid-Aug 2027 | ≈ 914 (≈ 1,070 lexicon) |
| Stage D decision (D14) | spring 2027, before the books run out | |

**Claude's time:** about 1.5 focused sessions per unit (draft, then apply and release), so about one session a week for the year. The project skill keeps each one short.

### 3.14 Edge cases

- **Fred studies faster than the plan (cap raised, perfect weeks).** The runway line drops below 14 days earlier, and the next unit is drafted earlier. `release.py` can release two units' words at once; the simulation shows two units ahead is the better state anyway.
- **Fred pauses for a week.** Nothing drains. Released words wait in file order, and no content is lost or reordered.
- **A review sheet does not come back.**
  - Words keep flowing (provisional), so lessons stay full.
  - Sentences for those units wait.
  - The calendar's sentence-latency check turns red in `--status`.
  - If latency passes 7 days, the next word release pauses. The buffer still covers about 2 weeks, so Fred notices nothing.
- **Luna rejects a live word.** The spelling or gloss is fixed in place (same id). If the concept is wrong, the word is deleted and the id retired. Sentences using it fail the tagging gate and go back to draft.
- **Luna rewrites a live sentence.** The sentence keeps its `sid`. `release.py` prints what it orphans: tile pools, audio clips (Sound keys clips by `textKey(mn)`), alt sets. Each is regenerated or re-queued.
- **A unit is reordered or split** (Fred wants food before family). `units.json` `order` changes before release. Released units never move.
- **The unit card when two units start in one session:** only the first shows (§2.2).
- **Home words with one sentence each:** they get new contexts as support words in U1+ (rule 3 of §3.6). Nothing is written for them.
- **A word in two senses** (сая "million / just now"; ер "ninety" vs «ер нь» "generally"): the second sense becomes a phrase entry or `forms`, decided on the sheet. The matcher's self-test holds the case.
- **Words in the books but wrong for Fred** (Russian loans flagged in books-surv/small: польто, палаж, огурцы): never imported without Luna's explicit yes.

---

## 4. Data & state

**Progress (`P`): no new fields.** Everything this workstream adds is content data, or is derived from the FSRS state that already syncs.

| Need | Where it comes from | Why no new state |
|---|---|---|
| Which unit a word belongs to | `words.json` `unit` | content |
| Unit progress (introduced, familiar ≥ 7d, known ≥ 21d) | `p.items`, `p.introduced` + `units.json` | derived, like `stats()` (`progress.js:204-227`) |
| Whether the unit card has been seen | `p.introduced` contains a word of the unit | derived |
| Runway | drillable words not in `p.introduced`; intake = Σ `history[].newWords` over 14 days ÷ 14 (`progress.js:67`) | derived |
| Generated drill tallies | `P.grammar[topicId]` (existing map; merge `sync.js:270-271`; counters `:286`; latest `:289`) | reuses a synced field |
| Readings done | `P.readings` | Reading's field |

**Sync and backup codes are therefore unaffected.**

- New word ids (274+) land in the existing `items-N` documents. With about 1,300 ids at most, that is items-2 to items-13. The Firestore rules already allow `items-[0-9]+` (audits-plat).
- Deleting a word leaves its `p.items` entry, which is harmless: the scheduler and `stats()` filter by `words.json` (`scheduler.js:57-62`, `progress.js:206-210`).
- A test asserts that a word id ≥ 1,000 buckets to the right document and round-trips (§6).

**Content files (shipped, under `src/data/`, precached automatically by `build.py:75-77`):**

`units.json` (new):

```json
[
 { "id": "U03", "order": 50, "stage": "A",
   "title": "Numbers, age and time",
   "can": "Say your age, read prices, tell the time",
   "q": { "mn": "Та хэдэн настай вэ?", "en": "How old are you?" },
   "sources": [
     { "book": "Surv", "printed": "26-38", "pdf": "28-40", "use": "topics, number list, linking -н rule (p26)" },
     { "book": "MM", "printed": "48-49, 63-66", "pdf": "60-61, 75-78", "use": "numerals; telling the time" } ],
   "grammar": ["g_numbers"], "generators": ["numbers", "time", "weekdays"],
   "status": "live", "released": "2026-10-19",
   "reviewed": false, "reviewedBy": null }
]
```

- `id`: `H1-H3`, `U01-U28` (and later). Permanent.
- `order`: gaps of 10.
- `stage`: `H` | `A` | `B` | `C` | `D`.
- `status`: `planned` | `draft` | `review` | `live`. Gamification shows `planned` units honestly as "planned", with no counts.
- `title` and `can` are English chrome. `q` is a content pair, reviewed.

**`words.json`**, additive fields:

| Field | Type | Notes |
|---|---|---|
| `unit` | string | required for new entries; backfilled H1-H3 |
| `src` | string | required for new entries |
| `forms` | string[] | exact matcher aliases, reviewed with the entry |
| `infl` | `"none"` | particles and interjections |
| `personal` | true | |
| `reviewedBy` | `"luna"` | |

The existing `reviewed`, `drill` and `note` are unchanged.

**`sentences.json`**, additive fields:

| Field | Notes |
|---|---|
| `sid` | backfilled for all |
| `unit` | |
| `src` | |
| `reviewed` | `false` only in drafts under policy D1; live sentences have `true` or absent (legacy) |
| `reviewedBy` | |
| `frame` | optional |
| `pair` | optional: the sid of the Q/A twin |
| `parts` | optional, `[{mn, en}]`, for the learning loop |

`alt`, `altReviewed`, `ids`, `partial` and `note` are unchanged. `tiles` and `tilesReviewed` belong to the learning loop.

**`grammar.json`:**

- `unit` on every topic.
- New topic kind: `{ "id": "gen_numbers", "generator": "numbers", "params": {"max": 100}, … }`, with no fixed `drills`. Its `reviewed` mirrors the table's.

**`gen.json`** (new): `{ numbers, time, weekdays, months, kin, prices, dates, golden: [...] }`. Each table has `reviewed`, `reviewedBy` and `src`.

**`morph.json`** (phase 3): `[ { "id": "m0001", "word": 245, "suffix": "abl", "form": "…", "reviewed": true, "src": "…" } ]`. Reviewed rows only.

**Workshop files (repo, never shipped, since `build.py` copies only `src/`):**

- `content/README.md`
- `content/ids.json` (`{ "nextWordId": 274, "nextSid": 165 }`)
- `content/units/Uxx/{plan.md, words.json, sentences.json, alt.json, readings.json}`
- `content/reviews/*.json`
- `content/review-times.json`
- `content/overlap-log.json`

**Device-local and session-only state:** none. The unit card's "already shown this session" is implicit in the session's item list.

**Backup-code safety.**

- No `P` field is added, renamed or repurposed, so v1 and v2 codes import exactly as before.
- A code made before a word was deleted carries an orphan item, which is filtered as now.
- `tools/test.html`'s backup sections (`:102-117`, `:773-812`) need no change. One new assertion: a code holding `items` for ids not in `words.json` imports, and `stats()` ignores them.

---

## 5. Content

### 5.1 What is needed, by stage

| Stage | Units | New words | Sentences (≈ 2.3 × words) | Readings (5 per unit) | Grammar topics | Generator tables |
|---|---|---|---|---|---|---|
| A (A1) | U1-U15 | ≈ 404 | ≈ 930 | 75 | 15 (3 exist) | numbers, time, weekdays, kin, prices |
| B (A2) | U16-U24 | ≈ 330 | ≈ 760 | 45 | 9 (2 exist) | time with minutes, months |
| C (B1) | U25-U28 | ≈ 180 | ≈ 410 | 20 (incl. 4-8 folk-tale episodes) | 4 | dates |
| **Total** | 28 | **≈ 914** | **≈ 2,100** | **140** (+ Reading's home-1, 18) | 28 | 7 |

**File sizes.**

- `sentences.json` grows from 50 KB to about 1 MB at stage C, with alt sets; `words.json` grows to about 90 KB. Both are parsed once at boot, which is fine on the iPhone.
- If parse time ever shows on the dashboard, split by stage. That is a build-time concatenation, not a schema change.

### 5.2 Modelled-on pages, per unit (printed [PDF])

These pages are what is borrowed: topic, grammar point and format. Never sentences.

| Unit | Grammar pages | Vocabulary pages | Reading / dialogue formats | Exercise formats used for sentences |
|---|---|---|---|---|
| U1 | Beg p3-6 [4-7]; Surv p11-15 [13-17] | Beg p3-6 [4-7]; Surv p11-15 [13-17] | Surv p17 [19]; Beg p2 [3]; MM p11 [23] | particle cloze Surv p12-13 [14-15]; triplets Beg p4-5 [5-6] |
| U2 | Surv p19-23 [21-25] | Surv p18-22 [20-24] | Surv p18 [20], p23 [25], p25 [27] | question-for-answer Surv p20 [22]; cue Surv p19 [21] |
| U3 | Surv p26-36 [28-38]; MM p48-49 [60-61], p63-66 [75-78] | Surv p27, 33 [29, 35]; MM p48 [60] | Surv p26 [28], p36 [38] | generators; Surv p28-31 [30-33] number drills (format only) |
| U4 | Beg p11-12 [12-13]; Surv p75 [77] | Beg p14 [15]; Surv p75 [77] | Beg p11 [12], p18 [19]; Surv p75 [77] | kin riddles Surv p81 [83] (generator) |
| U5 | Beg p23-24 [24-25]; Surv p40-43 [42-45] | Beg p22 [23]; Surv p39-41 [41-43] | Beg p23 [24], p29 [30]; Surv p39 [41], p44 [46] | commands Beg p25-28 [26-29] |
| U6 | Beg p35-36 [36-37], p40 [41] | Beg p34 [35] | Beg p35 [36], p43-44 [44-45] | transformations Beg p37 [38] |
| U7 | Beg p49-52 [50-53] | Beg p52-53, 57 [53-54, 58] | Beg p49 [50], p59-60 [60-61] | word order Beg p54 [55]; situations Beg p60 [61] |
| U8 | Surv p47-51 [49-53], p59-63 [61-65] | Surv p48-49, 54-55 [50-51, 56-57] | Surv p47 [49], p53 [55], p55 [57], p59 [61]; PC p12 | харин contrast Surv p50 [52]; categorising Surv p57 [59] |
| U9 | Beg p65-66 [66-67]; Surv p94 [96] | Beg p64, 66 [65, 67] | Beg p65 [66], p76-78 [77-79]; Surv p98 [100] | morpheme columns Beg p69 [70]; word order Beg p69-70 [70-71] |
| U10 | Beg p84 [85] | Beg p82, 84 [83, 85] | Beg p83 [84], p95-97 [96-98] | word order Beg p89 [90]; correction Beg p90-91 [91-92] |
| U11 | Beg p102, 106 [103, 107]; MM p6 [18] | Beg p101-102 [102-103] | Beg p107-108 [108-109] | word-order pairs MM p7-8 [19-20] |
| U12 | Surv p67-73 [69-75] | Surv p67, 70 [69, 72]; Beg p17 [18] | Surv p69, 72 [71, 74] | who-is-who Surv p72 [74] |
| U13 | Surv p82-88 [84-90] | Surv p82, 84, 88 [84, 86, 90] | Surv p82 [84], p88 [90] | frame completion Surv p83-85 [85-87] |
| U14 | Beg p112-113 [113-114]; Surv p90-91 [92-93] | Beg p111, 115, 118 [112, 116, 119] | Beg p111 [112], p115-116 [116-117] | word order Surv p92 [94] |
| U15 | Beg p121-125 [122-126] | Beg p121-123, 133 [122-124, 134] | Beg p121 [122], p133-135 [134-136] | genitive chains Beg p125-130 [126-131] |
| U16-U24 | the chapter's grammar pages (§3.1) | the chapter's vocabulary list; En-Mn glossary printed 195-220 [207-232] | the chapter's text (format only) and its exercise b/c dialogues (format only) | MM drill types (books-mm1 `exercise_types`) |
| U25-U28 | the chapter's grammar pages | same | folk tale retold (plot only) | MM drill types (books-mm2) |

### 5.3 What Luna reviews, and how much of her time

Together: about 31-35 minutes a week in steady state, about 28 hours over the year.

| | Words, grammar and tables | Sentences and readings |
|---|---|---|
| One-off, weeks 1-3 | U1-U5 lexicon (140 entries ≈ 25 min); 5 pending grammar topics (≈ 25 min); generator tables and golden vectors (≈ 15 min); ROADMAP 2c questions (≈ 5 min); Reading's home-1 (45-60 min) | – |
| Per unit | lexicon, grammar topic, tile pools, unit question, (tables): **≈ 18 min** | sentences and readings: **≈ 25 min** |
| Per week, steady state | **≈ 13-15 min** (one 25-30-minute sitting a fortnight) | **≈ 18-20 min** (two 10-minute sittings) |
| Over the year | ≈ 12 hours | ≈ 16 hours |
| Phase 3 morphology | paradigm grids: ≈ 25 s per word, ≈ 15 min per unit | – |
| Audio (Sound) | – | if she agrees to record: each unit's words and sentences after they pass review (Sound §5.2: 10-15 min per 50 words) |

---

## 6. Build

### 6.1 Files

**New: shipped code (DOM-free, tested in `tools/test.html`)**

- **`src/core/units.js`**
  - `unitIndex(units)`
  - `unitWords(unit, words)`
  - `unitStats(p, unit, words, {today})` → `{words, introduced, familiar, known}`, real counts (`s ≥ 7`, `s ≥ 21`)
  - `unitStarting(session, p, words, units)` → the unit whose first word is in `session.fresh` while none of its words is in `p.introduced`, or `null`
  - `runway(p, words, today)` → `{ready, perDay | null, days | null}`
- **`src/core/gen.js`**
  - `numberWords(n, {attributive}, T)`
  - `timeWords(h, m, T)` → accepted variants
  - `dayAfter(name, T)`
  - `kinItem(seed, T)` → `{mn, en, accepted, options}`
  - `priceWords(n, T)`
  - `drillsFor(topic, T, {seed, count})` → drills in the grammar runner's `choice` / `transform` shapes, plus an `accept` array
  - Pure functions over the `gen.json` tables, with no inflection logic.

**New: data**

- `src/data/units.json`
- `src/data/gen.json`
- later, `src/data/morph.json`

**New: tools (Python 3.14, stdlib)**

- **`tools/release.py`**: `Uxx --words | --sentences | --readings | --check`; id ledger; gates (§3.10); sid assignment; merge into `src/data`; `units.json` status; sheet generation. `--check` runs every gate without writing. CI uses `--check --no-books`.
- **`tools/overlap.py`**: `<books-dir> [--paths …] [--self-test]`; 5-gram guard (§3.12); allowlist; log.
- **`tools/syllabus.py`**:
  - `--plan Uxx` drafts `plan.md`: the unit's pages, its frequency-ranked candidate lemmas not in the lexicon, and the matcher's collision check.
  - `--status --progress <code-file>` prints runway, sentence latency, readings ready, and the calendar position.
  - `--books <dir> --progress <code-file>` (local only) prints which printed pages of Fred's own books he can now read at ≥ 90/95%: page numbers and percentages, never text. This is Reading's optional C5, and it lives here.
  - `--paradigms Uxx` (phase 3).
- **`tools/matcher-gold.tsv`**, **`tools/overlap-allow.txt`**.
- **`.claude/skills/next-unit/SKILL.md`**: the weekly routine as a project skill. Draft: `plan` → write drafts → `release --check` → `release --words` → sheets. Apply: `review-sheet --apply` → `release --sentences/--readings` → `run_tests` → commit and push.
- **`docs/CONTENT.md`**: the policy of §3.12, the pipeline, and the calendar rule.
- **`content/`**: the workshop (§4).

**Changed**

- **`tools/coverage.py`**: hardening 1-7 (§3.5); `forms` and `infl` support; `--selftest`; `--content <dir>` (tag and report drafts); `--retag-diff`. Reading's `--readings` modes build on these. Their `--overlap` flag calls `overlap.py`.
- **`tools/review-sheet.py`**: `--for`, `--unit`, `--budget`, `--second-look`; the new sections (§3.11); per-decision timestamps; `who`; `reviewedBy`; sid / id keys; apply writes `content/review-times.json`.
- **`tools/alternatives.py`**: reads `content/units/*/alt.json` keyed by `sid` (the HAND table remains); handles canonicals with `reviewed:false` (their alternatives flagged `altReviewed:false`); docstring attribution fixed to Gaunt & Bayarmandakh; page comments rewritten as `printed p6 [PDF 18]` and so on (p74 → printed 62 [PDF 74]; p97 → printed 85 [PDF 97], with books-mm1's note that -аач is the more familiar register, printed 89 [PDF 101]).
- **`tools/extend-lexicon.py`**: docstring points to `release.py`; kept for history.
- **`src/data/words.json`, `sentences.json`, `grammar.json`**: one-time backfill of `unit` (H1-H3 and topics) and `sid`, via `release.py --backfill`.
- **`src/ui/app.js`**:
  - `boot()` adds `units.json` and `gen.json` to its `Promise.all`.
  - At session start, `S.session.items.unshift({kind:'unit', unit})` when `unitStarting(…)` returns one.
  - `render()` gets a `unit` branch (`Start` → `advance()`).
  - The grammar runner's `setupGrammarStep()` asks `gen.drillsFor()` when `topic.generator` is set.
  - `idsOf`-style helpers treat `unit` as gradeless. Coordinate with the learning loop and Reading, who add `retry` and `reading` kinds.
- **`src/ui/views.js`**: `viewUnitCard(unit, counts)`; the generated topic rows; the runway line in Progress's Numbers disclosure (owned by Less text).
- **`src/core/grammar.js`**: `gradeDrill` accepts `drill.accept` and grades with `gradeAnswer(…, accept, 1)` for generated items.
- **`src/core/goals.js`**: `stepCount` counts a `unit` item as 0 steps, so the lesson bar does not grow.
- **`.github/workflows/pages.yml`**: add `python tools/coverage.py --selftest` and `python tools/release.py --check --no-books` before Build.
- **`.gitignore`**: `tools/review*.html`.

### 6.2 Tests

**`tools/test.html` (core)**

- **New section "content: units"**
  - `units.json` parses.
  - Ids unique and matching `/^(H\d|U\d{2,})$/`; `order` strictly increasing.
  - `stage` and `status` from their sets.
  - Every live unit has at least one word.
  - Every `word.unit` and `topic.unit` exists.
  - Every source has `printed` and `pdf`.
  - `unitStats` on a fixture: counts match a hand computation; `s ≥ 7` and `s ≥ 21` boundaries.
  - `unitStarting`: shows for a unit's first word; not again once any word of it is introduced; only the first of two starting units.
  - `runway`: rate from `history.newWords`; days only when the rate is ≥ 1/day; `null` with fewer than 2 history days.
- **New section "content: lexicon"**
  - New entries (id ≥ 274) carry `unit` and `src`.
  - Every `mn` matches `^[а-яёөү ]+$`.
  - No `[A-Za-z]` anywhere in `mn` or `forms`.
  - `forms` are strings not equal to any headword.
  - `infl` ∈ {`"none"`}.
  - No id above `content/ids.json` `nextWordId − 1`. The test fetches `content/ids.json`; serving the repo root makes that possible.
- **New section "content: sentences"**
  - `sid` unique, `/^s\d{4,}$/`, present on all.
  - **Authoring rule:** every id of a sentence with `unit` belongs to a unit with `order ≤` its own. At most 2 ids from its own unit.
  - Live sentences are never `reviewed:false`.
  - `pair` resolves to a `sid`.
  - `parts` present for 8+ tokens in stage B-C units.
  - The 6 legacy `partial` sentences are allowed by an explicit list; new ones are not.
- **New section "content: generators"**
  - Every golden vector reproduces exactly.
  - Linking -н per Surv p26: 3 → гурван before a noun; 1 and 2 never take it; 1,000 before a number vs before a noun.
  - Numbers 1-9,999 all produce non-empty strings made only of table tokens.
  - No distractor appears in its item's `accept` set.
  - Every kin path's answers ⊆ kin terms.
  - Time :30 accepts both хагас and гуч forms.
  - An unreviewed table yields no items in "answer" mode under D6.
- **Corpus integrity** (`:326-338`): keep. "no duplicate mn forms" stays meaningful, because phrase entries differ.
- **Trajectory** (`:340-371`):
  - Once drillable words ≥ 250, "content runway is recorded" becomes **"content runway covers the 45 simulated days"** (`dry === -1`). Below that, it stays a record.
  - The "≤ 40 items" bound must still hold. The simulation peaked at 29 steps a day.
  - Add the once-per-word `seen` guard the learning-loop audit flagged (`:180-181, :351`). Owned jointly with the learning loop; whoever lands first.
- **Sync:** a word id 1,234 goes to `items-12`, and `toDocs`/`fromDocs` round-trip with it. Backup: a code with orphan item ids imports, and `stats()` excludes them.
- **Collision test** (`:500`): must stay green as packs land. The release gate runs the suite.

**`tools/engine-test.html`:** no changes, because sync is untouched. Run it anyway after the `boot()` change (CLAUDE.md).

**`tools/smoke.html`:**

- The built app boots with `units.json` and `gen.json` present.
- Grammar tab → "Numbers" → answer one item; `P.grammar.gen_numbers` moves.
- A fixture progress at the start of U3 shows the unit card, then the deck.

**Python self-tests** (run by `release.py --check` and CI): `coverage.py --selftest`; `overlap.py --self-test` (synthetic text with a planted 5-gram is caught, and a 4-token match only warns).

### 6.3 Documents to amend in the same changes

- **`CLAUDE.md`**
  - **Content schema:** the new fields (`unit`, `src`, `forms`, `infl`, `personal`, `reviewedBy`, `sid`, `frame`, `pair`, `parts`); `units.json`, `gen.json`, `morph.json`; the `content/` workshop; the release gate (D1); "ids are never reused"; the matcher rules.
  - **Run:** `release.py`, `syllabus.py --status`, `overlap.py`.
  - **Known limit:** replaced by the buffer rule and the runway line.
  - **Rules:** a pointer to `docs/CONTENT.md`; the "generated answers come only from reviewed tables" rule (D6).
  - **Stale lines to remove:** "Interface chrome is Mongolian; telemetry labels are uppercase Latin mono" (contradicts the English-only rule, as audits-gami and audits-loop note); coverage figures to be re-measured.
- **`ROADMAP.md`**
  - 2b: superseded by this engine, with a link.
  - 2c: moved onto Luna's sheet L1.
  - 4 (morphology): becomes phase 3 here, with the reviewed-row rule.
  - 5 (conversation packs): fed by the units' dialogues.
- **`docs/INSTRUMENT.md`**: Copy, "Machine-written Mongolian". Add one sentence: generated drills compose only reviewed table entries; provisional lexicon entries may be studied before sign-off (D1). No visual rule changes.
- **`docs/CONTENT.md`**: new (§3.12, the pipeline, §3.13's rule).

---

## 7. Size & dependencies

| Increment | What | Size | Needs first | Unblocks |
|---|---|---|---|---|
| **F0** | Matcher hardening 1-7, gold self-test, retag diff of the 164 | **M** (1) | – | every lexicon addition; Reading's C0 prerequisite |
| **F1** | `content/` workshop, `ids.json`, `units.json` (H1-H3, U1-U28 planned), backfill `unit` and `sid`, `release.py --words/--check`, `overlap.py`, `docs/CONTENT.md`, CI steps | **M** (2) | F0 | F2; Gamification's path data |
| **F2** | U1 + U2 words drafted and released provisionally; Luna's sheet L1 | **S** (0.5, inside F1's second session) | F1 | **Fred has new words in week 1**; Reading's home-1 (glue words) |
| **F3** | `review-sheet.py` upgrade (`--for/--unit/--budget`, sentences, unit questions, tables, timing, `reviewedBy`, sid keys) | **M** (1-2) | F1 | F4; Reading's and the learning loop's sections slot in |
| **F4** | First sentence packs U1-U2; `alternatives.py` per-unit tables and fixes; `release.py --sentences`; `tiles.py` in the gate if built | **M** (1-2) | F3 (learning loop's `tiles.py` optional) | i+1 back above 0.7; tiles and retries have new material |
| **F5** | `gen.json`, `core/gen.js`, generator topics in the grammar runner, golden vectors, tests, smoke step | **M** (2) | F1; Luna's table review for answer mode | unlimited practice (Fred's #1), no writing needed |
| **F6** | `core/units.js`, unit card, runway line | **S-M** (1) | F1; Less text's Progress layout; Gamification's path decision (D11) | Gamification's path numbers; Fred's weekly trigger |
| **F7** | `syllabus.py --plan/--status/--books`; `/next-unit` skill | **S** (0.5-1) | F1-F4 | the routine takes ~10 minutes of Fred's time |
| **Ongoing** | One unit: plan, draft, gates, release words; apply review, release sentences and readings | **1.5 sessions per unit**, ≈ 1 a week | F1-F4 | the ceiling never returns |
| **F8** | Morphology: paradigm proposals, Luna grids, `morph.json`, chip-rung feed | **L** (3+) | the learning loop's suffix-chip rung; F3 | ROADMAP 4 without the vowel-harmony risk |

**Order:** F0 → F1 → F2 (week 1) → F3 → F4 (week 2) → F5 (week 2-3) → F6 → F7 → F8 (stage B).

**Up front:** about 9-11 build sessions, so **L overall**. The first new words reach Fred after 2-3 sessions.

**Interfaces with the parallel workstreams**

| Workstream | This engine gives it | It gives this engine | Contract |
|---|---|---|---|
| **Learning loop** | ≥ 2 sentences per word; `sid`; `parts` on long sentences; `pair` (Q/A twins); same-stem siblings for distractors (frames); reviewed `morph.json` (F8) | `tools/tiles.py` (run in the release gate); the grade policy; the item kinds `retry` and `reading` beside `unit` | Tile pools generated only from reviewed corpus tokens. Never a generated inflection. |
| **Sound** | Release order = recording order; unit word lists; a list of `mn` corrections that orphan clips | Recording sheets; `audio` keys | Words recorded only after their spelling is reviewed (Sound §5.2). Corrections print orphaned clips. |
| **Reading** | The 11 glue words at the head of U1 (F2); matcher fixes (F0); `forms`; `overlap.py`; 5 passages per unit with `pack` = unit id; Fred's readable book pages (`--books`) | The reader; `readings.json` schema; its review section; its coverage gate | Passages only from released units, ≥ 98% projected coverage. |
| **Gamification** | `units.json` (planned and live, titles, `q`); `unitStats`; `runway`; the guarantee that a live unit's word count never changes | The path UI; completion thresholds; XP rules for generated topics (anti-replay) | Planned units show no numbers. Unit progress comes only from FSRS state. |
| **Less text** | The unit card (13 words); generated drills (≤ 6); the runway line (7) | The Progress "Numbers" disclosure; the gloss/hint policy | No content text is cut; only chrome is budgeted. |

---

## 8. Decisions for Fred

| # | Decision | Options | Recommended default |
|---|---|---|---|
| **D1** | What may be studied before Luna signs it off | (a) everything ships `reviewed:false` as soon as it is drafted; (b) nothing ships until reviewed; (c) hybrid: lexicon entries and generator tables ship provisionally, while sentences, readings, topics and morphology wait for review (≤ 7-day latency) | **(c)**. Words are facts read off the books' own lists, and in August Luna marked all 73 provisional entries Зөв. Sentences carry a 2-6% error rate, and a wrong accepted answer teaches. (b) would put Fred back at the ceiling every week. |
| **D2** | Pace (`dailyNewCap`, already in `P`) | 6 (≈ 22 words/week, ≈ 30-40 min native review/week); 4 (≈ 15/week, ≈ 25 min); 8 | **Keep 6.** Revisit if a review sheet is late twice. Optionally expose it in Settings as 4/6/8, beside word drills (Less text decides the row). |
| **D3** | Spine order | (a) Beginner Part 1 lessons, with Survival can-dos interleaved, then Modern Mongolian; (b) Survival first, which is more practical in UB; (c) Modern Mongolian only | **(a)**. Its lesson-question titles make the clearest path, and it matches the textbooks' shared grammar order. |
| **D4** | `drill:false` for new closed-class words with meanings | drillable (connectives, possessives, question words); `drill:false` like the existing pronouns | **Drillable** for new entries (aligned with Reading's D9). Existing entries unchanged. |
| **D5** | Personal strand (голланд, хадам, Luna's family, Fred's own answers) | include, flagged `personal`, first names only; leave out | **Include.** It is the one thing no app can copy, and Luna's review makes it right. |
| **D6** | Generated drills | answers only from reviewed tables and golden vectors; or offered while pending | **Reviewed only** as answers. Before that, the topic shows as pending, like the 5 grammar topics now. Kept outside FSRS (tally in `P.grammar`). |
| **D7** | How the review is done | sittings by kind (§3.11); word items done together with Fred | **Sittings as §3.11.** Word items may be done together with Fred (useful to him too). No second look: there is one reviewer. |
| **D8** | Sentences that share a pattern | (a) grouped on one card, each still ticked; (b) "frame-reviewed": siblings of a reviewed frame count as reviewed | **(a)**. It halves the time and keeps "every sentence seen by a native speaker". (b) changes what "reviewed" means. Not recommended. |
| **D9** | Copyright policy, and the folk tale | adopt `docs/CONTENT.md` and the overlap gate; the tale retold from its plot by or with Luna, or skipped | **Adopt; retell the tale** (stage C), Luna writing or rewriting each episode. |
| **D10** | Weekday and weekend names | planet names (даваа…) plus бямба/ням, as the lexicon has; the numbered system (нэгдэх өдөр…); хагас сайн / бүтэн сайн өдөр | **Luna decides on sheet L1.** Default: planet names, with the others as accepted alternatives in `alt` and generator `accept` sets. |
| **D11** | Where a unit starts | a card in the lesson (§2.2); a line on Today; only Gamification's path | **The card**, unless Gamification's path screen already announces it. Then drop the card. |
| **D12** | Marking provisional (unreviewed) words | no marker in lessons, count on Progress; a small "unchecked" tag on the deck | **No marker.** Less text on study screens; Progress shows "N words awaiting a check" in Numbers. |
| **D13** | Sheets on Luna's phone | laptop file, as now; a hosted, unlinked, non-precached page on Pages (public URL, holding unreleased content) | **Laptop file**, unless she prefers the phone. Then hosted (same reasoning as Sound's D7). |
| **D14** | Beyond the books (≈ 1,070 → 2,500 words) | decide in spring 2027: Top300 and Peace Corps lists, a Luna-curated frequency list, authentic texts, Let's Read titles once licences are checked | **Decide by March 2027**, when stage B starts, so stage D is drafted before stage C ends. |

---

## 9. Risks and how each is contained

| Risk | Containment |
|---|---|
| **Review falls behind and the ceiling returns** | Words flow provisionally (D1), so lessons never empty. Buffer ≥ 14 days of words. `--status` shows sentence latency, and the next word release pauses past 7 days. Sheets are capped at 30 minutes and roll over. The cap 4 fallback (D2). |
| **The matcher mis-tags as the lexicon grows** (wrong word scheduled, wrong coverage) | F0 lands before any entry. Gold self-test in CI. Retag diff on every release. `forms` and `infl` for short words. Verb and noun suffix classes. |
| **Wrong Mongolian is taught** (provisional words; generated forms) | Words are copied from the books' lists, not invented, and checked by the Cyrillic validator. Generators compose reviewed rows only (D6). Golden vectors fail tests on drift. Rejected words are deleted with ids retired; misspellings are corrected in place. |
| **Copyright exposure on a public site** | Policy (§3.12); the blocking 5-gram overlap gate with its log; original cast; citations; no book text in the repo. |
| **Claude-written Mongolian sounds unnatural** | Luna reviews every sentence, and her "how would you say it" box promotes her phrasing (existing rule). Reuse reviewed constructions. Per-unit rejection rate tracked from return files: if > 15%, slow down and ask Luna to write the unit's triplets herself. |
| **The textbooks' world is not Fred's** | Personal strand (D5); cast stories (§3.7); units reorderable before release. |
| **Tests pinned to corpus size break** (runway test, trajectory) | Updated in the same change (§6.2). The release gate runs the suite. |
| **Rewrites orphan keyed data** (alternatives, tiles, audio, review results) | `sid` everywhere. `release.py` prints orphans. Sound records only reviewed spellings. |
| **PDF extraction defects leak in** (Latin look-alikes, Ү/У, commas as д) | Cyrillic validator; English-Mongolian glossary as the clean source (books-mm2); Luna's sheet. |
| **The path promises what supply cannot keep** | Planned units show no numbers. Live unit counts are fixed at release. Milestones are labelled as projections from measured intake. |
| **Data growth** (`sentences.json` ≈ 1 MB, boot blanks on a bad file) | JSON validity is the first release gate. Smoke test on every release. Split by stage if parse time ever shows. |
| **Fred's weekly session becomes a chore** | The `/next-unit` skill; about 10 minutes of his time; two units can be released at once before a holiday. |
| **The overlap check misses close paraphrase, or flags formulae** | The policy forbids copying, not just 5-grams. Allowlist with reasons. 4-token whole-sentence matches are warnings for Fred to read. |
| **Generated items give away answers by elimination** | Value distractors; accepted sets checked against distractors; seeded per day; 8 items per pass. |

---

## 10. Versus Ling

**Ling's Mongolian course**, per research-competitors:

- one template shared by 60-80 languages;
- vocabulary-led A1-A2, "over 200 lessons" by its own claim;
- review historically random, not spaced;
- few grammar notes;
- reported content errors in less common languages;
- nothing past A2.

**What this engine gives Fred that Ling cannot:**

- **A syllabus to B1 grammar built on his own textbooks.** 28 units follow Beginner Part 1, Survival and Modern Mongolian chapter by chapter, each cited to printed pages. Ling stops where his goal starts.
- **About 1,070 words, ordered for him.** Textbook frequency (the top 100 in his first six weeks), his own life (Luna's family, the Netherlands, the family-visit unit), and a path that says honestly where the books end and stage D begins.
- **Every Mongolian line checked by a native speaker, with provenance.** Ling's Mongolian is unreviewed for him. Here every item says who signed it and which page it was modelled on.
- **Never runs dry.** A measured buffer (≥ 14 days), a weekly release, and a runway he can see. Ling's fixed course ends. This one is fed at his own measured pace.
- **At least two contexts per word, at i+1.** Sentences are written so the selector always has a sentence where exactly one thing is new. That is spacing plus context, where Ling repeats isolated items.
- **Unlimited, correct, rule-generated practice** for numbers, prices, time, days, family relations and dates, built from reviewed tables so no generated form can be wrong. Ling has fixed lessons only.
- **The bridge back to the books.** As the lexicon grows, `--books` tells him which pages of his own textbooks he can now read on paper: 35-52 passages at ≥ 90% after the first 100-150 lemmas (content-fit). No app does this, and it turns his shelf into graded readers.
- **Original writing on his own life.** Reading's cast stories and the "about me" sentences are about Fred, Luna and the cat, reviewed by Luna. Ling's dialogues are the same in every language.
