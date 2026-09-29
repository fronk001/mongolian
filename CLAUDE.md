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

Or headless, from the command line (exit 0 = pass; ported from Life Hub):

```
py tools/run_tests.py                          # tools/test.html: core, sync layout/merge/rebase included
py tools/run_tests.py tools/engine-test.html   # sync engine: devices + pretend server
py build.py && py tools/run_tests.py tools/smoke.html   # built app, two frames syncing
py tools/run_tests.py tools/firebase-check.html # real Firebase SDK from the CDN (internet, no account)
```

Run the first two after any change to `src/core/` or `src/sync/`; the smoke
test after touching `ui/`, `sw.js` or `build.py`; the Firebase check after
touching `firebase.js` or bumping the SDK version.

`build.mjs` and `tools/test.mjs` are the original Node versions. They cannot
run here and are not maintained; `build.py` and `tools/test.html` are
authoritative.

## Layout

```
src/core/     fsrs.js scheduler.js progress.js grade.js    ← pure logic, no DOM
              goals.js choices.js                          ← goal/streak/XP telemetry, MC distractors
              sync.js                                      ← online layout, diff, merge, rebase
src/sync/     engine.js (queue, sign-in flow, rules below), firebase.js (the only file
              that knows Firebase), firebase-config.js, fake-backend.js (tests, ?fake-sync)
src/ui/       app.js views.js account.js *.css             ← DOM lives only here
src/data/     words.json sentences.json                    ← large; avoid reading unless changing content
build.py      copies files, rewrites app.js's imports, injects SW precache list
tools/        serve.py (dev server), run_tests.py (headless), test.html (core suite),
              engine-test.html, smoke.html, firebase-check.html
              mockups*.html — design references for the v3 redesign, not shipped
SYNC.md       Fred's steps to turn sync on
```

No bundler and no npm dependencies. Browsers load the ES modules directly;
the build only copies, concatenates CSS, generates icons, and stamps sw.js.

## Rules

- **Instrument design system.** Read `docs/INSTRUMENT.md` before touching UI.
  v3 ("Соёмбо") is a paper ground with the flag's own colours plus one addition:
  red names action and error, blue names known/verified/progress, green names
  a right answer right now (verdict panel, matching choice, the continue
  button that follows it), gold is the goal layer only and is **never** used
  as type (1.6:1 on paper).
  The rule that bites: *numbers are real* — the app now has XP, levels,
  streaks and badges, but every one is derived from an event that actually
  happened (a card graded, a stability gained, a session finished). Adding a
  figure that cannot be traced to a real event breaks the system.
- **Interface chrome is English only.** Buttons, headers, verdicts, labels,
  badges — the app's own voice — are English, full stop; stacking a Mongolian
  label over its English gloss on every control read as overstimulating.
  Mongolian still appears wherever it *is* the content being taught or
  tested — a flashcard face, a sentence prompt, a vocabulary translation in a
  context chip — and there it still carries its English pair, because a
  translation without one is not a translation. `gl()`/`gli()` in `views.js`
  render those content-pair captions unconditionally now.
