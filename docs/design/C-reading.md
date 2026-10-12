# C · Reading: baby paragraphs with comprehension questions

Workstream design, 11 Oct 2026. It answers feedback point 3 and is part of the plan to make the app beat Ling.
Status: proposal. Nothing in the repo has been changed.

Conventions in this document:

- **Page citations give the printed page first, then the PDF page.** For example, *MM printed p10-11 (PDF 22-23)*. `tools/alternatives.py` cites PDF indices ("p18" means PDF 18, which is printed p6). Section 6.6 proposes making "printed (PDF)" the house style.
  - MM is Gaunt & Bayarmandakh, *Modern Mongolian: A course book*. Printed page = PDF page − 12.
  - Beg is Nomiin Ger, *Beginner Mongolian Part 1*. Printed page = PDF page − 1.
  - Surv is *Survival Book 023*. Printed page = PDF page − 2.
- **No textbook text is quoted.** Briefs name topic, format and grammar only.

---

## 1. Problem

Fred's words: *"there is no reading material, i am still of the opinion that if you can make 'baby paragraphs' and ask some basic questions to see whether the user understood the text."*

The audit evidence:

- **The app has no connected text anywhere.**
  - `boot()` loads only `words.json`, `sentences.json` and `grammar.json` (`src/ui/app.js:655-660`).
  - A session contains only `deck`, `card` and `sentence` items (`src/core/scheduler.js:169-177`).
  - The tab bar has no place to read (`src/ui/views.js:210-216`).
  - `render()` sends every unknown item kind into the sentence branch (`app.js:208`), so a new kind would crash today (audits-loop "Where reading slots in").
- **The existing sentences cannot be stitched into paragraphs** (content-fit verdict).
  - Grouping the 164 sentences by shared noun yields 15 same-frame lists. They contradict each other: the cat is on the sofa, in the yard and on the floor at once. No referent carries over, and any question can be answered from a single line.
  - The connectives a paragraph needs (бас, харин, тэгээд, дараа нь) are not in the lexicon.
- **The textbooks' own passages are not readable yet, and they cannot be shipped anyway.**
  - The best textbook passage is 77.8% covered by the lexicon (Beg printed 35). None reaches 90% (content-fit `readable_now`).
  - The books are commercial and the app is public on GitHub Pages.
- **New writing fits the current lexicon.** A test paragraph about home, the cat and cooking, run through `tools/coverage.py`'s matcher, was 100% covered (content-fit). The sample in §5.4 was measured the same way in this session: 20 of 20 counted tokens matched.
- **Fred had this feature in June and lost it.** His prototype `mongolian-study_Phase3.html` had a reader with English shown on demand and multiple-choice questions (L1876-1965, samples L377-419). The rewrite never carried it over.
- **Reading is the one feature that adds useful daily work without growing the lexicon.** The i+1 selector runs out of new sentences around day 31-35 (ROADMAP 2b, re-measured in content-fit). Fred has studied for weeks, so he is probably past that point already. New paragraphs recombine words he already has in new contexts.

---

## 2. What Fred will experience

The guiding idea: **reading is the calm last step of the daily lesson**, plus a shelf for rereading. Mongolian is the largest thing on screen. English appears only when he taps for it, and one task is shown per screen.

### 2.1 Today

- **When a lesson is available:** nothing new is shown. The existing *Start →* caption counts the reading's steps in its item total and minutes, because `lessonWorth()` uses `stepCount()` (§6.1).
- **When nothing is due but a passage is ready:** the disabled *Nothing due today* button is joined by one secondary button, **`Read: Our cat →`** (English title, 3-4 words).
- `session.diagnostics.reading = { id, title }` is exposed so the Gamification and Less-text workstreams can show more if they decide to. This workstream adds nothing else to Today.

### 2.2 The reading step inside a lesson (screen R1: the text)

This is the last item of the lesson, after the sentences.

```
[lesson bar ▮▮▮▮▮▮▮▯▯▯  11 / 14  ✕]
READ
Бямба гарагийн өглөө                    ← title, 26px
Saturday morning                         ← its English pair, gloss style
UNREVIEWED                               ← only while reviewed:false (D4)

Өнөөдөр бямба гараг. Сарнай гал тогоонд кофе ууж
байна. Фред цонх цэвэрлэж байна. Манай муур буйдан
дээр унтаж байна. Муур сүүнд дуртай.
  ┌──────────────────────┐
  │ буйдан · sofa/couch  │                ← after one tap on «буйдан»
  └──────────────────────┘
Tap a word for its meaning. Tap it again for the whole sentence.
                                          ← first time on this device only
[ Questions → ]                          ← primary
  Skip                                    ← ghost
```

How it behaves:

1. **The whole paragraph appears at once** in 22px Geologica, line-height 1.6 (D10). No English is shown under any line.
2. **Tap a word.** It gets an ink underline, and a chip opens directly under its sentence with the dictionary form and the English: `буйдан · sofa/couch`.
   - A name shows `Сарнай · name`.
   - A word Fred has not learned yet has a dotted underline before anyone taps it, and its chip carries a mono `NEW` tag.
   - A multi-word entry such as «гал тогоонд» is one tap target and shows `гал тогоо · kitchen`.
   - Tapping a different word moves the chip.
3. **Tap the same word again.** The chip turns into the sentence's English in gloss style ("Our cat is sleeping on the sofa."). A third tap closes it.
   - Only one chip is open at a time.
   - Nothing moves or animates, because the chip is part of the same screen (INSTRUMENT: only what changed moves).
   - Taps are never counted against him.
4. **`Questions →`** (Enter on the laptop) moves to the first question. **`Skip`** leaves the reading, records nothing, and the lesson carries on to its done screen. The passage is offered again next time.

### 2.3 Questions (screen R2), one per screen

```
[lesson bar ▮▮▮▮▮▮▮▮▯▯  12 / 14  ✕]
READ · 1 / 3                     Show text
Where is the cat sleeping?                ← English, 20px
 1  On the sofa
 2  On the bed
 3  In the kitchen
```

How it behaves:

- **Show text** (ghost, top right) expands the same tappable passage above the question. Looking back is allowed and never penalised.
- **Keys 1-3** pick an option. True/false questions show two options, **True** and **False**.
- **Right answer:** a green `CORRECT` panel, then a green **Continue**. That is two words.
- **Wrong answer:** a red `WRONG` panel holding three lines, then a secondary **Continue** (INSTRUMENT's rule for a wrong multiple-choice answer):
  - the right option;
  - the sentence from the text that answers it, in Mongolian, with the words the question hinges on underlined;
  - that sentence's English, in gloss style.

  The point is to show him *where in the text* the answer was. That is the "learning" in a reading mistake. The question is not asked again, because after the answer has been shown a repeat only tests copying (§3.7).
- **From level 3 there is one question in Mongolian** (e.g. «Хэн оройн хоол хийдэг вэ?»).
  - Tapping the question shows its English, using the same tap rule as the text.
  - The options are Mongolian words or phrases taken from the passage. Their English appears beside each option once he has answered. The existing ENG→MGL word card already shows Mongolian options without English before the answer.
- **Order questions** (level 2+, once the Learning-loop tiles exist) say *Put these in order* and give 3-4 English event tiles, then **Check**.

### 2.4 After the last question

- **Inside a lesson:** **Continue** goes on to the lesson's done screen. The done screen gains one row, owned by Gamification/Less-text: `Read · Saturday morning · 2 of 3 right`.
- **From the Read tab:** a small done screen (R3) shows:
  - the title pair and `2 of 3 right`;
  - **Done** (primary);
  - **English** (ghost), which puts every sentence's English under it for a full-translation check;
  - **Read again** (ghost).

### 2.5 The Read tab (the shelf)

```
READ                                   4 READY · 13 LOCKED
┌ NEXT ────────────────────────────────────────────────┐
│ Манай байшин                                [Read →] │
│ Our house                                             │
└───────────────────────────────────────────────────────┘
Бямба гарагийн өглөө   Saturday morning            3/3
Манай байшин           Our house                   NEW
Хүйтэн орой            A cold evening              NEW
Фред монгол хэл сурч…  Fred learns Mongolian       3 TO GO
```

- **The rows** are in ladder order. Each has the Mongolian title, the English title in gloss style and one mono status:
  - `NEW`: ready and not read yet.
  - `2/3`: done, with the first-read score.
  - `N TO GO`: locked. N is the real number of distinct words in it that are not yet solid in his memory.
- **Tapping a `TO GO` row** opens a short list headed **Learn these first**, one `монгол · Mongolian` pair per line. Those words come to him through the normal deck and reviews. The reading never introduces them itself (§3.9).
- **Tapping a done row** rereads it (§2.6).
- **The header counts are real**: they are computed from FSRS state on the day.

### 2.6 Rereading (and later, listening)

- A reread is the same R1 screen with one button, **Done**. There are no questions, because they would test memory of the answers rather than comprehension.
- A reread updates `last` and `reads` (§4.2) but earns nothing (§3.8).
- Once Sarnai's recordings exist (Sound workstream), R1 gains a **▶ Listen** control and a `SARNAI` credit chip (INSTRUMENT "recording credit chip").
  - Listen plays each sentence in turn, with the current one underlined.
  - It never autoplays on a first read (§3.11).

### 2.7 Word budget per screen

"Chrome" means the app's own English. "Content" is Mongolian being taught and its English pair.

| Screen | Steady-state chrome | One-off extra | Content |
|---|---|---|---|
| R1 text | ≤ 6: `READ`, title gloss (2-3), `Questions`, `Skip` (+`UNREVIEWED`) | hint, 11 words, first time on the device | passage 15-80 Mongolian words |
| R2 question | ≤ 5: `READ · 1/3`, `Show text`, plus the question (≤ 10) and options (≤ 4 words each) | — | — |
| Verdict, right | 2: `CORRECT`, `Continue` | — | — |
| Verdict, wrong | 2 + the answer (≤ 4) | — | one sentence pair |
| R3 done (tab) | ≤ 8 | — | title pair |
| Shelf | 4 header + 1 status per row | — | title pairs |
| Today | +0, or +3-4 (`Read: <title> →`) when nothing is due | — | — |

---

## 3. Mechanics

### 3.1 What "known" means

A token is **known** when `isKnown(id)` holds, using *exactly* the scheduler's definition:

- either the word is `drill:false`,
- or its FSRS recall probability today is at least `KNOWN_R = 0.80` (`scheduler.js:16, 52`).

To guarantee the sentence phase and the reader can never disagree, `buildSession()`'s inline memory picture becomes an exported `memory(p, words, opts)`. Both modules call it (§6.1).

- *Justification:* "numbers are real". The comprehensibility figure Fred already sees on Today and the reader's unlock rule have to be the same measurement.

### 3.2 Coverage and unlock

Definitions:

- **Counted tokens:** every whitespace token of every sentence, except names.
- **Coverage:** known counted tokens ÷ counted tokens. It is counted per running token, not per distinct word, as in Hu & Nation.
- A multi-word entry such as «гал тогоонд» counts as its two tokens.

A passage is **ready** when all of these hold:

1. it is not `partial` and not `retired`;
2. coverage ≥ **0.95**;
3. there are **at most 3 distinct unknown words**, which caps long passages;
4. every question's hinge words (`q.ids`) are known, so questions measure comprehension of known words rather than a gloss lookup;
5. if it is a retell, its source passage has been completed.

`N TO GO` = the number of distinct unknown ids, names excluded.

Authoring target: **98%**. At its intended place in the ladder, a passage should have at most 1 unknown token per 50 counted tokens. `coverage.py --readings` reports projected coverage (the lexicon minus each passage's declared `introduces`), and the pack's mean must be ≥ 98% (§6.3).

- *Justification:* Hu & Nation (2000) put adequate unassisted comprehension at about 98% and the minimum at 95%. Laufer & Ravenhorst-Kalovski (2010) agree. Schmitt, Jiang & Grabe (2011) find no cliff, only a slope (research-science 3a; research-competitors "Reading coverage threshold").
- Our reader is *assisted* reading, since every word can be glossed, so the gate sits at the minimum and authoring aims at the optimum.

A completed passage always stays rereadable, whatever today's coverage is.

### 3.3 The length ladder

| Level | Counted tokens | Sentences | Grammar band | Questions |
|---|---|---|---|---|
| L1 | 15-30 | 3-5 | zero copula, `-ж байна`, locative `-д/-т`, `дээр`, `-нд дуртай` | 2-3 |
| L2 | 30-45 | 4-6 | + habitual `-даг`, contrast (харин), `X Y хоёр`, first `-сан` on one verb | 3 |
| L3 | 45-60 | 5-7 | + future `-на`, sequence (дараа нь), direction `-руу`, one Mongolian question | 3-4 |
| L4 | 60-80 | 6-9 | + past `-сан` narrative, retells | 3-4 |

- *Justification:* Survival's own reading ladder runs 29-71 words, each text with 4-10 questions (Surv p17-98).
  - Fred's Phase3 samples were 15-20 words.
  - Beginner's passages run 55-120 words.
  - LingQ Mini Stories run roughly 20-60 words per part (competitors).
- Starting below the textbooks keeps the first passages short enough to finish inside a lesson.
- Level 4 sits about where Beginner's shortest passages begin (Beg printed 107-108). From there, Content-engine lexicon growth hands over to textbook-modelled packs.

### 3.4 Which passage, and when

`pickReading(p, readings, mem, today)` works as follows:

1. If any `p.readings[*].last === today`, return `null`. That gives one reading per day inside lessons. A passage read from the tab counts.
2. The candidates are passages that are **ready** (§3.2) and **unread** (no `p.readings[id]`).
3. Return the one with the lowest `order`, or `null`.

`buildSession(p, words, sentences, { readings })` appends `{ kind: 'reading', passage }` as **the last item**, after the sentences. Without `opts.readings` its output is byte-for-byte what it is today, so every existing test and simulation is unaffected.

Rereads are offered **only from the Read tab** until audio exists.

- *Justification:*
  - Reading consolidates words already retrieved rather than introducing them, so it comes after the retrieval work (research-science 3a: "Reading is for consolidation and fluency, not for introducing words").
  - One short passage a day is sustainable. It keeps the session about 1.5-2 minutes longer, which is visible in the minutes estimate.
  - Repeated reading pays off mainly with audio, in rate and decoding (3a, Taguchi/Gorsuch). That is why rereads are not pushed into lessons before Sarnai records.
- **Interface with the Learning loop:** retries it splices into the session go *before* the reading item. The reading stays last.

### 3.5 Glosses and translation

- **One tap** shows the word's English beside its sentence. **A second tap** on the same word shows the sentence's English. The **full translation** is offered only after the questions (R3 *English*), or line by line through second taps.
- *Justification:*
  - L1 (English) glosses beat target-language glosses for word learning. Glossed reading beat unglossed, 45% vs 27% immediately (Yanagisawa, Webb & Uchihara 2020, research-science 3b).
  - A gloss next to its word avoids split attention (research-science 6, Ginns 2006).
  - Hiding the full translation keeps the questions a test of reading rather than of an English paragraph sitting on screen (3b; competitors' Duostories hints hidden behind a button).
- This deviates from the current rule that `gl()`/`gli()` render content pairs unconditionally. Fred decides this as **D3**.

### 3.6 Questions: kinds, count, validity

Kinds:

| Kind | Shows | Answer | From |
|---|---|---|---|
| `tf` | an English statement | True / False | L1 |
| `mc` | an English question, 2-3 English options | one index | L1 |
| `order` | *Put these in order*, 3-4 English event tiles | the authored order | L2+, needs Learning-loop tiles; skipped until then |
| `mnmc` | a Mongolian question (English on tap), 3 Mongolian options from the passage | one index | L3+ |

Counts: 2-3 questions at L1, 3 at L2, 3-4 at L3-L4, never more than 4. A retell gets 2.

Order and display:

- Questions come **after** the text, never before.
- Option order is shuffled with a seed on `q.id` (`hashSeed`/`makeRng` from `core/choices.js`), so it is stable on every render.

Validity rules. Tests enforce the first group (§6.4):

- Every hinge id in `q.ids` appears in the sentences listed in `q.lines`.
- Options are unique, ignoring case.
- 2 ≤ options ≤ 4; `answer` is in range; `tf.answer` is a boolean.
- No option repeats the question.
- Across a pack, "True" is the right answer for 35-65% of `tf` questions.
- At least one question per passage hinges on a line in the second half of the text.

Authoring rules (reviewed by Fred, §5.2):

- Distractors come from the passage itself or from the same set as the answer (other rooms, other people, other foods).
- No question can be answered from world knowledge alone. If cats "obviously" like fish, then fish is a *distractor* and the text says milk.

*Justification:*

- Questions after reading give a testing effect on what they ask and some spillover.
- Questions before reading help only the content they target: g = 0.54 targeted vs g = 0.04 general (research-science 3b).
- English questions at A1 test comprehension of the Mongolian, not of the question (3b).
- Mongolian question words (хэн/хаана/юу) arrive at L3, matching the TPRS "circling" pattern of LingQ Mini Stories (competitors) and the Mongolian question sets in Surv p17-98 and MM printed p10-11.

### 3.7 Grading: ungraded exposure for FSRS, a real tally for the passage (decision)

**Reading never calls `applyGrade()`.** It creates no `P.items` entries and changes no stability, due date, reps or `introduced`. Each question still carries `ids`, the words it hinges on. They are used for the wrong-answer evidence, the validity tests and the unlock rule. They also leave open a later switch to per-word grading (D2), which would be a code change rather than a content change.

Why not grade the hinge words:

1. **An English multiple-choice question about a paragraph is weak evidence of one word's recall.**
   - The guess rate is 33-50%.
   - Inference from the rest of the sentence or from world knowledge can carry the answer.
   - A misread *question* would cost a known word a lapse. FSRS Again roughly ×0.29 of stability on a same-day review and a forget-stability reset otherwise (research-science 1b).
   - A lucky guess would inflate stability.
2. **It cannot coexist cleanly with "one grade per word per session".**
   - The passage is picked *because* its words were just practised.
   - A day guard (`items[id].last !== today`, audits-plat) would exclude exactly those words and grade the rest, which makes the grade depend on what else happened today rather than on the answer.
3. **The research says the same.** "Questions test comprehension, so they should not be FSRS-graded" (research-science 3b). audits-loop proposes a separate tally, following the grammar pattern.

What *is* recorded is a per-passage tally of first-read answers (§4.2) and XP (§3.8). Both are traceable to answered questions.

**Reading questions are not part of the Learning loop's retry loop.** Re-asking a question whose answer has just been shown tests copying (research-science 1a pitfall on immediate re-asks).

### 3.8 XP and the tally

- **XP is earned on the first read only**, when the whole question set has been answered: `xpForReading(right, wrong) = 3·(right + wrong) + 3·right`. That is the same scale per question as `xpForGrammar()`: base 3, bonus 3 (`goals.js:253-258`). A 3-question passage is worth 9-18 XP, about one word card.
- **Rereads earn 0** and ask no questions.
- **The record is committed atomically at the end of the question set**, like `finish()`. An abandoned reading records nothing and is offered again in full.
- **Inside a lesson** the XP also goes into `S.summary.xp`, so it lands in that day's history row through `recordDay()`. From the Read tab it moves `P.xp` only, exactly as grammar practice does (`app.js:401-409`).
- **A reading done only from the tab does not make a study day** (D5). INSTRUMENT: "A streak day requires a *finished* session."
- **Interface with Gamification:** that workstream owns the final XP constants and whether reading has milestones. This design guarantees that every reading figure comes from an answered question or a completed read.

### 3.9 New words and recycling

- **A passage may contain at most 3 distinct unknown words** (§3.2), and only words that **already exist in `words.json`**.
  - A token the lexicon does not know makes the passage `partial`, and a partial passage never unlocks.
  - Words new to the lexicon are added by the Content-engine workstream, `reviewed:false`, and reach Fred through the normal deck.
- **`introduces: [ids]`** marks where a word first appears in the ladder.
  - In that passage the word occurs **once**.
  - It recurs in **at least two later passages**, so the reading itself does the recycling.
- *Justification:*
  - Incidental learning from reading is slow, and most new words are not learned from a single exposure (Brown, Waring & Donkaewbua 2008).
  - Repeated encounters do the consolidating (research-science 3a).
  - Gardner found that a shared theme alone recycles less vocabulary than assumed. Recycling has to be deliberate, which is what `introduces` and the brief-level recycle lists enforce.

### 3.10 The retell variant (LingQ style)

- A retell is its own passage with `retellOf: "<id>"`. It unlocks only after its source is completed.
- It tells the same events from another person's view, for example Sarnai in the first person. It can also use another tense.
- It is **always authored and reviewed, never generated**. CLAUDE.md: never permute or transform Mongolian automatically.
- It has 2 questions about what is the same and what is different.
- *Justification:* LingQ Mini Stories use story → same story retold from another perspective, person or tense → questions (competitors). The retell recycles the same structures with one grammatical change, a morphology drill hidden in a story.
- Pack 1 has one retell pair (r016 → r017), to test the format before committing to more.

### 3.11 Audio rule (for later)

- **First read: no autoplay, ever.** Audio is offered on demand and on rereads. *Justification:* identical speech played alongside the text hurt beginners' foreign-language reading comprehension (Diao & Sweller 2007, research-science 3b). Reading while listening helps on *repeated* reading (3a).
- **No sound effects on the text screen.** Question verdicts may use the Sound workstream's right/wrong cues, the same as any multiple-choice answer. Irrelevant sound during learning hurts (Moreno & Mayer 2000, research-science 4).

### 3.12 Edge cases

| Case | Behaviour |
|---|---|
| Fred skips the reading | Nothing is recorded. `last` is not set, so a later lesson that day may offer it again. |
| Fred abandons mid-questions | Nothing is recorded. Next time the passage restarts from the text. |
| Words decay and a ready passage locks again | Unread passages show `N TO GO`. Read ones stay rereadable. |
| Another device completed the same passage meanwhile (sync `adopt()`) | `completeReading()` finds a record, so this counts as a reread: no XP, `reads + 1`. |
| A passage is edited after Fred read it | The record stays (ids are permanent). The `reviewedHash` test forces re-review (§4.1). |
| A passage is withdrawn | Set `retired: true` and keep it in the file. It is hidden from shelf and pick, and its record survives. An id is never reused. |
| A word in `w` leaves `words.json` | The test fails. At runtime an unknown id counts as not known, so the passage locks. |
| `readings.json` fails to load | `READINGS = []`. The app still opens (§6.2). |
| Two lessons in one day | The reading is in the first only (§3.4 rule 1). |
| A passage contains a token the matcher cannot resolve | `partial: true`. It never unlocks and the test lists it. |

---

## 4. Data & state

### 4.1 `src/data/readings.json`

An array of passages. Field rules:

```json
{
  "id": "r001",
  "order": 10,
  "pack": "home-1",
  "level": 1,
  "title": { "mn": "Бямба гарагийн өглөө", "en": "Saturday morning" },
  "names": ["Сарнай", "Фред"],
  "grammar": ["-ж байна", "locative -нд", "-нд дуртай"],
  "introduces": [],
  "source": "Modelled on MM ch.2 reading + Q&A, printed p10-11 (PDF 22-23): format of a who-is-doing-what paragraph followed by short wh-/yes-no questions. Original text.",
  "reviewed": false,
  "sentences": [
    { "mn": "Өнөөдөр бямба гараг.", "en": "Today is Saturday.", "w": [227, 240, 239] },
    { "mn": "Сарнай гал тогоонд кофе ууж байна.", "en": "Sarnai is drinking coffee in the kitchen.",
      "w": [0, 233, 233, 154, 259, 201] }
  ],
  "questions": [
    { "id": "r001q1", "kind": "tf", "q": "Sarnai is cleaning the window.", "answer": false,
      "ids": [132], "lines": [2] }
  ]
}
```

| Field | Rule |
|---|---|
| `id` | `/^r\d{3,}$/`. Permanent and never reused. It keys `P.readings`, so it must survive every rewrite (sentences.json has no ids, and Luna's rewrites replaced `mn` in place, as audits-plat notes). |
| `order` | An integer, in gaps of 10 so passages can be inserted. Ladder position. |
| `pack`, `level` | The pack slug; level 1-4 (§3.3). |
| `title` | `{mn, en}`: content pair. Not counted in coverage. |
| `names` | Base forms. A token equal to a name, or to a name plus a listed suffix (`Сарнайн`, `Фредтэй`), is a name: `w` holds `0` and it is excluded from coverage. |
| `grammar` | English/metalanguage tags. Used by Content engine and Gamification to map passages onto units. Never displayed. |
| `introduces` | Lexicon ids first used here (§3.9). |
| `source` | A citation in the form "Modelled on <book>, <section>, printed pX (PDF pY): <what was borrowed>. Original text." It must contain "Original text." |
| `reviewed` | A boolean. `false` until Luna or Sarnai sign off. |
| `reviewedHash` | Present only when `reviewed:true`. It is `hashSeed(reviewText(passage))`, FNV-1a 32-bit as in `choices.js:35-42`. If the Mongolian is edited after sign-off, the test fails until the passage is re-reviewed or set back to `reviewed:false`. |
| `partial` | `true` if any token is unresolved (`w` contains `null`). Never ready. Written only by the tool. |
| `retellOf`, `retired` | Optional (§3.10, §3.12). |
| `sentences[].mn/en` | One sentence each. `en` is its English pair. |
| `sentences[].w` | **One entry per whitespace token of `mn`**, aligned left to right. The value is a lexicon id, `0` for a name, or `null` for unmatched. A multi-word entry repeats its id across its tokens, and the UI groups adjacent tokens with the same id into one tap target. Written by `coverage.py --readings --apply-tags`. Hand fixes survive because `--check` reports any difference instead of overwriting (§6.3). |
| `sentences[].who` | Optional speaker name for dialogues. Rendered as a small label and not part of `mn`. |
| `sentences[].audio` | Reserved for the Sound workstream (content-hashed file and credit). Absent in pack 1. |
| `questions[].id` | `${passageId}q${n}`. Permanent. |
| `questions[].kind` | `tf`, `mc`, `order` or `mnmc` (§3.6). `q` is English text, or `{mn, en}` for `mnmc`. `options` are strings (`mc`) or `{mn, en}` (`mnmc`). `items` holds the correct order for `order`. |
| `questions[].ids`, `lines` | Hinge word ids, and the indexes of the sentences that answer the question. |

Why `w` instead of the `ids` set that `sentences.json` carries: tap-to-gloss needs token→word alignment, and coverage per running token needs repeat counts. The set is derived at runtime (`readingIds()`). `w` is stored rather than computed in the browser so that the browser needs no JavaScript port of the Python stem matcher.

The file size is about 2.5 KB per passage, so about 45 KB for pack 1. It is precached automatically, because `build.py` copies `src/data/*` and every file in `dist/` goes into the service-worker asset list (audits-plat).

### 4.2 Progress: one new synced field

`blank()` in `src/core/progress.js` gains one field:

```js
// Reading passages (src/data/readings.json), keyed by passage id. Not FSRS:
// a read is exposure, the questions are a comprehension tally. See core/readings.js.
readings: {}
```

A record looks like this:

```js
P.readings.r001 = {
  first: '2026-10-20',   // day the questions were first completed
  last:  '2026-10-24',   // day of the most recent completed read (first read or reread)
  reads: 2,              // completed reads, first read included
  right: 2, wrong: 1     // first-read answers only; never changed by a reread
}
```

- It lives in `main` (synced): `toDocs()` puts every unknown top-level field there (`sync.js:85-86`).
- **It is a map, never an array.** Arrays travel whole and last-writer-wins (audits-plat).
- **No new Firestore document**, so Fred does not have to paste new rules.
- Size: 5 entries per passage, so 200 passages is about 1,000 entries in `main`. That is far below the 40k limit.

### 4.3 Sync: merge and rebase rules

**`mergeStates()`** is used at first sign-in. Without a rule, the copy studied more recently would win whole and the other device's records would be deleted online by the join batch (`sync.js:252`, engine `join`). The rule is per passage and keeps the whole record, like grammar's `moreAttempts`:

```js
const reads = r => r.reads || 0;
const moreReads = (x, y) =>
  reads(x) !== reads(y) ? (reads(x) > reads(y) ? x : y)
    : (x.last || '') > (y.last || '') ? x : y;
out.readings = { ...(b.readings || {}) };
for (const [id, r] of Object.entries(a.readings || {}))
  out.readings[id] = out.readings[id] ? moreReads(r, out.readings[id]) : r;
```

**`rebase()`** handles changes made offline. Diffs of a new record produce leaf operations (`main.readings.r001.first`, …), because `diff()` recurses into new maps.

| Path | Rule | Addition to |
|---|---|---|
| `main.readings.*.reads`, `.right`, `.wrong` | counter: this device's gain is added to the server's figure | `isCounter` |
| `main.readings.*.last` | the later date | `isLatest` |
| `main.readings.*.first` | the earlier date | `isEarliest` (extended to path length 4) |

- If two devices both first-read the same passage offline, both answer sets count. Both happened, and the XP of each is real.
- A completed reading produces operations **only** under `main.readings.<id>.*` and `main.xp`. It never touches `items-N`, so the test asserting that a grade sends exactly 2 operations (test.html:925) is untouched.
- **Old builds** (an iPhone app that has not reloaded) pass `readings` through untouched: `normalise()` and `fromDocs()` keep unknown fields, and `toDocs()` puts them in `main`.
- The one gap is an old build performing a *first sign-in merge*, which would take `readings` whole from one side. Both of Fred's devices are already signed in. A new version reloads itself when idle (`app.js:690-708`).

### 4.4 Device-local and session-only state

- **Device-local** (`localStorage['${KEY}:prefs']`, try/catch, shared with the Sound workstream's mute flag): `{ seen: { readTap: 1 } }`.
  - This means the R1 hint was shown once on this device.
  - It is not synced and not in the backup code.
  - It is namespaced by `KEY`, so `?fake-sync` copies stay isolated.
  - If the Less-text workstream lands a general "seen" mechanism, use that instead.
- **Session-only** (`S` in app.js):

```js
S.rd = {
  passage, mode: 'first' | 'reread', inLesson: true | false,
  step: 'text' | 'q' | 'done',
  qi: 0,              // current question
  picked: null,       // option chosen on this question (display index)
  answers: [],        // first-attempt booleans, committed at the end
  tap: null,          // { t: tokenIndex, level: 1 | 2 }  word gloss → sentence English
  showText: false,    // R2: passage expanded
  showEn: false,      // R3: full translation shown
  build: []           // order questions: tapped tile indices (Learning-loop tiles)
}
```

`S.screen === 'read'` is the Read-tab reader. Inside a lesson the reader runs within `S.screen === 'run'` as the `reading` item. `quiet()` already returns false for both, so sync redraws wait until the reading is over.

### 4.5 Backup-code safety

- A **v1 code** goes through `migrateV1()` → `blank()` and gets `readings: {}`.
- A **pre-reading v2 code** goes through `Object.assign(blank(), raw)` and gets `readings: {}`.
- A **populated code** round-trips `readings` intact.
- Nothing is removed or renamed. `sentSkill` and `gloss` stay as they are.
- `importCode()` still *replaces*, so `readings` is replaced along with everything else. That matches CLAUDE.md.

Tests for all of this are in §6.4.

---

## 5. Content

### 5.1 Characters and setting

- **Recurring cast:**
  - **Fred** («Фред»): learning Mongolian, cleans windows, reads, plants trees.
  - **Sarnai** («Сарнай»): coffee, garden, takes the cat to the vet.
  - **The cat** («муур», «манай муур»): sleeps on things it should not, likes milk.
  - **Sarnai's mother and father** («Сарнайн ээж аав»): visit for dinner.
  - **Their home:** «байшин», then «гэр» once it is in the lexicon. It has a living room, kitchen, balcony and garden.
- This is Fred's real life, as the Booklet's themes already reflect (house, chores, food, cat, books, garden). The lexicon was built for exactly this world, which is why the passages fit it.
- Names are first names only, with no places, workplaces or surnames. The file is public (D8).
- Later packs bring in the textbooks' worlds (people, jobs, Ulaanbaatar, the countryside and the folk tale) as the Content engine adds their vocabulary (§5.8).

### 5.2 Authoring rules

These apply to every pack.

1. **Original text only.** Each passage follows a cited page's *topic, format or grammar point*, never its sentences. Before committing, `coverage.py --readings --overlap <textbook text dir>` runs locally and must report no 5-token run shared with any extracted textbook. The textbook text never enters the repo.
2. **Lexicon first.** Every token must resolve (`partial` never ships). At most 3 distinct unknown words, and each new word is used once where `introduces` marks it (§3.9).
3. **Prefer constructions already reviewed.** Reuse phrasings from `sentences.json`, especially Luna's own rewrites (e.g. «эмнэлэгрүү авч яв»), over new constructions.
4. **Stay inside what the matcher can parse** until the Content engine extends it:
   - No forms of «байх» (байсан, байгаа).
   - No stacked suffixes such as reflexive after an n-stem (байшингаа) or comitative + reflexive (ээжтэйгээ).
   - Use «Х Y хоёр» rather than тэд/бид.
   - These were checked in this session against `stem_match()`: байшингаа and байсан are unmatched, while авсан, иднэ, хүсэхгүй, модонд, эмнэлэгрүү, тоглосон and уусан resolve.
5. **Never permute word order to make a variant.** Every sentence is written whole (CLAUDE.md, MM printed p6 / PDF 18).
6. **Questions:** follow §3.6. Distractors come from the text or the answer's own set, and there must be no world-knowledge giveaways. The English questions are **Fred's** to check, as a native speaker; Luna's job is the Mongolian.
7. **Present tense, then habitual, then future, then past**, in that order up the ladder. This is the order the textbooks teach them: Beg L4 → L5 → L6 → L7, printed 34-100; MM ch.1 -на, ch.4 -даг, ch.5 -сан, printed 4-46.

### 5.3 The first pack (`home-1`): 18 briefs

Each brief gives the cast, the grammar target, the lexicon it leans on (ids), new words, size, questions and the textbook page it is modelled on.

- Totals: about 710 counted tokens, 58 questions, 11 new lexicon entries.
- r001 is written in full (§5.4). The other 17 are briefs only.

**Level 1**

**r001 · Saturday morning** («Бямба гарагийн өглөө»), order 10. Written in §5.4.
- Cast: Fred, Sarnai, the cat.
- Grammar: `-ж байна`; locative `-нд`; `-нд дуртай`.
- Lexicon: өнөөдөр 227, бямба 240, гараг 239, гал тогоо 233, кофе 154, уух 259, цонх цэвэрлэх 132, манай 212, муур 161, буйдан 99, дээр 213, унтах 257, сүү 152, дуртай 256, байна 201.
- New: none. Size: 20 tokens + 2 names.
- Questions: `tf` (who cleans the window), `mc` (where the cat sleeps), `mc` (what the cat likes).
- Model: MM ch.2 reading + its Q&A block, printed p10-11 (PDF 22-23): a who-is-doing-what paragraph followed by short questions. Present continuous as in Beg L4, printed 35-36.

**r002 · Our house** («Манай байшин»), order 20.
- Cast: the narrator voice.
- Grammar: noun + adjective as predicate with zero copula («байшин том»). It deliberately contrasts with adjective-before-noun, the never-permute lesson of MM printed p6 (PDF 18).
- Lexicon: манай 212, байшин 234, том 195, зочны өрөө 232, дулаан 113, гал тогоо 233, жижиг 196, цонх 235, шинэ 197, хаалга 90, хуучин 198, цэцэрлэг 181, гоё 199.
- New: none. Size: about 18 tokens.
- Questions: `tf` "The kitchen is big." (F); `mc` "What is old?" (the door / the windows / the sofa).
- Model: MM ch.1 text, printed p1 (PDF 13): first-person description of one's flat and room. Topic and predicate-adjective grammar only.

**r003 · Where are you?** («Чи хаана байна?»), order 30. A baby dialogue with `who` labels.
- Cast: Sarnai calls across the house; Fred answers.
- Grammar: би/чи; хаана/юу questions; вэ dropped after байна (Beg L5 rule, printed 52); `-ж байна`.
- Lexicon: чи 204, би 203, хаана 218, юу 220, гал тогоо 233, хоол хийх 129, оройн хоол 144, муур 161, энд 217, загас 146, идэх 258.
- New: none. Size: about 26 tokens.
- Questions: `mc` "Where is Fred?" (kitchen / garden / living room); `mc` "What is the cat eating?" (fish / meat / bread).
- Model: Beg L4 phone check-in dialogue, printed 35, and the L5 where-are-you dialogue, printed 49. The format is short what-are-you-doing / where-are-you turns.

**r004 · Where is the cat?** («Муур хаана байна?»), order 40.
- Cast: the cat, Sarnai.
- Grammar: locative `-нд`; «ширээн дээр»; accusative «муурыг» (grammar topic `g_accusative`); habitual `-даг` once.
- Lexicon: муур 161, хаана 218, одоо 226, өглөө 237, хивс 104, гал тогоо 233, ширээ 96, дээр 213, муу 194, шал 91, тавих 269, унтах 257.
- New: none. Size: about 24 tokens.
- Questions: `mc` "Where is the cat now?" (on the table / on the carpet / in the garden); `tf` "Sarnai puts the cat on the floor." (T).
- Note: one line plays on муу/муур ("bad cat") as a read-carefully moment. Luna confirms it is natural or cuts it.
- Model: Beg L5 «байна» + dative-locative for where things are, printed 49-51.

**r005 · The cat's breakfast** («Муурын өглөөний хоол»), order 50.
- Cast: Sarnai, Fred, the cat.
- Grammar: habitual `-даг` (`g_habitual`); бүр "every"; dative recipient «мууранд».
- Lexicon: өглөө 237, бүр 224, муур 161, хоол өгөх 169, загас 146, идэх 258, цай 153, кофе 154, уух 259, сүү 152.
- New: **бас** "also" (once).
- Size: about 26 tokens.
- Questions: `mc` "Who drinks coffee?" (Sarnai / Fred / the cat); `tf` "The cat eats meat." (F).
- Model: MM ch.4 herder's daily routine in the habitual, printed p32 (PDF 44). Fred's own Phase3 "The cat" sample is a starting draft, since it is his prototype and not a textbook.

**Level 2**

**r006 · Laundry day** («Хувцас угаах өдөр»), order 60.
- Cast: Fred, Sarnai, the cat.
- Grammar: compound chore verbs in `-ж байна`; хуурай/нойтон; «Фред Сарнай хоёр» "Fred and Sarnai".
- Lexicon: бямба 240, байшин 234, хувцас угаах 127, аяга угаах 123, угаалгын машин 109, хувцас 249, нойтон 140, хуурай 139, муур 161, дээр 213, унтах 257.
- New: **хоёр** "two; X Y хоёр = X and Y" (once).
- Size: about 32 tokens.
- Questions: `tf` "Sarnai is doing the laundry." (F); `mc` "Where is the cat sleeping?" (on the dry clothes / on the wet clothes / in the washing machine); `mc` "What is Sarnai doing?" (washing the dishes / ironing / mopping).
- Model: MM ch.3 text, printed p21 (PDF 33), for the «аав ээж хоёр» construction. Beg L6 chore-verb set, printed 64 (table 66-67), for the topic.

**r007 · Fred's morning** («Фредийн өглөө»), order 70.
- Cast: Fred narrating in the first person («би»).
- Grammar: habitual `-даг` in the first person; sequencing with «дараа нь».
- Lexicon: өглөө 237, бүр 224, би 203, цай 153, уух 259, өглөөний хоол 142, талх 150, өндөг 151, идэх 258, ном 171, унших 172, муур 161, буйдан 99, дээр 213, унтах 257.
- New: **дараа нь** "after that, then" (phrase entry; once).
- Size: about 34 tokens.
- Questions: `mc` "What does Fred eat for breakfast?" (bread and eggs / fish / rice); `tf` "Fred drinks coffee in the morning." (F); `order` (tea → breakfast → book), which ships with tiles.
- Model: MM ch.4 routine, printed p32, and its personal questions, printed p40 (PDF 52). Fred's Phase3 "My morning" sample is a starting draft.

**r008 · Sarnai's garden** («Сарнайн цэцэрлэг»), order 80.
- Cast: Sarnai, Fred, the cat.
- Grammar: dative + дуртай («цэцэгт», «модонд»); contrast with харин; habitual vs right now (`-даг` vs `-ж байна`).
- Lexicon: цэцэрлэг 181, цэцэг 182, мод 184, дуртай 256, орой 238, бүр 224, ургамал 183, усалах 188, тарих 189, одоо 226, муур 161, зүлэг 192, тоглох 165.
- New: **харин** "but, whereas" (once).
- Size: about 36 tokens.
- Questions: `mc` "What does Sarnai like?" (flowers / trees / grass); `mc` "What is Fred doing now?" (planting a tree / watering plants / reading); `tf` "The cat is playing on the lawn." (T).
- Model: Surv L6 dative + дуртай with the харин contrast (grammar p47-50; the likes/dislikes passage format p55). Garden vocabulary as in Fred's own Booklet, days 14-15.

**r009 · A cold evening** («Хүйтэн орой»), order 90.
- Cast: Fred, Sarnai, the cat.
- Grammar: contrasting adjective predicates (хүйтэн/дулаан); `-ж байна`; хамтдаа.
- Lexicon: орой 238, тагт 120, зочны өрөө 232, дулаан 113, хамтдаа 229, буйдан 99, цай 153, уух 259, муур 161, хөнжил 103, дээр 213, унтах 257, ном 171, унших 172, чийдэн 106.
- New: **хүйтэн** "cold" (once in the text; the title is not counted).
- Size: about 34 tokens.
- Questions: `tf` "The balcony is warm." (F); `mc` "Where is the cat sleeping?" (on the blanket / on the balcony / on the carpet); `mc` "What are Fred and Sarnai drinking?" (tea / coffee / milk).
- Model: Beg L8 evening-at-home passage, printed 107-108 (PDF 108-109): cold and dark outside, warm and bright inside, with yes/no questions. It is the closest textbook template to a baby paragraph.

**r010 · The new lamp** («Шинэ чийдэн»), order 100.
- Cast: Fred, Sarnai.
- Grammar: `-тай` "having" («гэрэлтэй», grammar topic `g_tai`); the first past `-сан` on one verb («авсан»); шинэ/хуучин.
- Lexicon: зочны өрөө 232, хуучин 198, чийдэн 106, муу 194, шинэ 197, авах 263, одоо 226, өрөө 231, гэрэл 114, гоё 199, дуртай 256.
- New: none. Size: about 30 tokens.
- Questions: `mc` "What did Fred buy?" (a lamp / a mirror / a rug); `tf` "The old lamp was good." (F); `mc` "What is the room like now?" (bright / dark / cold).
- Model: Beg L2 `-тай/-гүй`, printed 11-13, and the L10 apartment-viewing passage's "what is good / not good in a room" questions, printed 133-134.

**Level 3**

**r011 · Tonight** («Өнөө орой»), order 110.
- Cast: Fred, Sarnai; Sarnai's parents are coming; the cat.
- Grammar: future `-на` for plans; chores in the future; хоёр recycled.
- Lexicon: өнөө 228, орой 238, ээж 245, аав 246, манай 212, байшин 234, оройн хоол 144, идэх 258, шал арчих 124, тоос сорох 125, хог хаях 130, хоол хийх 129, муур 161.
- New: none. Size: about 45 tokens.
- Questions:
  - `mc` "Who is coming to dinner?" (Sarnai's parents / Fred's parents / a friend);
  - `mc` "What will Fred do?" (mop the floor / vacuum / cook);
  - `tf` about who cooks;
  - `mnmc` «Хэн тоос сорох вэ?» (Сарнай / Фред / ээж).
- Model: Beg L7 weekend-plans dialogue, printed 83, for plans in `-на`; MM ch.1 present/future `-на`, printed p4-5 (PDF 16-17).

**r012 · Sunday at home** («Ням гараг»), order 120.
- Cast: Fred, Sarnai, the cat.
- Grammar: morning → day → evening sequence with дараа нь; habitual; хамтдаа.
- Lexicon: ням 241, гараг 239, өглөө 237, өдөр 236, орой 238, хамтдаа 229, өглөөний хоол 142, цэцэрлэг 181, ургамал 183, усалах 188, ном 171, унших 172, оройн хоол 144, хийх 267, муур 161, буйдан 99, унтах 257.
- New: none. It recycles хоёр, бас, дараа нь, and хүйтэн once.
- Size: about 52 tokens.
- Questions:
  - `order` (breakfast → garden → dinner), with tiles;
  - `mc` "What do they do in the afternoon?";
  - `tf` about where the cat sleeps;
  - `mnmc` «Хэн оройн хоол хийдэг вэ?».
- Model: Beg L6 Saturday narrative, printed 77-78 (PDF 78-79), for its order-of-events shape, told here in the habitual present; MM ch.4 routine, printed p32.

**r013 · At the library** («Номын санд»), order 130.
- Cast: Fred, Sarnai.
- Grammar: «бямба гараг бүр» "every Saturday"; dative of destination; `-нд дуртай`; бас/харин recycled.
- Lexicon: бямба 240, гараг 239, бүр 224, номын сан 176, явах 268, ном 171, дуртай 256, шинэ 197, авах 263, урт 252, түүх 174, зохиолч 175, унших 172, орой 238.
- New: **их** "very, a lot" («их дуртай»; once).
- Size: about 48 tokens.
- Questions: `mc` "When does Fred go to the library?" (every Saturday / every morning / on Sundays); `tf` "The new book is short." (F); `mc` "What does Sarnai do in the evening?" (she reads too / she writes / she cooks).
- Model: the setting of MM's library-and-books chapters (printed p72-92). Theme only. Format from Surv p55: likes X, also Y, but Z.

**r014 · Sarnai's parents** («Сарнайн ээж аав»), order 140.
- Cast: Sarnai's mother and father, Fred, Sarnai, the cat.
- Grammar: genitive with a name («Сарнайн»); parallel actions in `-ж байна`; rooms in the locative; хамтдаа.
- Lexicon: ээж 245, аав 246, өнөөдөр 227, манай 212, гал тогоо 233, хоол хийх 129, зочны өрөө 232, ярих 270, ширээ 96, хамтдаа 229, оройн хоол 144, идэх 258, цай 153, уух 259, сайхан 200, муур 161.
- New: **гэр** "home" («манай гэрт»; once).
- Size: about 55 tokens.
- Questions:
  - `mc` "Who is cooking?" (Sarnai's mother / Sarnai / Fred);
  - `mc` "Where are Fred and Sarnai's father talking?";
  - `tf` "Everyone eats dinner together." (T);
  - `mnmc` «Сарнайн ээж хаана байна вэ?» (гал тогоонд / зочны өрөөнд / цэцэрлэгт).
- Model: MM ch.3 text, printed p21 (PDF 33): a family at home, with the mother cooking in the kitchen, the father in his room, and tea and talk at the table. MM ch.10, printed p107 (PDF 119), gives the cultural frame of a family visit that later packs develop.

**r015 · To the vet** («Эмнэлэг рүү»), order 150.
- Cast: Sarnai, the cat, Fred.
- Grammar: future `-на`; accusative «муурыг»; direction «-рүү», reusing Luna's own reviewed «эмнэлэгрүү авч яв»; negative «хүсэхгүй».
- Lexicon: өнөөдөр 227, муур 161, эмнэлэг 170, авах 263, явах 268, хайрцаг 116, хүсэх 272, тоглоом 164, тавих 269, дараа 214, загас 146, өгөх 262.
- New: none. Size: about 45 tokens.
- Questions:
  - `mc` "Where is the cat going?" (to the vet / to the library / to the garden);
  - `tf` "The cat wants to go in the box." (F);
  - `mc` "What does Fred put in the box?" (a toy / a fish / a blanket);
  - `mnmc` «Хэн муурыг эмнэлэгрүү авч явах вэ?».
- Model: MM ch.9 руу/луу "towards", printed p96-97 (PDF 108-109). Vet and box vocabulary come from Fred's Booklet (day 12) and Luna's rewrite of the vet sentence.

**Level 4**

**r016 · Last Saturday** («Бямба гарагт»), order 160.
- Cast: Fred, Sarnai, the cat.
- Grammar: past `-сан` across lexicon verbs (цэвэрлэсэн, арчсан, уусан, тоглосон, хийсэн, идсэн); харин; дараа нь; хамтдаа.
- Lexicon: бямба 240, гараг 239, байшин 234, цэвэрлэх 121, цонх цэвэрлэх 132, шал арчих 124, цэцэрлэг 181, цай 153, уух 259, муур 161, зүлэг 192, дээр 213, тоглох 165, орой 238, оройн хоол 144, хийх 267, идэх 258, хамтдаа 229.
- New: none. Past tense is the new element, and it recycles хоёр, харин, дараа нь, гэр and хүйтэн.
- Size: about 65 tokens.
- Questions:
  - `mc` "What did Sarnai do?" (mopped the floor / cleaned the windows / cooked dinner);
  - `order` (cleaning → tea in the garden → dinner);
  - `tf` "The cat played on the lawn." (T);
  - `mnmc` «Фред юу хийсэн бэ?» (цонх цэвэрлэсэн / шал арчсан / хоол хийсэн).
- Model: Beg L6 past `-сан` and negative past (grammar, printed 65-66; weekend narratives, printed 65 and 77-78); Surv L12 past, p94-98.

**r017 · Sarnai tells it** («Сарнайн түүх»), order 170. Retell of r016 (`retellOf: "r016"`).
- Cast: Sarnai, first person.
- Grammar: the same events with «би»; «Фред минь» endearment (минь 210); the plain possessive «миний».
- Lexicon: as r016, plus минь 210, цэвэр 138, одоо 226.
- New: **миний** "my" (once).
- Size: about 60 tokens.
- Questions (2): `tf` "Sarnai cleaned the windows." (F); `mc` "What is clean now?".
- Model: LingQ Mini Stories' retell structure (competitors); MM ch.6 possessive particles минь/чинь/нь, printed p62-63 (PDF 74-75).

**r018 · Fred learns Mongolian** («Фред монгол хэл сурч байна»), order 180.
- Cast: Fred, Sarnai.
- Grammar: `-ж байна` vs `-даг`; instrumental «хэлээр»; comitative with a name («Фредтэй»).
- Lexicon: өдөр 236, бүр 224, шинэ 197, үг 179, бичих 178, өгүүлбэр 180, унших 172, ярих 270, ном 171, дуртай 256, plus бас and их recycled.
- New: **монгол, хэл, сурах** (3, the maximum).
- Size: about 55 tokens.
- Locked on purpose until the deck has introduced its three words. The shelf shows `3 TO GO`, the clearest demonstration that the lock is real.
- Questions:
  - `mc` "What does Fred write every day?" (new words / letters / a story);
  - `tf` "Sarnai speaks Mongolian with Fred." (T);
  - `mc` "What does Fred read?";
  - `mnmc` «Фред юу сурч байна вэ?».
- Model: Beg L9 "how is your class / is Mongolian hard" dialogue, printed 111, and the L6 story of a foreign learner, printed 76-77; Surv L3 knowing languages, p18-21.

Recycling plan. Every new word recurs at least twice, unless marked P2:

| New word | Introduced | Recurs in |
|---|---|---|
| бас | r005 | r012, r013, r018 |
| хоёр | r006 | r011, r012, r016 |
| дараа нь | r007 | r012, r016 |
| харин | r008 | r013, r016 |
| хүйтэн | r009 | r012, r016 |
| их | r013 | r014, r018 |
| гэр | r014 | r016, r018 |
| миний | r017 | P2 |
| монгол, хэл, сурах | r018 | P2 |

### 5.4 Sample paragraph: r001, written in full

DRAFT, `reviewed:false`, pending Luna. It uses only `words.json` vocabulary plus two names. It was measured with the repo's own `tools/coverage.py` `analyse()` in this session: **20 of 20 counted tokens matched (100%)**, with 2 name tokens excluded.

> **Бямба гарагийн өглөө** · *Saturday morning*
>
> Өнөөдөр бямба гараг. Сарнай гал тогоонд кофе ууж байна. Фред цонх цэвэрлэж байна. Манай муур буйдан дээр унтаж байна. Муур сүүнд дуртай.
>
> *Today is Saturday. Sarnai is drinking coffee in the kitchen. Fred is cleaning the windows. Our cat is sleeping on the sofa. The cat likes milk.*

Alignment written by the matcher (`w`):

| Sentence | `w` |
|---|---|
| 0 | 227 өнөөдөр, 240 бямба, 239 гараг |
| 1 | 0 Сарнай, 233 гал тогоо ×2, 154 кофе, 259 уух, 201 байна |
| 2 | 0 Фред, 132 цонх цэвэрлэх ×2, 201 байна |
| 3 | 212 манай, 161 муур, 99 буйдан, 213 дээр, 257 унтах, 201 байна |
| 4 | 161 муур, 152 сүү, 256 дуртай |

Questions:

1. `tf` "Sarnai is cleaning the windows." → **False**. ids [132], line 2.
2. `mc` "Where is the cat sleeping?" → **On the sofa** / On the bed / In the kitchen. ids [99, 213], line 3.
3. `mc` "What does the cat like?" → **Milk** / Fish / Coffee. ids [152, 256], line 4.
   - "Fish" is the world-knowledge trap and "Coffee" comes from the text, so only reading line 4 gives the answer.

For Luna:

- Is «кофе ууж байна» the natural phrasing?
- Should «Муур сүүнд дуртай» be «Манай муур сүүнд дуртай» to keep the referent?
- Is the title natural, or would she say it differently?

### 5.5 New lexicon entries pack 1 needs

These are delivered by the Content-engine workstream, `reviewed:false`. All are drillable, and all sit near the top of the textbooks' frequency list (content-fit `missing_high_freq`, hits across MM/Beg/Surv):

| Entry | Gloss | Hits | Note |
|---|---|---|---|
| хоёр | two; (X Y хоёр) X and Y | 84 | |
| бас | also, too | 57 | |
| харин | but, whereas | 59 | |
| дараа нь | after that, then | нь 186 | a phrase entry, so the phrase matcher takes it before the drill:false «дараа» |
| их | very, a lot; big | 124 | |
| хүйтэн | cold | 23 | pairs with дулаан |
| гэр | home; ger | 132 | |
| миний | my | 167 | the plain possessive; also fixes the partial «Миний ор дулаан» |
| монгол | Mongolian | 133 | |
| хэл | language; tongue | 95 | |
| сурах | to learn | 51 | |

Connectives are added as **drillable**, not `drill:false`. A `drill:false` word counts as known even if Fred has never met it (`scheduler.js:50-52`), which would quietly overstate coverage (D9). These 11 must sit **at the head of the new-word queue**: `fresh` is taken in `words.json` order (`scheduler.js:70-73`). At 6 a day they are all introduced within two days.

### 5.6 Review: who checks what, and how long it takes

| Who | What | Through | Estimate for pack 1 |
|---|---|---|---|
| **Luna** | 18 passages (about 710 Mongolian tokens) with their English for meaning; 18 Mongolian titles; the Mongolian text of 6 `mnmc` questions and their options; 11 lexicon entries | `py tools/review-sheet.py`: a new section 5 for passages (Зөв / Буруу / Мэдэхгүй + a rewrite box per passage), plus the existing lexicon section | **45-60 min**, one sitting. A passage is 1-2 minutes to read and judge. |
| **Fred** | The 58 English questions and options (validity, giveaways); the English translations | Reads `coverage.py --readings --questions` output | about 15 min |
| **Sarnai** | Later: record 18 passages, about 7 min of audio at an unhurried natural pace | The Sound workstream's recording sheet | about 30 min with retakes |

`--apply` for passages:

- **Зөв** sets `reviewed:true` and `reviewedHash`.
- **Буруу** prints a hand-edit worklist with her rewrite. A multi-line passage has no single field to replace, which is the same reason grammar topics are handled this way (`review-sheet.py:488-492`).
- **Мэдэхгүй** leaves the passage pending.

### 5.7 Pipeline and throughput

```
brief (this doc) ─► Claude drafts readings.json entries (one session per pack)
   ─► py tools/coverage.py --readings --apply-tags     (writes w, partial)
   ─► py tools/coverage.py --readings                   (projected coverage ≥95% each, mean ≥98%)
   ─► py tools/coverage.py --readings --overlap <dir>   (local; must be empty)
   ─► py tools/run_tests.py                             (integrity + hash + sync)
   ─► Fred's English check ─► review sheet to Luna ─► --apply ─► commit + push
```

- **Consumption:** one passage a day in lessons plus tab extras, so 18 passages last about 2.5-4 weeks.
- **Production:** one pack per 2-3 weeks is about 45-60 minutes of Luna's time per fortnight, plus one Claude session.
- **Trigger for the next pack:** `coverage.py --readings` prints `UNREAD READY + LOCKED < 6 → draft next pack` from the latest exported backup code (`--progress <code-file>`). Fred never sees a "running low" banner.

### 5.8 Later packs (scope only, not designed here)

| Pack | Theme | Needs from the Content engine | Modelled on |
|---|---|---|---|
| `people-1` | Names, who is who, languages, jobs, family | the identity/family core: нэр, хүн, найз, ах/эгч/дүү, эхнэр/нөхөр, ирэх, очих, ажил, багш | Surv L2-L3, L9 (p9-25, p75-81); Beg L1-L2 (printed 2-21); MM ch.2-3 (printed 10-31) |
| `days-1` | Yesterday and tomorrow, weekends | байх forms, өчигдөр, маргааш, time words | Beg L6-L7 (printed 64-100); Surv L12 (p94-98) |
| `visit-1` | At Sarnai's parents': greetings, honorifics, food | гуай, бууз, хуушуур, honorific verbs | MM ch.10 (printed 107-116) |
| `story-1` | *The magic pot*: the MM folk tale retold at A2 in 6-8 serial episodes | the narrative past, plus a vocabulary list per episode | MM ch.11-14 (printed 118-172). Retold, never translated or copied. |

Once about 100-150 textbook lemmas are in the lexicon, 14-32 of the books' own 137 passages reach ≥ 95% (content-fit unlock curve). They still cannot be shipped. A **local-only** `py tools/coverage.py --books <dir> --progress <code>` can then print *which printed pages of his own books Fred can now read*: page numbers and percentages, no text. That is optional increment C5.

---

## 6. Build

### 6.1 Core (DOM-free; tested in `tools/test.html`)

**New: `src/core/readings.js`**

- `tokensOf(passage)` returns `[{ s, i, mn, id }]` from `sentences[].mn` split on whitespace, zipped with `w`.
- `readingIds(passage)` returns the sorted unique non-zero ids.
- `coverage(passage, mem)` returns `{ share, counted, known, unknownIds: [...] }`. Names (0) are excluded; `null` counts as unknown.
- `status(passage, p, mem)` returns `{ state: 'done' | 'ready' | 'locked' | 'partial' | 'retired', toGo: [ids] }`, implementing §3.2.
- `shelf(readings, p, mem)` returns the status list in `order`, plus `{ ready, locked }` counts.
- `pickReading(p, readings, mem, today)` implements §3.4.
- `optionOrder(q)` is the seeded shuffle from `hashSeed(q.id)`.
- `gradeQuestion(q, response)` returns `{ ok, answer }` for `tf`, `mc`, `mnmc` and `order`. `order` compares the tapped sequence with `q.items`, which is English, so no Mongolian is ever reordered.
- `completeReading(p, passage, answers, today)` returns `{ rec, xp }`, implementing §3.8. It writes `p.readings[id]` and `p.xp` only.
- `reviewText(passage)` is the title, the sentences (`who: ` prefix included) and the `mnmc` question and option Mongolian, joined with `\n`. It is the input to `reviewedHash`.
- `readingTotals(p)` returns `{ read, right, wrong }` for the Progress page (Gamification decides whether to show it).

**`src/core/scheduler.js`**

- Export `memory(p, words, opts)` returning `{ R, isKnown, isWeak, isNew }`, lifted unchanged from `buildSession()` lines 40-54. `buildSession()` uses it.
- `buildSession(..., opts.readings)` appends at most one `{ kind: 'reading', passage }` as the last item, and sets `diagnostics.reading`.

**`src/core/goals.js`**

- `itemSteps(it)`: deck → `words.length`; a reading on its first read → `1 + questions.length`; a reread → 1; otherwise 1.
- `stepCount` uses `itemSteps`.
- Constants `READ_XP_BASE = 3`, `READ_XP_BONUS = 3` and `xpForReading(right, wrong)`.

**`src/core/progress.js`:** `readings: {}` in `blank()`, with its comment (§4.2).

**`src/core/sync.js`:** the `mergeStates` rule (§4.3). Add `isCounter` entries for `main.readings.*.reads/right/wrong`, `isLatest` for `.last`, and `isEarliest` for `.first`. Update the header comment and the `mergeStates` docblock.

### 6.2 UI

**New: `src/ui/reader.js`**, pure HTML-string views like `views.js`:

- `viewReader(passage, ctx)`:
  - the title pair and the `UNREVIEWED` label;
  - the passage, with each tap group as `<span class="tok" data-act="rd-tap" data-t="i">`, `.new` for unknown words and `.on` for the tapped one;
  - the chip or sentence English rendered right after the tapped token's sentence;
  - the one-off hint;
  - buttons `rd-questions` and `rd-skip` (first read) or `rd-done` (reread).
- `viewReadQuestion(passage, q, idx, ctx)`: `READ · n/N`, `rd-showtext`, then the four kinds. It reuses the `.choice` markup from `viewGrammarDrill` (`views.js:417-441`), and `order` uses the Learning-loop tiles view. Verdict panels follow INSTRUMENT: green `CORRECT` + `.btn.correct`, red `WRONG` + `.btn.secondary`, and the evidence sentence with `.tok.hinge` underlines.
- `viewReadDone(passage, rec, ctx)` (tab only) and `viewShelf(list, counts, ctx)`.

**`src/ui/app.js`**

- `boot()`: `fetch('./data/readings.json').then(r => r.json()).catch(() => [])` **outside** the `Promise.all` that blanks the app on failure. Set `READINGS`.
- `todaySession()` passes `{ readings: READINGS }`.
- `render()`:
  - a `reading` branch in the run screen, which today's `else` branch would misroute (`app.js:208-213`);
  - an `S.screen === 'read'` screen;
  - the step count via `itemSteps()` (`app.js:190-193`);
  - `renderKey()` gains `rd:${S.rd.step}:${S.rd.qi}`, so tapping a word does *not* replay entry motion while moving to the next question does.
- Actions:
  - `rd-tap`: cycles the tap between word, sentence and closed;
  - `rd-questions`, `rd-skip`, `rd-showtext`;
  - `rd-pick`: records the first-attempt boolean and fires the Sound cue if that exists;
  - `rd-next`: on the last question it calls `completeReading()` and `save(P)`; inside a lesson it then adds to `S.summary.xp` and `S.summary.reading` and calls `advance()`;
  - `rd-done`, `rd-again`, `rd-en`, `read-open`;
  - `tab` `read`.
- Keys: the Enter order gains `rd-questions`, `rd-next`, `rd-done`. Keys 1-4 also match `.choice[data-act="rd-pick"]`.
- The `prefs` read and write for `seen.readTap`, in try/catch.

**`src/ui/views.js`**

- `TABS` gains `{ id: 'read', label: 'Read', dom: '' }` between Today and Grammar, coordinated with Less-text/Gamification's tab plan (6 short labels fit 375px).
- `viewToday` adds the nothing-due `Read: <title> →` button.
- `viewDone` adds the reading row.

**`src/ui/base.css`**

- `.reader` (22px/1.6 Geologica 400).
- `.tok` (padding 2px 1px for a hit area, no border); `.tok.on` (ink underline); `.tok.new` (dotted underline); `.tok.hinge` (2px underline).
- `.glosschip` (inset panel, hairline, mono gloss).
- `.sent-en` (gloss style, 11.5px mono).
- No new colours, and no motion on chips.

### 6.3 Tools (Python 3.14, standard library)

**`tools/coverage.py`.** First, prerequisites owned by the Content engine:

- The long-vowel guard in `stem_match()`. Verified in this session: `stem_match('дэр','дээр')` returns True, which mis-tags "pillow" as "on".
- Extra `SUFFIXES` (`гаа/гээ/гоо/гөө`).

Then these additions:

- `--readings`: a per-passage report (counted tokens, unmatched, names, projected coverage with `introduces` treated as unknown, distinct unknowns) and the pack mean. With `--progress <code-file>`, coverage is computed from a real backup code using the FSRS R ≥ 0.80 rule, through a Python port of the FSRS-6 retrievability formula. That port is stdlib only and is tested against `fsrs.js` vectors.
- `--readings --apply-tags`: writes `w` (names → 0, unmatched → `null`) and `partial`. It refuses to overwrite a sentence whose stored `w` differs from the matcher unless `--force`.
- `--readings --check`: lists any stored-vs-matcher differences, for hand alignments.
- `--readings --questions`: prints the English questions for Fred's check.
- `--readings --overlap <dir>`: a 5-gram overlap against the extracted textbook `.txt` files, run locally. It prints offending n-grams by passage id and page.
- `hash_seed(s)`: an FNV-1a port over UTF-16 code units, the same as `choices.js:35-42`.

**`tools/review-sheet.py`**

- `load_readings()` returns passages with `reviewed is False`: id, title pair, lines (`who`, `mn`, `en`) and `mnmc` Mongolian.
- Section 5 «Унших эх» (the sheet's chrome is already Mongolian for Luna): per passage, the lines with English in small grey, then Зөв / Буруу / Мэдэхгүй and a rewrite box.
- The state key `readings` goes into init, clear, `progress()`, the click/input routing and `TOTAL`.
- `apply()` branch: Зөв → `reviewed:true` + `reviewedHash`; Буруу → the printed worklist; a summary line `readings: N signed off, M flagged`.

### 6.4 Tests

**`tools/test.html`** (core):

1. **Fix helpers first.** `idsOf` (167-169) handles `reading` items (→ `[]`). The unguarded trajectory and scheduler loops (180-181, 351) get a once-per-word `seen` guard, as audits-loop asks, so the content-runway figure is not inflated.
2. **readings.json integrity:**
   - ids unique and well-formed; question ids are `${pid}q${n}`;
   - `w.length` equals the token count of `mn` for every sentence;
   - every non-zero id exists in `words.json`; `0` only where `names` is non-empty; `null` only if `partial`;
   - `q.ids` ⊆ the ids of `q.lines`; `answer` in range; options unique and between 2 and 4; `tf` answers boolean;
   - per pack, True share in `tf` between 35% and 65%;
   - at most 4 questions; each level's token count within its band ±10%;
   - `title.mn/en` present; `source` contains "Original text.";
   - `retellOf` refers to an earlier `order`;
   - `introduces` ⊆ passage ids, and each word is introduced only once per pack.
3. **Review lock:** every `reviewed:true` passage has `reviewedHash === hashSeed(reviewText(p))`.
4. **`memory()` parity:** `buildSession` output deep-equals the pre-refactor output for the existing fixtures, and `memory().isKnown` matches the scheduler's own decisions.
5. **`coverage()`:** all known → 1; one weak word in 20 tokens → 0.95; names excluded; `drill:false` known; a multi-word entry counts its tokens; `null` unknown.
6. **`status()` and `pickReading()`:**
   - the 0.95 boundary (ready at exactly 0.95, locked at 0.949);
   - more than 3 distinct unknowns → locked;
   - an unknown hinge word → locked;
   - partial and retired never ready;
   - a retell waits for its source;
   - order-first;
   - `null` when any `last === today`;
   - never returns a done passage.
7. **`buildSession`:** with `opts.readings` there is at most one reading item and it is last; without it, output is deep-equal to today's.
8. **`stepCount`/`lessonWorth`** count a reading as `1 + questions.length`.
9. **Reading never touches memory:** `completeReading` leaves `P.items`, `P.introduced` and `history` deep-equal before and after.
10. **`completeReading`:**
    - first read → `{first, last, reads: 1, right, wrong}` and `xp = 3·n + 3·right`;
    - reread → `reads + 1`, `last` updated, `right/wrong/first` unchanged, `xp 0`.
11. **`gradeQuestion`** for all four kinds. The `order` kind accepts only `q.items` order.
12. **Backup:** a v1 code → `readings {}`; a pre-reading v2 code → `readings {}`; a populated code round-trips; `readings: {}` survives a round trip, so a falsy value is not lost.
13. **Sync:**
    - `toDocs` puts `readings` in `main`; `fromDocs` restores it;
    - `mergeStates` keeps passages from both sides, and for the same passage the one with more reads wins whole;
    - `rebase` adds counters for reads/right/wrong, takes the later `last` and the earlier `first`;
    - a completion diff touches only `main.readings.<id>.*` and `main.xp`;
    - test 925 (a grade sends exactly 2 operations) still passes.

**`tools/engine-test.html`:**

- Two devices offline each complete a different passage: both survive after sync.
- Both complete the same passage offline: reads add, `first` is the earlier, `last` the later, and both XP awards count.
- An old-build device (without the field in `blank()`) passes `main.readings` through a save untouched.

**`tools/smoke.html`** (built app, two frames):

- Seed the fake device's progress so that r001's words are known.
- Start a lesson and step to the reading item.
- Tap a token and assert the chip; tap again and assert the sentence English.
- Questions → answer all → done.
- Assert `P.readings.r001.first === today` and that `xp` moved.
- Assert the Read tab lists r001 as done.
- Assert the second frame shows r001 done after sync.
- Assert the first R1 hint is not shown a second time.

### 6.5 `build.py` and `sw.js`

- **`readings.json`** is copied and precached with no change (audits-plat).
- **New ui module trap:** `build.py:66-67` and `:71` only know `views.js` and `account.js`. Without a change, a new `reader.js` would leave the **built app blank**.
  - Generalise both lines to every `src/ui/*.js` except `app.js`, with the import rewrite `from '\./([\w-]+)\.js'`. The Sound workstream needs the same change for `sound.js`, and whichever lands first does it.
  - Then run `py build.py && py tools/run_tests.py tools/smoke.html`.
- **`sw.js`:** no change in this workstream. Audio caching and the Range-request branch belong to the Sound workstream.

### 6.6 Docs

**`docs/INSTRUMENT.md`:**

- Components: add **Reader**, covering the passage, the tap chip (word, then sentence), the questions, the evidence panel and the `UNREVIEWED` label.
- Type table: add `22 | 400 | reading passage, line-height 1.6` (D10).
- Principle 5 and Layout: "In the reader, the English pair is one tap away rather than under the line" (D3).
- Copy: "Reading figures are first-read answers; a reread asks nothing and earns nothing."

**`CLAUDE.md`:**

- Layout: `core/readings.js`, `ui/reader.js`.
- Run: the `coverage.py --readings` modes, including `--overlap`.
- Content schema: a `readings.json` subsection with the §4.1 table in short.
- State: `readings` (§4.2).
- Sync: the merge and rebase lines (§4.3).
- Rules: "Reading never grades FSRS; one passage per day in lessons."
- Native-speaker review: section 5.
- Current status: pack 1.
- Fix the stale line 105, "Interface chrome is Mongolian", which contradicts line 72 (audits-plat, audits-loop).
- Adopt printed-page citations, "printed pX (PDF pY)".

**`ROADMAP.md`:** a new built item "Reading". Note under 2b that reading extends useful daily work past the i+1 ceiling but does not replace lexicon growth.

---

## 7. Size & dependencies

Sizes: S = less than 1 focused session, M = 1-2 sessions, L = 3 or more.

| Increment | Contents | Size |
|---|---|---|
| **C0 prerequisites** (other workstreams) | Matcher long-vowel fix + `SUFFIXES` (Content engine); the 11 lexicon entries at the head of the queue (Content engine); `build.py` ui-module generalisation (Sound or this, whichever is first) | S |
| **C1 core + state + sync** | `readings.js`, `memory()` export, `opts.readings`, `itemSteps`, `xpForReading`, `blank()`, sync rules; test.html and engine-test sections | M |
| **C2 tools** | `coverage.py --readings` modes, `hash_seed`, review-sheet section 5 + apply | M |
| **C3 pack 1 content** | 18 passages as JSON, alignment, coverage, overlap check, Fred's English check, sheet sent to Luna (she reviews in parallel with C4) | S-M |
| **C4 reader UI** | `reader.js`, app.js wiring, Read tab, Today hook, done row, CSS, smoke | M (2) |
| **C5 later** | `order` questions (after tiles); retell r017; audio Listen (after Sound's audio infrastructure); local `--books` "readable pages" report | S each |

- **Total: L (about 5-6 focused sessions)**, delivered as three shippable steps:
  1. C1 + C2 + C3: Luna's review starts and nothing is visible yet.
  2. C4: Fred reads every day.
  3. C5.
- **Must land first:** C0, and the test-helper fixes in §6.4 item 1, which the Learning loop also needs.
- **Unblocks:**
  - listening practice (DuoRadio style) as soon as Sarnai records passages;
  - the `story-1` serial;
  - Gamification's "reading" events and unit mapping (`pack`/`grammar` tags);
  - a natural home for the Content engine's new vocabulary to recur in context;
  - the local readable-pages report.

**Interfaces with the parallel workstreams**

| Workstream | This design needs | This design provides |
|---|---|---|
| Learning loop | the tiles component for `order` questions; retries inserted *before* the reading item; joint fix of `idsOf` and the render branch for new item kinds | `memory()` (shared `isKnown`/`isWeak` for rung derivation); the rule that reading questions are outside the retry loop |
| Sound | right/wrong cues on `rd-pick`; no sound on the text screen; later, the per-sentence `audio` format, the Range-safe cache and the credit chip | the `audio` slot in the schema; the "never autoplay on first read" rule |
| Gamification | final XP constants; streak semantics (D5); whether to show `readingTotals` and the Today `diagnostics.reading` | real events: first read completed `{id, right, wrong}`; reread completed |
| Less text | the "seen once" mechanism; agreement that tap-to-reveal English is the reader pattern (D3) | a worked example of one task per screen with details on tap |
| Content engine | matcher fixes; 11 new entries queued first; future packs' vocabulary; syllabus tags | `--readings` coverage modes; a measured coverage/recycling report per pack; the `--overlap` copyright check |

---

## 8. Decisions for Fred

Each decision lists the options; the recommended default is marked **(rec)**.

1. **D1 · Where reading lives.**
   - (a) Only inside the daily lesson.
   - (b) Only in a Read tab.
   - (c) **Both (rec):** one new passage per day as the last step of the lesson, plus the tab for rereads and extra reading.
2. **D2 · Do question answers change FSRS?**
   - (a) **No (rec).** Exposure plus a per-passage tally and XP (§3.7).
   - (b) Per question: right → Good, wrong → Again on its hinge words, only for words not graded today.
   - (c) Only a wrong answer pulls its hinge words' due date to tomorrow.
   - (b) and (c) need only code, since `q.ids` is already in the data.
3. **D3 · English in the reader.** This amends INSTRUMENT principle 5 and CLAUDE.md's "`gl()`/`gli()` render content-pair captions unconditionally", for the reader only.
   - (a) **On tap (rec):** word first, then sentence, with the full translation after the questions.
   - (b) English under every line, as elsewhere in the app.
   - (c) A per-passage toggle.
4. **D4 · Unreviewed passages.**
   - (a) **(rec)** Send pack 1 to Luna as soon as C3 is done. When the reader ships, show anything she has not yet signed with a small `UNREVIEWED` label.
   - (b) Hold every passage until she signs it.
5. **D5 · Does a reading done only from the Read tab count as a study day?**
   - (a) **No (rec).** INSTRUMENT says a streak day requires a finished session; Gamification owns the final rule.
   - (b) Yes.
6. **D6 · Question language at the start.**
   - (a) **English questions at L1-L2, one Mongolian question from L3 (rec).**
   - (b) Mongolian questions from the first passage.
7. **D7 · Unlock threshold.**
   - (a) **95% of running words known, at most 3 unknown words (rec).**
   - (b) 98%: fewer passages, more comfortable.
8. **D8 · Real names in a public file.** `readings.json` is published with the app.
   - (a) **(rec)** First names «Фред» and «Сарнай», which the repo already names publicly, and no places, workplaces or surnames.
   - (b) Pseudonyms.
9. **D9 · Connectives as drillable words.**
   - (a) **(rec)** бас, харин, тэгээд and дараа нь are drillable, so they are introduced and measured.
   - (b) `drill:false` like байна. They would then count as "known" before he has ever seen them.
10. **D10 · Reading type size.** This adds a size to INSTRUMENT's type scale.
    - (a) **(rec)** 22px, line-height 1.6, for passages. An 80-word passage stays at about one screen and a half on the iPhone.
    - (b) Reuse the 26px sentence-prompt size and accept more scrolling.
11. **D11 · The retell format in pack 1.**
    - (a) **One pair, r016 → r017, to try it (rec).**
    - (b) Defer retells to pack 2.

---

## 9. Risks and how each is contained

| Risk | Containment |
|---|---|
| **Machine-written Mongolian teaches errors** | `reviewed:false` until Luna signs off. Prefer reviewed constructions (§5.2 rule 3). The `reviewedHash` test forces a re-review after any edit. The `UNREVIEWED` label (D4) keeps the status honest. |
| **The content runs out** (1 passage a day uses up a pack in about 3 weeks; Luna's time is scarce) | Packs of 16-18 at about 45-60 minutes of review each. A next-pack trigger in the tool output, not in Fred's face. Rereads from the shelf. The readable-pages report once textbook vocabulary lands. |
| **The matcher mis-aligns a token** (a wrong gloss on tap teaches a wrong meaning; the дэр/дээр bug was verified) | Matcher fix first (C0). `--check` reports any stored-vs-matcher difference. Per-token alignment is printed for the author. `w` is stored, not recomputed in the browser. |
| **Coverage looks higher than it is** (`drill:false` words count as known) | Connectives drillable (D9). `introduces` marks first use. Pack-level projected-coverage report. |
| **Questions answerable without reading** | §3.6 authoring rules. Fred's English check. The test for the True share. Distractors drawn from the text. |
| **More text on screen** (complaint 5) | No captions under lines. One question per screen. At most 6 chrome words on the text screen. The hint shown once per device. |
| **Longer lessons** | One passage a day, last, skippable, counted honestly in the minutes estimate. |
| **Sync loses reading records** | The `mergeStates` rule and `isCounter`/`isLatest`/`isEarliest` entries, with tests in test.html and engine-test. No new document, so no Firestore rules change. |
| **A bad `readings.json` blanks the app** | Loaded outside `Promise.all` with `.catch(() => [])`. Integrity tests. |
| **A new ui module blanks the built app** | The `build.py` generalisation plus the smoke test (§6.5). |
| **Copyright** (public site, commercial books) | Original text only. `source` must say "Original text." The local `--overlap` 5-gram check against the extracted books before every commit. Textbook text never enters the repo. This document quotes none. |
| **Privacy** (family first names in a public file) | D8: first names only, no locating details. |
| **Small tap targets on the iPhone** (short words like «уу») | Padding on `.tok`; tap groups for multi-word entries; checked on the real device. |
| **Locks flicker as memory decays** | Done passages are always rereadable. Locked rows show the real `N TO GO` and the word list, so a lock always explains itself. |

---

## 10. Versus Ling

Ling's Mongolian course (competitors research; no independent review of the Mongolian course itself exists):

- One template is shared across 60-80 languages.
- Each lesson ends with a short dialogue with one blank to fill, plus a pick-your-reply chatbot.
- Reviewers report a ceiling around A1-A2, few grammar notes, no translations for individual words, dialogue words that were never taught, and content errors in less common languages.
- There is no graded reading, and nothing decides *when* a text is readable for *this* learner.

What this gives Fred that Ling cannot:

1. **Every passage is written to his exact vocabulary and unlocked by his own memory.**
   - A passage opens only when at least 95% of its running words are solid in *his* FSRS state.
   - A locked passage says exactly which words stand in the way ("3 TO GO": монгол, хэл, сурах).
   - Ling's texts are the same for everyone, whether or not the words were taught.
2. **His own life is the story.** Fred, Sarnai, the cat, their house and garden, and Sarnai's parents coming for dinner. The vocabulary is the household lexicon he has been drilling, so every passage recycles words he has worked for. Nothing is generic.
3. **Every word is tappable**: dictionary form plus English, then the whole sentence. Ling's reviewers name the lack of word-level translation as a weakness.
4. **The questions need the text.** Distractors come from the passage, with no world-knowledge giveaways. A wrong answer shows *where in the text* the answer was, which turns a miss into a lesson.
5. **Grammar follows his own textbooks, page by page:** present, then habitual, future and past, as Beginner Mongolian and Modern Mongolian teach them, with every passage citing the printed page it follows. The ladder runs from 15 words to about 80, which is where his textbooks' passages begin. That is the path toward B1, and Ling stops before it.
6. **His tutor checks the Mongolian, and his wife will read it aloud.** Luna signs off every passage. Sarnai's recordings later turn the same stories into listening practice, with a credit chip.
7. **The numbers are honest.** Coverage, `N TO GO`, right/wrong and XP all come from real events, with no leaderboard or invented figures. Reading never corrupts his spaced-repetition schedule.
