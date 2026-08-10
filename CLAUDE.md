# Mongolian study app

Personal language app for Fred (target CEFR B1/B2). Mongolian Cyrillic.
Content is prepared by his tutor Luna; his wife Sarnai is a native speaker who
will record audio in a later phase.

## Run

There is no Node toolchain on this machine (no `node`, `npm`, `npx`, and no
admin rights to install one). Python 3.14 is the build runtime.

```
py build.py                  # src/ -> dist/ , stdlib only
py tools/serve.py dist 8080  # the app  — must be http://, not file://
py tools/serve.py            # repo root on :8000, for the test page
```

Tests run in the browser, because the browser is the only JS engine here:
open `http://localhost:8000/tools/test.html`. It imports the real modules from
`src/core/`, so a green run is a statement about the shipped code. `serve.py`
sends `no-store` — without it the browser silently tests stale modules.

`build.mjs` and `tools/test.mjs` are the original Node versions. They cannot
run here and are not maintained; `build.py` and `tools/test.html` are
authoritative.

## Layout

```
src/core/     fsrs.js scheduler.js progress.js grade.js    ← pure logic, no DOM
              goals.js choices.js                          ← goal/streak/XP telemetry, MC distractors
src/ui/       app.js views.js *.css                        ← DOM lives only here
src/data/     words.json sentences.json                    ← large; avoid reading unless changing content
build.py      copies files, rewrites 2 imports in app.js, injects SW precache list
tools/        serve.py (dev server), test.html (test suite)
              mockups*.html — design references for the v3 redesign, not shipped
```

No bundler and no npm dependencies. Browsers load the ES modules directly;
the build only copies, concatenates CSS, generates icons, and stamps sw.js.

## Rules

- **Instrument design system.** Read `docs/INSTRUMENT.md` before touching UI.
  v3 ("Соёмбо") is a paper ground with the flag's own colours; red names
  action and error, blue names known and correct, gold is the goal layer only
  and is **never** used as type (1.6:1 on paper).
  The rule that bites: *numbers are real* — the app now has XP, levels,
  streaks and badges, but every one is derived from an event that actually
  happened (a card graded, a stability gained, a session finished). Adding a
  figure that cannot be traced to a real event breaks the system.
- **Every Mongolian string carries its English.** Buttons, headers, verdicts,
  labels, badges — not a subset. `gl()` in `views.js`. Off is a preference in
  Тохиргоо, never a default.
- **Offline first.** No CDNs, no external requests, ever. Fonts are self-hosted.
- **Never break backup codes.** `importCode()` must keep accepting v1 (Leitner)
  codes forever. Verify with a round-trip test after any schema change —
  `tools/test.html` covers both the v1 wire format
  (`btoa(unescape(encodeURIComponent(json)))`) and the v2 round-trip.
- **Grade per word, never across the whole string.** A flat edit-distance
  budget over a sentence accepts different answers as typos: "The floor is
  dry" is two edits from "The floor is dirty". `typoDistance()` in `grade.js`
  requires the same word count, exactly one word differing, that word ≥5
  characters, and ≤1 slip per five. The collision test in `tools/test.html`
  asserts no sentence accepts another sentence's answer — keep it green.
- **Day keys are local, not UTC.** `dayKey()` names the calendar day where Fred
  is; the keys are then parsed at a fixed offset so day arithmetic stays exact.
- Interface chrome is Mongolian; telemetry labels are uppercase Latin mono.
- `core/` must stay DOM-free so it can be tested in plain Node.

## Content schema

`words.json` — `{id, mn, en}` plus two optional fields:

- `drill: false` — closed-class grammar (байна, би, энэ, дээр…). Counts toward
  comprehensibility and is never the i+1 element, but is never introduced as a
  flashcard. Absent means drillable.
- `reviewed: false` — machine-written, not yet confirmed by Luna or Sarnai.
  Export the outstanding ones with `py tools/extend-lexicon.py --sheet`.

Entries may be multi-word (`тоос сорогч`, `оройн хоол`). `tools/coverage.py`
matches those as phrases before falling back to single tokens — otherwise the
parts get reported as missing and someone adds a duplicate `машин`.