- **Offline first.** The app opens and studies with no connection at all.
  Fonts are self-hosted; no CDNs. The one external request is sync's
  Firebase SDK from gstatic, loaded after the first paint and needed only
  for sync — CI's URL check allows exactly that address in
  `dist/sync/firebase.js` and nothing else. The service worker only handles
  same-origin requests, so sync traffic never goes through it.
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
- **One grade per word per session.** `awardGrade()` in `app.js` keeps a set
  and ignores a repeat. Two sentences can share a target (a sentence is skipped
  only when *every* word it teaches is covered) and drills sit alongside
  sentences carrying the same vocabulary. Grading twice applies the FSRS
  same-day term twice — about 1.29× stability each time — and counts one memory
  as two reviews and two XP awards. `tools/test.html` asserts drills and
  sentence targets never intersect.
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
py tools/coverage.py               # 93% of tokens, 160/164 sentences covered
py tools/coverage.py --unmatched   # what is still missing
```

## Native-speaker review

Machine-written Mongolian never ships as confirmed. `reviewed: false` on a
lexicon entry and `altReviewed: false` on a sentence both mean "pending Luna
or Sarnai". To get it signed off:

```
py tools/review-sheet.py                       # -> tools/review.html
py tools/review-sheet.py --apply review.json   # merge what comes back
```

The sheet is one self-contained file (gitignored — regenerate it, don't commit
it). She opens it by double-clicking, answers Зөв / Буруу / Мэдэхгүй per item,
and presses Дуусгах to download a JSON file. Progress autosaves to her
browser, so it survives closing the tab. Nothing is uploaded anywhere.

It asks about the **Mongolian only** — the 444 English alternatives are not
her job and including them would quadruple the work. The highest-value field
is the free-text box under each sentence: a phrasing Fred would really hear
beats a rule-derived one that is merely legal.

`--apply` deletes rejected alternatives, appends hers, sets `altReviewed: true`
only when *every* alternative on that sentence was ruled on, and signs off
lexicon entries. Badge names are printed for hand-editing in `core/goals.js`.

## State

`localStorage['mng_study_v2']` — see `blank()` in `src/core/progress.js`.
v1 saves are migrated automatically on load; box level seeds stability,
accuracy seeds difficulty.

Fields are **additive only**. `normalise()` merges saved state over `blank()`,
so a code written before a field existed imports with its default rather than
being rejected — that property is what keeps old backup codes working, and
`tools/test.html` asserts it for both v1 and pre-redesign v2 codes.

Progress lives in the browser that created it; with sync on (below) it is
also kept online and shared by every device signed in. A backup code is a
manual transfer, and `importCode()` **replaces** the whole state rather than
merging — while synced, the online copy too (`commit(P, { replace: true })`).

- `lastExport` — day a code actually left the device. Only set when a copy or
  share succeeded; a dismissed iOS share sheet must not record one.
  `exportAge()` returns days since, or null. The home screen warns at 14 days,
  but only while the device doesn't sync (`todayNotice()` in `account.js`).
- `gloss` — legacy field from when chrome carried an English gloss under its
  Mongolian and the pairing was switchable. Chrome is English-only now, so
  nothing reads this field any more; it is kept only because backup codes are
  additive-only and old codes still carry it.
- `mcMode` — word cards as multiple choice. Off gives a text field graded by
  the same `gradeText()` the sentences use. Switchable mid-question, both ways.
  A multiple-choice answer **grades itself** — right is «Сайн», wrong is
  «Дахин» — because the pick already settles whether it was recalled. Only the
  typed card and the sentences show the grade bar. See INSTRUMENT.
- `wordDrills` — how many of the day's due/new words are drilled as isolated
  word cards, default **8**, cycled from Тохиргоо (0 / 4 / 8 / 14). Reserved by
  `buildSession()` *before* sentences are scored, never overlaid on them: a
  word is presented once per session, so it is graded once per session.
  Word cards used to be residue — a card appeared only where no chosen sentence
  happened to contain the word — and with 164 sentences over 184 words a cold
  start produced none at all on days 1, 2 and 4.
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

## Sync

Built 28 Sep 2026, on the pattern of Life Hub's (`../life-hub`, its CLAUDE.md
"Sync"): Firestore + Firebase Auth (email + password) in the **same project
and account** (`life-hub-fred`, the "Mongolian" web app registration in
`src/sync/firebase-config.js`), SDK 12.19.0 as ES modules from gstatic. The
app is initialised under its own name (`'mongolian'`) so its sign-in never
tangles with Life Hub's where both share an origin (fronk001.github.io).
Rules: `firestore.rules` in the Life Hub repo covers both apps; Fred pastes it.

- **Layout** (`core/sync.js`), under `users/{uid}/mongolian/`: `main`
  (settings, xp, badges and grammar as maps, `seq`), `items-N` (words
  N·100…N·100+99: `items` = FSRS state, `introduced` = set), `YYYY` (history
  rows keyed by day). A word is 16 index entries; one document would hit
  Firestore's 40k-entry limit at ~2,500 words — the B1 goal — so buckets.
- **Changes** are `diff()` ops on that layout, each with `from` (the old
  value). A word's FSRS state is one value (atomic); everything else is
  field by field, so separate words and separate days never collide.
- **Local first.** The app still saves `P` to localStorage on every change;
  `save()` in app.js then calls `sync.commit(P)`, which queues the ops in
  `mng_study_v2:sync` (`{ owner, device, seq, pending }`) until confirmed.
  The first paint never waits for the SDK.
- **First sign-in of a device combines** (`mergeStates`): per word the later
  review (`last`, then reps), every history day (a day on both keeps the
  fuller row whole), badges/introduced united, grammar per topic the count
  with more attempts, **xp = max** (no common base: a sum would count the
  shared part twice), settings from the copy with the later `lastDate`. So
  sign-in order doesn't matter and no last code transfer is needed. An
  empty cache never counts as an empty server (`fromCache`).
- **After that the server wins**: each snapshot, overlaid with this device's
  pending ops, replaces `P` (`adopt()` in app.js). It redraws only when
  `quiet()` — not mid-lesson/drill, nothing half-typed.
- **Offline changes are rebased** when sent (`rebase`): a field still at
  `from` goes as is (always, while online); otherwise counters (xp, a day's
  reviews/newWords/onTime/late/xp, grammar right/wrong) add this device's
  gain to the server's figure, a word keeps the later review, lastDate /
  lastExport the later, createdAt the earlier, the rest last-writer. Batches
  are held (not handed to the SDK) whenever the last snapshot was fromCache,
  so the SDK never replays stale absolute values. Imports (`replace`) and the
  join batch are never rebased.
- **No double counting**: each batch writes `main.seq.{device} = n` in the
  same atomic commit; on the first live snapshot, pending batches with
  `seq <= main.seq[device]` landed already (ack lost when the app closed)
  and are dropped. A join batch that never landed makes the next start join
  again.
- **Sign out** only stops syncing: owner/pending cleared, progress kept; the
  next sign-in combines again. A session that ends by itself keeps the owner
  and keeps queueing.
- **UI** (`ui/account.js`): SYNC panel first on Settings (OFF / CONNECTING /
  ON / OFFLINE / SYNCING / SIGNED OUT / NOT SYNCING); Today shows nothing
  while synced (the online copy is the backup, so the 14-day code reminder
  steps aside), a red notice for SIGNED OUT / NOT SYNCING. The sign-in form
  is outside `#app` (re-renders would wipe typing).
