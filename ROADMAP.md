# Roadmap

Ranked by leverage against the two stated bottlenecks: **retention & volume**
(words don't stick, 3/day is too slow) and **real-world usage** (drills don't
transfer to conversation).

---

## 1. FSRS scheduling over sentences — **BUILT**

Replaced the 5-box Leitner system with FSRS-6, and made sentences rather than
isolated words the default unit of review.

FSRS needs roughly 20–30% fewer reviews than SM-2-style systems for the same
retention, benchmarked over 500M+ real Anki reviews. Words met in context are
retained longer than words drilled in isolation, and input is most useful at
90–98% comprehensibility — the i+1 principle. The `ids` tagging already present
on every sentence makes comprehensibility computable exactly rather than guessed.

The fixed 3-new-words-per-day cap is gone. Intake is now demand-driven, with a
configurable ceiling (`dailyNewCap`) and automatic back-off when reviews pile up.

### 1b. Parameter optimisation — not built

FSRS ships with published default weights. They can be fitted to Fred's own
review log, which typically buys a further few percent. Needs several hundred
logged reviews first. Requires storing a review history (currently only summary
history is kept).

---

## 2. More content — **still the binding constraint**

### 2a. Tagging — **DONE**

Sentences used to carry one tag each, so comprehensibility could only read 0%
or 100% and i+N only i+0 or i+1. Both were presented as instrument telemetry
while measuring essentially nothing.

The lexicon went 111 → 184 entries (73 words the sentences already used but
never declared), sentences were retagged with every word they contain
(1.00 → 2.91 tags each), and 94% of tokens now resolve, with 162 of 164
sentences fully covered. Closed-class grammar is marked `drill:false`: it
counts toward comprehensibility but is never queued as a flashcard.

All 73 new entries are `reviewed:false` pending Luna or Sarnai —
`py tools/extend-lexicon.py --sheet`.

### 2b. More sentences — the remaining constraint

Measured over 45 simulated days (`tools/test.html`, trajectory section):
i+1 share reaches 1.00 by day 5, then decays as vocabulary outgrows the
corpus. **New material runs out on day 31**; from about day 35 the app is
review-only at 4–5 items a day. 164 sentences over 154 drillable words is
roughly one sentence per word — no repeat-exposure headroom.

More sentences now buy more than more words: the selector needs several
candidates per target to find one where exactly one element is weak.

- Extend Luna's packs, in the existing pipe-delimited format.
- Add a paste-in importer that runs `coverage.py` over new sentences and
  rejects ones whose comprehensibility is too far below level.
- Two corpus items need a native speaker: `сорогч` / `сороогоч` / `соордог`
  spell the vacuum verb three ways.

---

## 3. Shadowing with Sarnai's recordings

Research consistently puts shadowing ahead of dictation, and it specifically
helps lower-proficiency learners perceive word boundaries in connected speech —
which is exactly the "conversation collapses" failure.

Design for **one or two focused sessions**, since her time is the scarce resource:

- Generate a recording script from the current sentence set, ordered so a whole
  batch can be read in one sitting.
- Record at natural speed, not word-list pace. Sentences, not isolated words.
- Store clips in IndexedDB, keyed by sentence. Cache Storage caps near 50MB on
  iOS; IndexedDB goes to 500MB+.
- Flow: listen → shadow → self-rate, feeding the same FSRS scheduler.
- Instrument requires the credit chip on every native clip, and a waveform with
  played/unplayed in signal/track.

---

## 4. Production drills from morphology

Mongolian is agglutinative — grammar is suffixes on unchanged stems. That means
case-ending and verb-form drills can be *generated* from the word list rather
than hand-written, which is a large content multiplier for little authoring.
Needs a small morphology table (cases, tense/aspect endings, vowel harmony).

Vowel harmony makes the ending depend on the stem's vowels, so the generator
must implement it or it will produce wrong forms — this is the main risk.

---

## 5. Conversation rehearsal

Situational packs (shop, taxi, in-laws, doctor) with branching prompts. Directly
targets transfer to real use, but depends on 2 and 3 landing first — it needs
both content volume and audio to be worth building.

---

## Sources

- FSRS vs SM-2 benchmark — https://www.neurako.com/blog/fsrs-vs-sm2-spaced-repetition-algorithms-compared
- FSRS overview — https://fluentcards.org/blog/fsrs-spaced-repetition-algorithm/
- Comprehensible input thresholds — https://gianfrancoconti.com/2025/02/27/why-the-input-we-give-our-learners-must-be-95-98-comprehensible-in-order-to-enhance-language-acquisition-the-theory-and-the-research-evidence/
- Sentence mining — https://www.clozemaster.com/blog/sentence-mining/
- Shadowing vs dictation — https://jalt-publications.org/sites/default/files/pdf-article/36.1-art1.pdf
- WebKit storage policy — https://webkit.org/blog/14403/updates-to-storage-policy/
- iOS PWA limits — https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