`sentences.json` — `{mn, en, ids}`, where `ids` is **every** word the sentence
contains, not just the one it was written to teach. Comprehensibility is
computed over this list, so a partial list makes the readout meaningless. The
scheduler derives what a sentence *teaches* from what is due or new.
`partial: true` marks a sentence still containing unlisted vocabulary.

Plus `alt: {en: [...], mn: [...]}` — **every other phrasing that counts as
correct**, because there is no one to appeal to once the app is live. The
canonical answer stays in `en`/`mn`; `alt` holds the rest, and grading takes
the best match across all of them. `altReviewed: false` marks the set as
machine-generated pending Luna or Sarnai.

Regenerate with `py tools/alternatives.py`. It is the only thing that should
write these fields — hand edits there will be overwritten, so put additions in
that file's `HAND` table instead. Its Mongolian rules are each cited to a page
of *Modern Mongolian: A course book*; three lessons from getting them wrong:

- **Never permute word order.** Inverting adjective and noun changes the
  meaning (p18): «тэр хана ногоон» is *that wall is green*, «ногоон хана» is
  *a green wall*.
- **Never swap a word's second gloss in automatically.** `хашаа` glosses
  "yard/fence" but "The cat is in the fence" is not English, and `түүх`
  glosses "story/history" but you cannot "tell me a history". Accepting a
  wrong answer teaches it — worse than missing a right one.
- **Verbs are stored as infinitives in -х**, so suffix-stripping rules must
  exclude them or «угаадаг» becomes «угаах».

Re-check coverage after any content edit:

```
py tools/coverage.py               # 94% of tokens, 162/164 sentences covered
py tools/coverage.py --unmatched   # what is still missing
```

## State

`localStorage['mng_study_v2']` — see `blank()` in `src/core/progress.js`.
v1 saves are migrated automatically on load; box level seeds stability,
accuracy seeds difficulty.

Fields are **additive only**. `normalise()` merges saved state over `blank()`,
so a code written before a field existed imports with its default rather than
being rejected — that property is what keeps old backup codes working, and
`tools/test.html` asserts it for both v1 and pre-redesign v2 codes.

There is no server and no sync. Progress exists only in the browser that
created it, per device — a backup code is a manual transfer, not a sync, and
`importCode()` **replaces** the whole state rather than merging.

- `lastExport` — day a code actually left the device. Only set when a copy or
  share succeeded; a dismissed iOS share sheet must not record one.
  `exportAge()` returns days since, or null. The home screen warns at 14 days.
- `gloss` — English under Mongolian chrome (INSTRUMENT: mono grey, 11.5px).
  On by default, switchable from Тохиргоо.
- `mcMode` — word cards as multiple choice. Off gives a text field graded by
  the same `gradeText()` the sentences use. Switchable mid-question, both ways.
- `purpose` — the ЯАГААД line, Fred's own sentence, shown every day. Empty
  until he writes one; there is deliberately no default.
- `goalWords` — B1 target, default **2500**. A research estimate (Milton 2009
  and others put B1 at ~2,500–3,000 lemmas), *not* a CEFR specification —
  CEFR publishes no vocabulary counts, and the UI says so.
- `xp`, `badges` — lifetime XP and earned milestone ids. Only ever moved by
  `awardGrade()` in `app.js` and `earnedBadges()` in `core/goals.js`.
- `history` — one row **per day**, not per session. `recordDay()` upserts;
  appending twice would make two sessions in a day read as two streak days,
  which rewards re-opening the app instead of doing the work.

## Current status

FSRS-6 scheduling with i+1 sentence selection, Instrument v3 ("Соёмбо") on
paper, flashcard deck for new words, multiple choice with a typed-answer
switch, and a week-led dashboard carrying the goal and achievement layers.
Deployed target is GitHub Pages (`DEPLOY.md`). Audio, richer content packs and
morphology drills are not built — see `ROADMAP.md`.

**Known limit:** 184 lexicon entries (154 drillable, 30 reference) over 164
sentences. Simulation shows the i+1 selector runs out of new material around
day 31 and goes review-only from about day 35. More content is the binding
constraint, not more features — and the dashboard now prints that ceiling
next to the B1 projection so the projection is not read as a promise.

73 of the 184 entries are `reviewed: false`, pending Luna or Sarnai, as are
the machine-written level and badge names in `src/core/goals.js`.