- **Reloads only when idle**: after an offline start the SDK import is
  cached as failed, so the retry reloads the page — only on the Today/other
  tabs with nothing typed (`idle()`), and only after an `online` event or
  the app coming back into view (never in a loop). A new service-worker
  version waits the same way; the very first install reloads nothing.
- **Dev switch** `?fake-sync=<device>`: the pretend server in localStorage
  (`mng:fake-server`), on a progress copy under `mng_study_v2:fake:<device>`
  — the real progress is never touched. Test accounts in `fake-backend.js`.
- Known, accepted: two devices grading at the same instant while both are
  online, or in the ≤10 s before the SDK notices a dead connection, resolve
  xp last-writer-wins. Real use is one device at a time.
- Known: a refusal (NOT SYNCING: the rules, a used-up quota) is not retried
  by itself. The listener is dead and a refused batch stays in `sent`, so
  only a reload recovers: Try again, or a new version loading. An installed
  phone app can stay open for days, so after any rules change, tap Try again
  on each device.

## Current status

FSRS-6 scheduling with i+1 sentence selection, Instrument v3 ("Соёмбо") on
paper, flashcard deck for new words, a reserved word-drill phase in both
directions (multiple choice or typed, switchable mid-question), and a week-led
dashboard carrying the goal and achievement layers.
Deployed target is GitHub Pages (`DEPLOY.md`). Audio, richer content packs and
morphology drills are not built — see `ROADMAP.md`.

**Sync: live since 29 Sep 2026.** Fred is signed in on the laptop (Chrome,
the published app) and in the installed iPhone app, and confirmed both show
the same progress. Until then the laptop had quietly kept its own copy (27
words from the August import) while the online copy stayed empty: a device
that was never signed in looks exactly like a synced one on Today.

**Known limit:** 184 lexicon entries (154 drillable, 30 reference) over 164
sentences. Simulation shows the i+1 selector runs out of new material around
day 31 and goes review-only from about day 35. More content is the binding
constraint, not more features — and the dashboard now prints that ceiling
next to the B1 projection so the projection is not read as a promise.

**Luna's first review landed August 2026** (`docs/mongolian-review.json`). All
73 outstanding lexicon entries are signed off, all 12 badge names approved,
and 111 Mongolian alternatives ruled on — 104 kept, 7 rejected. Nothing in
`words.json` or `sentences.json` is `reviewed: false` or `altReviewed: false`
any more.

Four sentences she rewrote outright: where she rejected *every* generated
variant and wrote her own, that phrasing replaced the canonical rather than
joining it, because each rejection pointed at a word in the canonical itself
(«орон»→«ор», «зулзага»→«зулзаган», «хумхиж»→«эвдэлж», «эмнэлэгт аваач»→
«эмнэлэгрүү авч яв»). Those four carry `partial: true` and dropped coverage
from 94% to 93% — the vocabulary they introduce is not in `words.json` yet.
**ROADMAP 2c lists the four questions that need her before that closes.**

`altReviewed` tracks the **Mongolian only**; sentences with English-only
alternatives carry no flag, or they would sit "pending" for ever.
`alternatives.py` will not regenerate over `altReviewed: true` — re-running it
after a review would otherwise bring back every rule she rejected.
