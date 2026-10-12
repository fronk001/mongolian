# B — Sound: feedback effects now, pronunciation audio next

Workstream B of the "make it shine, beat Ling" plan. It answers Fred's feedback point 2. Phase A
(effects) is about one build session and needs nothing from the other workstreams. Phase B
(pronunciation) is about four sessions plus roughly 75 minutes of Sarnai's time.

---

## 1. Problem

Fred, verbatim: **"there are no sound effects"**.

The audit evidence:

- **There is no audio anywhere in the app.** A search of `src/` for `AudioContext`, `new Audio`,
  `<audio`, `speechSynthesis`, `vibrate`, `.mp3` and `.m4a` finds 0 matches.
- **INSTRUMENT rules sound out by implication.** `docs/INSTRUMENT.md:167-171` says "Grading a card
  advances instantly … The one celebration is the session-close screen … a summary, not a fanfare."
  `docs/INSTRUMENT.md:141` lists the native-audio "Waveform / recording credit chip" as *not yet
  built*.
- **Every verdict already runs inside a user gesture.** The verdict sites are `src/ui/app.js:460`
  (pick), `:475` (check-word), `:486` (submit), `:528/:535/:550` (grammar) and `:322` (finish(),
  reached from advance()). All of them run inside the one delegated click listener (`app.js:421`) or
  the keydown listener (`:608`). That is the user activation iOS needs to start audio
  (audits-plat, "iOS unlock and lifecycle").
- **Five traps would break a naive build:**
  - A new `src/ui/*.js` module is not copied into `dist/` (`build.py:66-67`) or rewritten (`:71`), so
    the built app would open blank.
  - Every file in `dist/` is precached all-or-nothing (`build.py:124-128`, `src/sw.js:17-19`), and
    `activate` deletes every other cache (`sw.js:21-26`). Audio placed in `dist/` would be downloaded
    again on every deploy.
  - `sw.js:36-48` ignores `Range` headers, and Safari's `<audio>` sends them. Cached clips can
    therefore fail to play on the iPhone and nowhere else.
- **No Mongolian voice exists offline.** Measured on Fred's devices: Chrome on the laptop lists 19
  voices with none in mn-MN, and Apple's speech languages have no Mongolian (audits-plat,
  "browser speech voices").
- **The roadmap's audio plan is stale.** `ROADMAP.md:89-104` still plans clips in IndexedDB
  "because Cache Storage caps near 50MB on iOS". That has been false since Safari 17 (up to 60% of
  disk; webkit.org/?p=14403).

---

## 2. What Fred will experience

The rules for this section:

- Sound adds **no** text to a question before it is answered.
- Every new label is one to three words.
- The word counts below are the *change* to the screen budgets measured in audits-gami.

### 2.1 Phase A — feedback effects

**Settings → OPTIONS** gains one row, placed under "Word drills" (+6 words, +4 more on the iPhone):

```
Sound effects                          [ On ]
this device · silent switch mutes it
```

- Tapping the button cycles **On → Soft → Off → On**.
- Switching to On or Soft plays the `right` cue once, at the new level, as a preview. This is the
  only chrome tap in the app that makes a sound.
- The caption fragment "· silent switch mutes it" appears only on iOS.
- The setting belongs to this device. The laptop and the phone each keep their own.

**Lesson, multiple-choice word card.** Fred taps an option.

- **Right answer:** a short bright two-note rise (`right`, 245 ms) sounds at the same instant the
  option turns green.
- **Wrong answer:** a soft two-note fall (`wrong`, 310 ms) sounds as the pick turns red and the truth
  turns green.
- Nothing else changes, and no new words are added.
- **On the 5th, 10th, 15th… first-try correct answer in a row:** the rise gains a third, higher note
  (`combo`, 410 ms). The verdict label reads `CORRECT · 5 IN A ROW` (+3 words, only on those
  answers). Whether that label is shown is decision D4. The sound plays either way.

**Typed word card and sentence.** Fred presses Check (or Enter). The cue plays as the verdict panel
appears:

- An exact match or an accepted spelling slip gives `right`. The SPELLING note still explains the
  slip.
- A mismatch gives `wrong`.
- The grade-bar taps that follow are silent.

**Building-block tiles** (built by the learning-loop workstream). Every tile placed gives a 35 ms
`tick`. A tile tapped back out gives a lower `tock`. Check gives the verdict cue. The existing
grammar BUILD drill gets the same ticks.

**A retried mistake** (learning loop). The verdict gives `right` or `wrong` as normal. A retry never
plays `combo` and never moves the run count.

**Session close.** When the Done screen appears, a rising four-note arpeggio plays (`finish`,
790 ms). It is replaced by `milestone` (the arpeggio resolving into a held chord, 1.5 s) when that
session crossed a level, earned a badge, or completed the daily goal defined by the gamification
workstream. Nothing on Done changes: 0 words.

**Grammar drills and reading questions.** They use the same `right`/`wrong` cues. There is no
`finish` cue on a grammar or reading done screen; the last verdict has just sounded.

**Never makes a sound:**

- app open, tab switches, Start, Close, ✕;
- deck flips, "Learn", "I know this";
- Continue, typing, grade-bar taps, "That was easy";
- sync status changes, snapshots, sign-in and sign-out;
- the service-worker update reload;
- copy, share, import and their errors;
- reading a passage, tapping a gloss, revealing a translation;
- anything while a pronunciation clip is playing.

There is no background music, no looping sound and no vibration.

### 2.2 Phase B — pronunciation audio

**Speaker button with credit chip.** Wherever a recording of the exact Mongolian on screen exists, a
small `▶` with a mono credit chip appears: `▶ SARNAI` (+1 word). If no recording exists, there is no
button at all; there are never disabled placeholders. The button appears in four places:

- **Deck:** under the Mongolian face.
- **Word card:** inside the verdict panel, after answering. It is never on the prompt, where it
  could give the answer away. After a wrong answer, hearing the right word is the corrective
  feedback.
- **Sentence:** inside the verdict panel, with `0.75×` beside it (+2 words). This is the
  listen-and-shadow moment.
- **Reading:** per line, and a `Listen` button that plays every line. It appears only after the
  first silent read (see 3.6).

How it plays:

- Tap plays the clip from its trimmed start.
- Tapping again restarts it.
- A 32-bar waveform under the button fills blue as the clip plays (INSTRUMENT's "waveform with
  played/unplayed").

**Settings → OPTIONS** gains a second row once at least one recording exists (+5 words):

```
Play recordings                        [ Off ]
after each answer
```

- When it is on, the clip of the correct answer plays automatically after the verdict cue, and a
  new deck face speaks when it appears.
- It is off by default, because playing a clip pauses Fred's music or podcast on the iPhone
  (see 3.5).

**Grammar tab: "Hear the difference" topics.** These are listening drills built from Sarnai's
minimal-pair recordings. They appear in the same list as the grammar topics, tagged `SOUND`, and
only once at least six of a topic's pairs have both clips. The rows are:

- `Long and short vowels`
- `Verbs that sound alike`
- `Adjectives that sound alike`
- `Front and back vowels`

The **intro** on a first visit is about 24 words, for example: "A doubled vowel is held about twice
as long, and the length changes the word. Listen, then pick the word you heard." On a revisit it
shrinks to the title and `Start · 8 items`, following the less-text pattern.

**Drill screen** (about 10 words before answering, 12 after):

```
SOUND                                  3 / 8
            [ ▶ ]          ← plays once on arrival; tap to replay
[1] хол   far                [2] хоол   meal
```

- Picking an option colours the options as in multiple choice and plays the `right`/`wrong` cue,
  then shows `CORRECT` or `WRONG`.
- Each option then gets its own `▶` so Fred can compare the two.
- `Continue` moves on.
- The done screen is the existing grammar done screen.

**Sarnai's recording page** is a tool on the laptop, not app chrome, so it carries bilingual labels
like the review sheet:

- A header shows the speaker name and progress (`Сарнай · Sarnai — 12 / 56`).
- One item at a time: large Mongolian, small English, and a live level bar while recording.
- Space starts and stops a take. The take plays back. Enter keeps it, R redoes it, F flags "this
  wording is wrong or unnatural" with an optional note.
- Nothing ever leaves the laptop.

### 2.3 Word budget summary

| Screen | Change |
|---|---|
| Settings | +6 (Sound effects), +4 on iPhone, +5 (Play recordings, once clips exist) |
| Question screens before answering | 0 |
| Verdict panels | +1 (credit chip); +1 on sentences (`0.75×`); +3 on combo answers if D4 = label |
| Deck | +1 (chip, when recorded) |
| Done | 0 |
| Listen drill | about 10 / 12 (new screen) |

---

## 3. Mechanics

### 3.1 Why effects at all, and why this small

There is no controlled study showing that feedback sounds improve retention (research-science item
4, confidence low). What the evidence does support:

- Feedback works through its **information content** (Wisniewski et al. 2020, d=0.48).
- Feedback that is **contingent on success** raises felt competence, while *amplified* feedback
  lowers it (Kao et al., CHI 2024, n=1,699).
- **Irrelevant sound hurts learning** (Moreno & Mayer 2000).

So the vocabulary is kept as small as INSTRUMENT's motion table:

- every cue follows a real, scored event;
- the cues are short, consonant and never punishing;
- nothing plays on ordinary taps;
- nothing plays over Mongolian audio or during reading;
- there is an Off.

Duolingo uses the same small set: a correct chime, a deflated descending wrong tone, a
lesson-complete jingle, and a combo for answers in a row (research-competitors, "Sound effects and
feedback juice"). The cues are synthesised with Web Audio, which needs no files, nothing to
precache and no URL for CI to flag (audits-plat, "Sound effects: delivery").

### 3.2 Cue palette

All cues are synthesised. Every note is an `OscillatorNode` into its own `GainNode` envelope:

- `setValueAtTime(0.0001, t)`, then
- `exponentialRampToValueAtTime(peak, t + attack)`, then
- `exponentialRampToValueAtTime(0.0001, t + end)`.

Each oscillator stops at `end + 0.02 s`. Ramping from and to 0.0001 avoids clicks at start and stop.

Every note goes through the cue's optional filter, then the **master gain**:

| Level | Master gain |
|---|---|
| On | 0.70 |
| Soft | 0.25 (−9 dB) |
| Off | no AudioContext is created at all |

Times are in ms, relative to the cue start. "Peak" is the note's gain before the master.

| Cue | When | Notes (wave, Hz, start, attack, end, peak) | Filter | Total |
|---|---|---|---|---|
| `right` | first-attempt or retry answer accepted | triangle A5 880.00 @0, a5, e110, 0.30 · triangle E6 1318.51 @75, a5, e245, 0.30 | — | 245 |
| `wrong` | answer not accepted | triangle G4 392.00 @0, a8, e140, 0.26 · triangle E♭4 311.13 @110, a8, e310, 0.26 | lowpass 1400 Hz, Q 0.707 | 310 |
| `combo` | replaces `right` on the 5th, 10th… consecutive first-attempt correct answer | `right`'s two notes, then triangle A6 1760.00 @150, a5, e410, 0.26, plus sine A7 3520 @150, a5, e350, 0.05 | — | 410 |
| `tick` | a tile placed into the answer line | sine 1600 @0, a1, e35, 0.12 | — | 35 |
| `tock` | a placed tile tapped back out | sine 1200 @0, a1, e35, 0.10 | — | 35 |
| `finish` | the lesson's Done screen appears | triangle C5 523.25 @0, E5 659.26 @90, G5 783.99 @180 (each a5, +160 ms, 0.22) · C6 1046.50 @270, a5, e790, 0.24 | — | 790 |
| `milestone` | replaces `finish` when the session crossed a level, earned a badge, or completed the daily goal | `finish`'s four notes, then a triangle chord C6 1046.50 + E6 1318.51 + G6 1567.98 @380, a20, e1480, 0.12 each | — | 1480 |

The choices behind these numbers:

- **Frequencies stay at 300 Hz or above.** Phone speakers roll off below roughly 300–400 Hz, so a
  lower `wrong` would vanish on the iPhone. `wrong` uses triangle waves so that its 3rd harmonic
  (about 930–1180 Hz) carries the sound.
- **`wrong` is not a buzzer.** It has no square or saw wave, no dissonance and nothing under 300 Hz.
- **Output peaks have headroom.** The largest sum at master On is about 0.29 (the milestone chord
  plus the tail of the last arpeggio note), which is about −11 dBFS. Pronunciation clips are
  recorded to peak near −3 dBFS (3.7), so effects always sit about 8–10 dB under Sarnai's voice.
- **One tuning pass is allowed.** The builder may move any peak by up to ±6 dB and any duration by
  up to 20% after listening on both devices. The tests pin the ceilings, not the exact values.

**Voice handling.**

- **One cue at a time.** Starting any non-tick cue fades the voices of a still-sounding cue to 0 over
  15 ms (`setTargetAtTime`, τ = 5 ms) and stops them. Fast keyboard answering (1–4 then Enter)
  therefore never stacks chimes.
- **Ticks** are rate-limited: a tick less than 40 ms after the previous one is dropped.
- **Double-fire guard:** the same cue name requested twice within 60 ms plays once. This covers
  Enter plus click.
- **Clip interplay:** a verdict action first stops any playing pronunciation clip, then plays its
  cue. Ticks requested while a clip plays are dropped.
- **Scheduling** is at `ctx.currentTime + 0.005`. Nothing in the click path is awaited.

### 3.3 The combo: a real run of first-attempt answers

Session state only (S), never persisted:

- `S.run` is reset to 0 on `start` (lesson) and on `grammar-open` (topic).
- `S.summary.bestRun` is the highest `S.run` reached this session.

How answers move the run:

- **A first attempt** is any verdict on an item without `item.retry` (the learning loop's
  re-queued copy). If the answer was accepted, `run += 1`; if not, `run = 0`. A typo accepted as
  Hard counts as accepted.
- **Retries, deck taps, self-grade buttons and the learning loop's "My answer was right" override**
  neither increment the run nor reset it.
- **Reading comprehension questions** answered inside a lesson count as first attempts.

The cue is `combo` when the answer was accepted and `run % 5 === 0`; otherwise it is `right`, or
`wrong` when not accepted. A 21-item lesson can therefore produce at most four combos.

Why it is built this way:

- **Every 5, a fixed cue, never escalating:** amplified feedback lowered competence in Kao et al.
  (CHI 2024), and Duolingo uses the same 5-in-a-row unit (research-competitors).
- **No XP bonus.** A combo multiplier would break INSTRUMENT principle 3's definition of XP
  (audits-gami, "What 'numbers are real' forbids"). The combo is a sound plus, optionally, a label
  that states the real count.

### 3.4 Device-local volume and mute

- **Storage.** The setting lives in `localStorage[`${KEY}:prefs`]` as `{"sound":"on","autoplay":false}`.
  `KEY` is `mng_study_v2`, or `mng_study_v2:fake:<device>` under `?fake-sync`. That keeps test
  copies isolated, and smoke.html's cleanup regex `/^mng(_study_v2)?:fake/` already removes them.
- **Robustness.** Every read and write is wrapped in try/catch. Missing or corrupt JSON gives the
  defaults, and a private window simply keeps the choice in memory for that visit.
- **Why not in P:** every sync snapshot replaces P with the server copy (`engine.js:121-127` →
  `app.js:57-61`), and P is also the backup code. A setting stored in P would be shared across
  devices and would travel inside codes (audits-plat, "mute preference storage"). The laptop at a
  desk and the phone on a train want different settings.
- **Defaults:** `on` for effects, because Fred asked for them. `false` for autoplay.
- **Off** means the AudioContext is never created, which saves battery. Pronunciation taps still
  play, because they are content he asked for, not effects.

### 3.5 iOS unlock, silent switch and lifecycle

**Unlock.** `sound.unlock()` is the first statement of both the click listener (`app.js:421`) and
the keydown listener (`:608`), before the `data-act` check, so any tap warms the context up. It:

1. creates the `AudioContext` lazily on the first gesture, with `{latencyHint:'interactive'}` and a
   `webkitAudioContext` fallback;
2. on that first call only, starts a 1-sample silent buffer (the belt-and-braces unlock older iOS
   versions needed);
3. on every call, calls `ctx.resume()` if `ctx.state !== 'running'`. This includes iOS's
   non-standard `'interrupted'` state after a call or after backgrounding (WebKit 263627 and
   291892).

The result of `resume()` is never awaited. The keyboard path is covered too: `keydown` is an
activation-triggering event, and the synthesised `b.click()` runs inside it.

**Measured on this laptop** (headless Edge 155):

- an `AudioContext` created without a gesture starts `suspended`;
- an `OfflineAudioContext` render of the `right` cue as specified peaks at 0.241, which confirms the
  synthesis code path works in the browser that runs the tests.

**Silent switch.** WebKit treats Web Audio as "ambient": the ring/silent switch mutes it and it mixes
with other apps' audio (WebKit bug 237322). That is the right behaviour for effects (decision D2):

- `unlock()` sets `navigator.audioSession.type = 'ambient'` explicitly where the API exists
  (Safari/iOS 16.4+).
- Pronunciation clips are explicit taps, so `speak()` sets the type to `'playback'` just before
  `audio.play()`. That makes the clip audible through the silent switch, and it pauses other audio,
  which is acceptable after a tap.
- On `ended`, `pause` or `error`, the type goes back to `'ambient'`.
- Where the API is missing (older iOS, Windows), nothing is set. Windows has no silent switch.

**Lifecycle.**

- The context is suspended after 30 s with no cue, and immediately on `visibilitychange → hidden`.
  `unlock()` resumes it in the next gesture. Cues scheduled while it is still resuming play the
  moment it runs, because `currentTime` is frozen while suspended.
- Sound is never played from async callbacks such as sync snapshots, `adopt()`, timers or the
  service worker, because those run outside a gesture.
- `play()` never throws. Headless Edge's synthetic `.click()` is not a user activation, so the
  smoke test runs with a context that never starts. That must stay silent and harmless.

**Haptics: none.** `navigator.vibrate` does not exist on iOS Safari, and the laptop has nothing to
vibrate. The only iOS route is a non-standard checkbox-switch hack that is reportedly patched
(audits-plat, "Haptics").

### 3.6 Pronunciation playback rules

**Text keys.** A clip is a recording of *exact text*, so the manifest is keyed by normalised
Mongolian:

```
textKey(mn) = norm(mn.normalize('NFC').replace(/[«»]/g, ''))
```

`norm` is `core/grade.js:23-24`: lowercase, strip `.,!?;:"'`’`, collapse spaces. The consequences:

- If Luna rewrites a sentence, its old clip stops matching and simply stops showing. That is
  correct, because the old audio would teach the old wording. The new text joins the recording
  queue.
- A word, a minimal-pair item and a one-word sentence with the same text share one clip.

**Which clip plays:** a clip with `ok:true` from a human speaker, in the order Sarnai, then Luna.
Machine clips (only if D8 changes) come last, are never autoplayed and never used in listen drills.
Rejected clips are never played.

**The player.**

- One shared `HTMLAudioElement`, created on first use inside a gesture.
- `src = ./audio/<file>#t=<start>,<end>` (a W3C media fragment, so the recorder's trim needs no
  re-encoding).
- `preservesPitch = true` (with the `webkitPreservesPitch` fallback) so `0.75×` keeps Sarnai's
  pitch.
- A rejected `play()` promise (NotAllowedError) is swallowed silently.

**Why `<audio>` rather than Web Audio for clips.** `<audio>` keeps pitch at 0.75×, and slowing down
is the most useful learner control. The two costs are handled elsewhere:

- iOS ignores `audio.volume`, so loudness is evened out at recording time (3.7).
- Safari sends Range requests, so the service worker answers them (3.8).

**Autoplay** (opt-in, decision D6). On a verdict, the clip of the canonical answer starts at the
cue's end + 120 ms (`word.mn` for word cards; `sentence.mn` for sentences, even when Fred typed an
accepted alternative). A new deck face speaks when it appears. Autoplay is never used:

- during the first read of a passage (Diao & Sweller 2007: simultaneous text plus speech hurt
  beginners' foreign-language reading comprehension, research-science 3b);
- for machine clips.

**Offline.** At boot, `caches.open('mng-audio').then(c => c.keys())` fills a `cachedAudio` set. The
`▶` shows when the clip is cached or `navigator.onLine` is true. A failed play hides the button for
the rest of that screen.

### 3.7 Recording quality rules (Sarnai's page)

**Capture settings.** `getUserMedia({audio:{channelCount:1, echoCancellation:false,
noiseSuppression:false, autoGainControl:false}})`, then
`new MediaRecorder(stream, {mimeType:'audio/mp4;codecs=mp4a.40.2', audioBitsPerSecond:48000})`.

**Measured on this laptop:** headless Edge 155 returns `MediaRecorder.isTypeSupported` = true for
`audio/mp4;codecs=mp4a.40.2` and for `audio/mp4;codecs=opus`. WebCodecs `AudioEncoder` AAC is false.
A real-microphone capture could not be exercised headless, which is why the first build step is a
10-minute spike (section 7).

**Format: AAC in .m4a, nothing else.** iPhone recordings and Safari's MediaRecorder produce it, and
Safari and Chrome both play it. Ogg Opus does not play in Safari, and WebM Opus in `<audio>` is
unreliable on iOS. There is no ffmpeg, sox or lame on this machine, and the Python standard library
cannot transcode (audits-plat).

**Calibration, once per sitting:**

- 3 s of room tone sets the noise floor. If it is above −45 dBFS, the page shows "quieter room or
  closer mic".
- One test phrase must peak between −12 and −1 dBFS. Otherwise the page shows "move closer" or
  "move back".
- The page records the distance she used, so later sittings match.

**Per take, measured after `decodeAudioData` on the page:**

- the peak;
- the RMS;
- speech start and end: the first and last 10 ms window that is 12 dB above the noise floor,
  padded by 120 ms;
- 32 waveform peaks, each scaled to a digit 0–9.

**Automatic retake prompts:**

- the peak reaches 0.99 (clipped);
- the peak is below 0.1 (−20 dBFS, too quiet);
- no speech is detected;
- the take runs more than 2.5× the median length for its kind.

### 3.8 Storage and caching

**A separate, unversioned `mng-audio` cache.**

- Audio files are named by content (`<sha1[:12]>.m4a`).
- They are listed in an `AUDIO` array that build.py injects into `sw.js`.
- They are left out of `ASSETS` and out of the version digest. A content-hashed name already
  versions itself, and leaving it in the precache would make every deploy re-download every clip
  and let one failed clip block the update (audits-plat, "storage, format, size budget").
- `src/data/audio.json` (the manifest) *is* precached, so a new recording set does produce a new
  app version, and the app always sees the manifest that matches its clips.

**`activate`:**

- deletes every cache except `CACHE` and `mng-audio`;
- prunes `mng-audio` entries that are not in `AUDIO`;
- then claims clients as now.

**Fill.**

- On `activate`, and on a `postMessage('audio-fill')` the app sends after the first paint on every
  boot, the worker walks `AUDIO` in manifest order and fetches each missing file **sequentially**
  under `e.waitUntil`.
- It stops at the first network error and resumes on the next boot, because it checks what is
  missing each time.
- The order is: minimal pairs, words, sentences, readings.
- **Size cap:** above `AUDIO_FILL_LIMIT = 15 MB` total, the background fill stops after the words.
  Sentences and readings are then cached on first play, and the app prefetches the next session's
  clips at Start.
- Today's estimate at 48 kbps AAC mono (about 6 KB/s, including untrimmed padding) is about
  6–9 MB, so everything fills in the background and plays fully offline.

**Range requests.** A new branch in the fetch handler covers same-origin `GET`s under `/audio/`:

1. Look up the full file in `mng-audio`, matching on the URL without fragment or search.
2. If it is not there, `fetch(request.url)`. That is a fresh request with no Range header, so
   GitHub Pages returns a full 200. A 200 response is cached.
3. With no Range header, return the full response.
4. With one, parse `bytes=(\d*)-(\d*)`, slice the array buffer, and return `206` with
   `Content-Range: bytes s-e/size`, `Content-Length`, `Accept-Ranges: bytes` and
   `Content-Type: audio/mp4`.
5. An unsatisfiable range returns `416` with `Content-Range: bytes */size`.

The parsing lives in `parseRange(header, size)`. It is kept in `src/sw-range.js` and inlined into
`dist/sw.js` by build.py (no `importScripts`, no module service worker), and tools/test.html loads
`src/sw-range.js` directly to test it.

This is the fix for WebKit bug 184447. Workbox documents the same approach: precache whole files and
answer ranges with 206.

**Storage quota.** `navigator.storage.persist()` is already requested on boot (`app.js:638-644`).
Since Safari 17 a site, including a home-screen app, may use up to 60% of disk, with Cache Storage
and IndexedDB sharing that quota. That is why ROADMAP 3's IndexedDB plan is no longer needed for
shipped clips.

### 3.9 The listen drill ("Hear the difference")

**Topic shape.** Each topic has the grammar topic shape (`id`, `level:'SOUND'`, `title`, `summary`,
`sourceCite`, `drills`). Each drill is `{kind:'listen', id, pair:[{mn,en},{mn,en}]}`.

**Building a visit.**

- Which of the two words plays is chosen per drill per visit, with
  `makeRng(hashSeed(`${drill.id}:${dayKey()}:${visit}`))`. `visit` is a session counter in `S`.
- The option order is shuffled with the same RNG, so the answer cannot be memorised by position or
  by the replay order.
- A drill is *playable* only when both texts have a usable clip, and a topic is listed only with at
  least 6 playable drills.

**Grading.**

- Drills go through the existing `applyGrammarGrade(P, topic.id, ok)` tally and `xpForGrammar`, so
  they inherit the gamification workstream's cap on repeat passes.
- They are **not FSRS-graded.** Most pair words are not lexicon entries, and hearing a difference
  is perception, not recall. The one-grade-per-word rule is untouched.

**Why it is worth building.** High-variability phonetic training gives g=0.67 against control
(Uchihara, Karas & Thomson 2025), and pronunciation instruction gives d≈0.80–0.89 (Lee, Jang &
Plonsky 2015) (research-science item 7). Vowel length changes meaning in Mongolian, and every
textbook Fred owns drills it (section 5).

**No speech scoring.** Ling's users report unreliable mic scores (research-competitors, "Ling:
mistakes, review, audio and gamification"). Shadowing stays an ungraded "listen and repeat" by
pressing `▶` on the sentence verdict, because the evidence for shadowing is weak (small studies, no
meta-analysis; research-science 7).

---

## 4. Data and state

| What | Where | Default | Synced? | In the backup code? |
|---|---|---|---|---|
| Effects level `sound: 'on'\|'soft'\|'off'` | device-local `localStorage['${KEY}:prefs']` | `'on'` | no | no |
| `autoplay: boolean` | same key | `false` | no | no |
| `S.run`, `S.summary.bestRun`, `S.listenVisit` | session-only `S` | 0 | — | — |
| Listen-topic tallies | **existing** `P.grammar[topicId]` = `{right, wrong, last}` | absent | yes, through existing rules | yes, already |
| Clip manifest | `src/data/audio.json` (content, precached) | `{"v":1,"clips":{}}` committed from day one | — | — |
| Clips | `src/audio/*.m4a` → `dist/audio/` → `mng-audio` cache | — | — | — |

**No new P fields.** That means:

- no `blank()` change;
- no mergeStates, rebase or isCounter change;
- no Firestore document or rules change;
- nothing new in backup codes.

The listen topics reuse `P.grammar`, which already has a per-topic merge (`sync.js:270-271`,
`moreAttempts`), counter rebasing for `main.grammar.*.right/wrong` (`sync.js:286`) and latest-date
rebasing for `.last` (`sync.js:289`). New topic ids such as `snd_length` are new keys in an existing
map, and `diff()` sends them per key.

**Guard tests.** tools/test.html asserts that `blank()` has no `sound` or `autoplay` key and that
`encodeCode(P)` never contains them, so nobody later "helpfully" moves the setting into P.

**Manifest shape** (`src/data/audio.json`):

```json
{
  "v": 1,
  "clips": {
    "хоол": [
      { "f": "3fa9c0d1e2b4.m4a", "by": "sarnai", "t": [0.21, 0.94],
        "w": "02479986420000000000000000000000", "ok": true, "d": "2026-10-20" }
    ],
    "муур орон дээр унтдаг": [ { "f": "…", "by": "sarnai", "t": [0.18, 2.31], "w": "…", "ok": true, "d": "…" } ]
  }
}
```

The fields:

- `f` is the content-hash file name.
- `by` is the speaker id (`sarnai`, `luna`, or `tts:<voice>` if D8 ever changes).
- `t` is the trim in seconds.
- `w` is the 32-digit waveform.
- `ok` is the review state. Human takes kept by the speaker are `true`; machine clips are always
  `false` until Sarnai confirms them.
- `d` is the day recorded.

**Boot.** `boot()` fetches `audio.json` and `listening.json` with `.catch(() => default)`. Neither is
allowed to blank the app, unlike the core data files (`app.js:656-660`).

---

## 5. Content

### 5.1 Minimal pairs (new file `src/data/listening.json`, about 28 pairs, 56 clips)

These are original selections that follow the contrast categories the books teach. They are not
copies of any book's list or order. Every pair must be two real, common words, which Sarnai confirms
while recording (the F flag drops a pair). Most English glosses come from the lexicon or the books'
glossaries. Machine-written glosses ship `reviewed:false` and go through review-sheet.py's grammar
section like any topic.

| Topic | Modelled on (printed pages) | Size | Example pairs (final list chosen by the builder, confirmed by Sarnai) |
|---|---|---|---|
| `snd_length` "Long and short vowels" | Survival p5 (long-vowel rule) and p7 (vowel table); Modern Mongolian pp. ix–x (short / long / diphthong / soft-sign sets); Peace Corps p4 (§4) | 8 | хол/хоол, ул/уул, өр/өөр, цас/цаас |
| `snd_verbs` "Verbs that sound alike" | Beginner p30 (Ex. 9, word-level items only; its sentence items are not used) | 8 | ав/яв, ир/ор |
| `snd_adj` "Adjectives that sound alike" | Beginner p105 (Ex. 3) | 6 | залхуу/залуу, сайн/сайхан |
| `snd_front` "Front and back vowels" | Modern Mongolian p3 (vowel harmony groups) and p4 (front and back г/х, н before г/х); Survival p7 | 6 | ус/үс, and others confirmed by Sarnai |

Each topic's `summary` is 2 English sentences of about 25 words, written for this app, with a
`sourceCite` in the grammar.json style.

**Page conventions.** Modern Mongolian printed page = PDF − 12, and the front matter is roman
(PDF 10–11 = printed ix–x). Survival printed = PDF − 2. Beginner printed = PDF − 1.

### 5.2 Recording order and why

Sarnai's time is the scarce resource, so the plan is built around one short pilot and two sittings.

| Sitting | What | Clips | Her time | Why this order |
|---|---|---|---|---|
| 0 — pilot | 5 pairs + 5 words + 2 sentences | 12 | 5 min (inside build session B1) | Proves the whole chain (Edge AAC capture, apply, deploy, Range, `#t=` trim, playback on the iPhone) before any real time is spent |
| 1 | Minimal pairs, then **all 184 lexicon words** (154 drillable + 30 reference) | about 240 | about 35 min incl. 5 min calibration | Short items let her learn the tool cheaply. The pairs give the highest perception value per second and unlock a new drill with no new text. Words appear in every lesson (deck plus up to 8 drills a day), so the audio reaches Fred the next morning |
| 2 | **All 164 sentence answers** (canonical `mn` only, natural speed, not word-list pace) | 164 | about 35 min | Connected speech is the real-world bottleneck ROADMAP 3 names ("conversation collapses"). The clips play on every sentence verdict, and they are the shadowing material |
| 3+ | **Baby paragraphs**, one clip per line, each batch once the reading workstream's passages pass review. **New lexicon batches** from the content engine, in frequency order (content-fit `missing_high_freq`), recorded right after each Luna review round lands | about 5–8 per passage | 10–15 min per 10 passages or 50 words | Audio is useful only on the second read, so paragraphs are less urgent. Words should never be recorded before their spelling is signed off |
| optional | **Luna**: the minimal pairs plus the top 50 words | about 100 | about 15 min | A second speaker improves perception training (HVPT moderator, research-science 7). She records on the same page when she is at the house, or through the hosted route (D7) |

**Skip lists for the recorder:**

- sentences with `partial:true`;
- the four items in ROADMAP 2c whose spelling is open (ор/орон, зулзага/зулзаган, эвдэлж,
  сорогч/сороогоч/соордог) until Luna answers.

Recording them now would waste takes, because text keys would orphan them later.

**Recorder time per item:** about 7–9 s for words, 10–12 s for sentences, plus about 15% retakes.

**Sarnai's flags** go to `tools/recordings/flags.json`. They are routed as a worklist to Luna or to
alternatives.py's `HAND` table, the same way review-sheet's "add your own" box is the most valuable
field.

### 5.3 Review

- The **effects contain no Mongolian**, so they need nothing from Luna or Sarnai.
- **Sarnai's own kept takes** are the native sign-off for their own audio (`ok:true`). Luna is not
  needed to review them.
- **Listen-topic English glosses and summaries** are English, so they need no review. The
  **Mongolian pair words** are confirmed by Sarnai in sitting 1, using the flag.
- **Total native time:**
  - Sarnai: about 75 minutes for everything that exists today;
  - Sarnai: about 10–15 minutes per future batch;
  - Luna: optional 15 minutes.

### 5.4 TTS stopgap: not recommended now (decision D8)

The stopgap would be pre-rendered Azure mn-MN clips (YesuiNeural or BataaNeural), generated on the
laptop through the REST API with stdlib `urllib`, shipped as files and flagged `ok:false` with a
`MACHINE · UNCHECKED` chip. It is technically possible: the free tier's 0.5 M characters a month
covers the whole corpus (about 10k characters), and the app stays offline because the files are
pre-rendered (research-competitors, "Mongolian text-to-speech availability").

The recommendation is **no**:

1. **The window is about a week.** Sarnai lives with Fred. Once the recorder exists (B1), sittings 1
   and 2 can happen the same week.
2. **It saves her almost nothing.** Under the project's rule, machine-made Mongolian never ships as
   confirmed, so every machine clip needs her to listen and judge it. That is about 30 minutes for
   350 clips, against about 70 minutes to simply record them.
3. **A wrong sound teaches the wrong sound.** That is the audio version of "accepting a wrong answer
   teaches it". No study evaluates Mongolian TTS for learners, and vowel length and reduction are
   exactly what a synthesiser and an English ear get wrong (research-science 7).
4. **It costs Fred effort and adds a risk.** He would need an Azure account and key, which he would
   have to create himself. The unofficial edge-tts route carries terms-of-service risk and is out
   entirely.

**Revisit it** when the lexicon passes about 600 entries and the unrecorded backlog exceeds two
sittings. Even then, machine clips are never autoplayed, never used in listen drills, never credited
to a person, and are replaced the moment Sarnai records the text.

---

## 6. Build

### 6.1 Files

| File | Change |
|---|---|
| `build.py` | **(first, shared with all workstreams)** Replace `for name in ("views.js","account.js")` (`:66-67`) with every `src/ui/*.js` except `app.js`, and the `:71` regex with `from '\./([\w-]+)\.js'` → `from './ui/\1.js'`. Copy `src/audio/*.m4a` → `dist/audio/`. Exclude `audio/` from `assets` and from the digest (`:124-135`). Inject `__AUDIO__` (sorted list) and inline `src/sw-range.js` at `/*__RANGE__*/`. **Fail the build** if a file named in `audio.json` is missing or its name is not the sha1 prefix of its bytes. Print the audio count and MB separately. |
| `src/core/feedback.js` (new, DOM-free) | `COMBO_EVERY = 5`; `LEVELS = {on:0.7, soft:0.25, off:0}`; `LEVEL_ORDER`; `CUES` (the table in 3.2 as data: `{notes:[{wave,f,at,attack,end,peak}], filter?, total}`); `verdictCue(run, ok, first) → {cue, run}`; `doneCue(summary) → 'milestone'\|'finish'` (reads `summary.leveledTo`, `summary.newBadges`, `summary.goalCrossed`) |
| `src/core/prefs.js` (new, DOM-free, takes `storage` like `progress.load`) | `readPrefs(storage, key)` and `writePrefs(storage, key, patch)`, defaults `{sound:'on', autoplay:false}`, every access in try/catch, unknown values coerced to the defaults |
| `src/core/audio.js` (new, DOM-free) | `textKey(mn)`; `clipFor(manifest, mn, {machine=false})`; `clipUrl(clip)` → `./audio/<f>#t=s,e`; `creditLabel(clip)` → `SARNAI` / `LUNA` / `MACHINE · UNCHECKED`; `playableDrills(topic, manifest)`; `listenTopics(topics, manifest)` (keeps topics with ≥6 playable drills) |
| `src/ui/sound.js` (new) | Module state: `ctx, master, voices, lastTick, idleTimer, player, log`. `setupSound({getLevel, debug})`; `unlock()`; `play(name)` (never throws; pushes `name` onto `window.__soundLog` when `debug`, *before* any context check, so headless tests see requests); `renderCue(baseCtx, dest, spec, t0)` (shared by `play` and the tests); `speak(clip, {rate})` and `stopSpeech()` (the `<audio>` player, audioSession switching, waveform progress through rAF); `isSpeaking()` |
| `src/sw-range.js` (new) | `function parseRange(header, size)` → `{start,end}` \| `null` \| `'unsatisfiable'`, written as a plain function so it can be inlined |
| `src/sw.js` | `AUDIO_CACHE`, `__AUDIO__`, `/*__RANGE__*/`; `activate` keeps and prunes the audio cache; the `/audio/` fetch branch (3.8); a `message` handler for `'audio-fill'` |
| `src/ui/app.js` | Import `* as snd`, `readPrefs/writePrefs`, `verdictCue/doneCue`, `clipFor`. Call `snd.unlock()` as the first line of both listeners. New helper `verdict(ok, item, runKey)`: updates `S[runKey]` through `verdictCue`, sets `S.summary.bestRun`, plays the cue and, if autoplay is on, schedules `speak`. It is called from `pick` (with `ok = choicesFor(item).options[S.picked].correct`), `check-word`, `submit`, `grammar-pick/-check/-build-check`, and later from the tile check and reading questions. `grammar-build-tap` → `snd.play('tick')`, `grammar-build-remove` → `'tock'`. `finish()` → `snd.play(doneCue(S.summary))`, guarded so it plays once and only when it came from a lesson. New acts: `sound` (cycle plus preview), `autoplay`, `say`, `say-slow`, `listen-play`, `listen-pick`. `start` and `grammar-open` reset the runs. `boot()` fetches the optional files and posts `'audio-fill'` after `render()`. `?fake-sync` turns on `debug` for the sound log. |
| `src/ui/views.js` | `speakBtn(clip, {slow})` (▶, credit chip `.lab`, 32-bar waveform as inline divs; **no SVG `xmlns`**, so the CI URL check stays green); used in `viewDeck`, the `viewCard` verdicts, the `viewSentence` verdict and reading lines. `viewListenDrill`. The combo suffix on the `CORRECT` label if D4 = label. |
| `src/ui/base.css` | `.speak`, `.wave i` (played portion `var(--blue)`, unplayed hairline grey), `.credit`. No new animation; the waveform fill is a width change, so it stays within the reduced-motion rule. |
| `src/data/audio.json` (new) | `{"v":1,"clips":{}}`, committed empty |
| `src/data/listening.json` (new) | The four topics in 5.1 |
| `tools/record.py` (new, stdlib) | Default: serve `tools/record.html` plus the `src/data/*.json` it needs on `http://localhost:8765`. `localhost` is a secure context, so the microphone works; nothing listens beyond the machine. `GET /state` (kept keys per speaker); `POST /take` (body = blob, header `X-Meta` = JSON) writes `tools/recordings/<speaker>/<n>-<slug>.m4a` and appends `takes.jsonl`. `POST /flag`. Flags: `--set pairs\|words\|sentences\|readings\|new`, `--speaker`, `--redo`. `--queue` prints what is unrecorded, in priority order. `--apply` takes the latest kept take per (key, speaker), copies it to `src/audio/<sha1[:12]>.m4a`, rewrites `audio.json`, deletes files no longer referenced, lists orphaned keys (text no longer in content) and removes them, and prints `flags.json` as a worklist. `--selftest` checks `text_key()` against the shared vectors. |
| `tools/record.html` (new) | The page in 2.2: calibration, the capture chain and per-take analysis in 3.7, keyboard controls, bilingual labels, an optional auto-playback toggle |
| `tools/textkey-vectors.json` (new) | About 20 `[input, expected]` pairs used by both `--selftest` and test.html, so the Python and JS normalisers can never drift apart |
| `.gitattributes` | `*.m4a binary` |
| `.gitignore` | `tools/recordings/` (raw takes and redos stay private) |

### 6.2 Tests

**tools/test.html** (core; run `py tools/run_tests.py`):

- **`verdictCue`:**
  - run sequence `[ok×5]` → cues `right×4, combo`, and `run` ends at 5;
  - a miss resets the run to 0;
  - retries (`first=false`) leave the run unchanged and never return `combo`;
  - a wrong answer never returns `combo`.
- **`doneCue`:** `milestone` when `leveledTo`, `newBadges.length` or `goalCrossed` is set, and
  `finish` otherwise.
- **`CUES` as data:**
  - every `total` is ≤ its ceiling (right 260, wrong 320, combo 420, tick/tock 40, finish 800,
    milestone 1500 ms);
  - every frequency is between 300 and 4000 Hz;
  - every peak is ≤ 0.35.
- **Offline render** (import `../src/ui/sound.js`, `renderCue` into an `OfflineAudioContext` at
  master 1.0; measured to work in headless Edge), for every cue:
  - max |sample| ≤ 0.5;
  - max |sample| ≥ 0.05 (audible);
  - RMS of the last 5 ms < 1e-3 (no click at stop);
  - rendered length matches `total` ± 30 ms.
- **`prefs`:**
  - corrupt JSON → defaults;
  - `'off'` and `autoplay:false` round-trip (the falsy-value lesson from `test.html:785-787`);
  - a storage object that throws → defaults, and no throw.
- **P guard:** `blank()` has no `sound` or `autoplay` key, and `encodeCode(blank())` does not contain
  `"sound"`.
- **`textKey`:** the shared vectors, and idempotence (`textKey(textKey(x)) === textKey(x)`).
- **Manifest integrity:**
  - every `audio.json` key equals `textKey(key)` and matches some text in words, sentences,
    listening or readings (no orphans);
  - every `f` exists (`fetch` HEAD on `../src/audio/f`) and its SHA-1 matches
    (`crypto.subtle.digest`; 127.0.0.1 is a secure context);
  - `ok` is false wherever `by` starts with `tts:`.
- **`listening.json`:**
  - unique ids;
  - the two texts in a pair differ under `textKey`;
  - both have an English gloss;
  - `listenTopics` hides a topic with fewer than 6 playable drills.
- **`parseRange`:** `bytes=0-1` → {0,1}; `bytes=100-` → {100, size−1}; `bytes=-500` → the last 500
  bytes; a start beyond the size → `'unsatisfiable'`; garbage → `null`.

**tools/engine-test.html:**

- one assertion that a `P.grammar.snd_length` tally made offline on two devices adds up after rebase
  and merges by "more attempts" on join. This documents that listen topics ride the existing
  grammar sync path.
- No other change, because there are no new synced fields.

**tools/smoke.html** (built app; run `py build.py && py tools/run_tests.py tools/smoke.html`):

- The laptop frame has `?fake-sync`, so `window.__soundLog` exists.
- Start → no log entry. Pick → exactly one entry, `right` or `wrong`. `card-next` → still one. Home →
  still one. This is the "never" list, exercised on the real built modules.
- The lesson carries on with a context that cannot start (no user activation in headless). This
  catches any throw.
- Settings: the `[data-act=sound]` button cycles `On → Soft → Off`.
  `localStorage['mng_study_v2:fake:laptop:prefs']` reads `{"sound":"off",…}`, and
  `stored('laptop')` (P) has no `sound` key. After a reload the button still reads `Off`.
- The app renders at all from `dist/`. That is the build.py trap check, already implicit in the
  existing `.top .sub` wait.

**Manual gate: iPhone** (new section in `DEPLOY.md`, about 15 minutes, before calling Phase A or B
done). Run it twice, once in Safari and once in the installed home-screen app, and write the iOS
version into DEPLOY.md:

1. With the switch on Ring, answer right and wrong on a multiple-choice card: hear `right` and
   `wrong`. Finish a session: hear `finish`.
2. With the switch on Silent, effects are silent and nothing else changes. *(Phase B)* Tapping `▶`
   is audible.
3. Start a podcast, then answer: effects mix in and the podcast keeps playing. *(Phase B)* Tapping
   `▶` pauses the podcast (expected), and after the clip the next answer's cue still respects the
   switch. That checks that the audioSession switches back to ambient.
4. Background the app for 60 s and return. The first answer should sound; if only the second does,
   log WebKit 263627 or 291892 and its iOS version.
5. Take a call or invoke Siri, return, and answer: the cue sounds.
6. With AirPods connected, the cues route to them.
7. Settings: Soft is quieter, Off is silent, both survive a reload, and the laptop's setting is
   unchanged.
8. *(Phase B)* Clips play from the service-worker cache with Wi-Fi off. The `#t=` trim has no lead-in
   silence. `0.75×` keeps the pitch.
9. *(Phase B)* Safari's Web Inspector, attached from the laptop if available (otherwise skip), shows
   `206` responses for `/audio/`.

### 6.3 Documents to amend in the same change

**`docs/INSTRUMENT.md`:**

- Add a **"Sound"** section after "Layout & motion", with the cue vocabulary as a table like the
  motion table and these rules:
  - only on verdicts and the lesson close;
  - success-contingent;
  - never over Mongolian audio, never in reading, never on navigation or sync;
  - a device-local level;
  - the silent switch is honoured.
- Amend `:167-171` to read: "*…The one celebration is the session-close screen, which reports what
  actually happened … a summary, not a fanfare. It carries one short cue, or the milestone cue when a
  level, badge or goal was crossed. No music, no loops.*" Add: "*A verdict may carry one sound
  (`right` / `wrong` / `combo`); tiles tick. Nothing else sounds.*"
- Replace "not yet built" at `:141` with the speaker-button spec: credit chip in mono uppercase
  (`SARNAI`, `LUNA`, `MACHINE · UNCHECKED`) and a 32-bar waveform whose played part is blue.
- Extend "Machine-written Mongolian" (`:226-228`) to machine-*spoken* Mongolian.

**`CLAUDE.md`:**

- Layout: the new files.
- Rules → Offline first: "effects are synthesised; recordings are same-origin files in the
  unversioned `mng-audio` cache, outside the precache".
- State: the device-local `${KEY}:prefs`, which is never in P.
- Run: run the smoke test plus the iPhone gate after touching `sound.js`, `sw.js` or `audio.json`.
- Native-speaker review: `record.py`.
- **Fix the stale `:105`** "Interface chrome is Mongolian". It is shared with the less-text
  workstream; whichever lands first fixes it.

**`ROADMAP.md` 3:**

- Replace IndexedDB and "50MB" (`:100`) with this design.
- Change "self-rate, feeding the same FSRS scheduler" to "ungraded listen-and-repeat", keeping one
  grade per word per session.

**`DEPLOY.md`:** the iPhone gate above.

---

## 7. Size and dependencies

| Step | Size | Needs first | Unblocks |
|---|---|---|---|
| **A0** build.py ui glob | S (minutes) | nothing | every workstream's new `ui/` module |
| **A1** `feedback.js`, `prefs.js`, `sound.js`, app.js hooks, Settings row, tests, INSTRUMENT amendment | **M (1 session)** | A0; Fred's yes to D1 | Fred hears feedback the same day; point 2 answered |
| **A2** iPhone gate | S (Fred, 15 min) | A1 deployed | — |
| **A3** tile tick / tock, reading-question verdicts, `goalCrossed`, combo label | S (a few lines each) | learning loop (tiles, `item.retry`), reading (question verdicts), gamification (goal definition, D4) | — |
| **B0** spike: capture 3 AAC clips in headed Edge on the laptop, commit, play on the iPhone (Range plus `#t=`) | S (20 min) | A0 | B1. If Edge AAC fails: try `audio/mp4;codecs=opus` (also reported supported) on iPhone Safari; failing that, the hosted route (D7) |
| **B1** `record.py`, `record.html`, `--apply`, `audio.json`, text-key vectors, pilot sitting 0 | **M (1–2 sessions)** | B0; D7, D9 | Sarnai's sittings |
| **B2** sw.js audio cache, fill and Range; build.py audio; `core/audio.js`; speaker button, chip, waveform, `0.75×`, autoplay; tests and gate | **M (2 sessions)** | B1 (real clips to test with) | audio on deck, cards and sentences; reading audio |
| **B3** `listening.json` plus the listen drill | S (under 1 session) | B2, sitting 1 | perception training |
| Sittings 1 and 2 | Sarnai about 70 min, Fred about 30 min to apply and verify | B1 | — |

**Totals.** Phase A is about 1 session plus small hooks. Phase B is about 4 sessions (L) plus about
75 minutes of Sarnai's time.

**Order.** A0 → A1 can land before everything else, because it is the quickest visible answer to
Fred's complaint and depends on no other design. The verdict sites from the other workstreams call
the same `verdict()` helper when they land.

**What it unblocks:**

- the reading workstream's listening variant (DuoRadio-style true/false over Sarnai's per-line
  clips);
- ROADMAP 3 shadowing;
- ROADMAP 5 conversation rehearsal, which "needs … audio to be worth building".

**Interfaces with the other workstreams:**

- **Learning loop.** Items carry `retry` (n ≥ 1). Tile acts call `snd.play('tick'|'tock')`. Every
  check calls `verdict(ok, item)`. The cue never depends on the FSRS grade, only on accepted or not.
- **Reading.**
  - Passage lines are recording units, keyed by `textKey(line.mn)`.
  - There are no sounds during the read phase.
  - Question verdicts call `verdict()`.
  - The `Listen` button appears only after the first read.
  - `record.py --set readings` reads `readings.json` lines whose passage is `reviewed:true`.
- **Gamification.**
  - The combo is sound only, plus an optional real-count label (D4), and never XP.
  - It provides `S.summary.goalCrossed` for `doneCue`.
  - It may show `S.summary.bestRun` on Done as a real figure.
  - Listen topics use the same per-day XP cap it applies to grammar.
- **Less text.** The speaker button is an icon plus a one-word chip. The autoplay row stays hidden
  until clips exist. The listen intro collapses on revisit.
- **Content engine.**
  - New lexicon entries are recorded only after sign-off (`reviewed` absent or true).
  - `--queue` orders unrecorded words by the engine's frequency rank.
  - Text keys mean a rewrite automatically queues a re-recording.

---

## 8. Decisions for Fred

| # | Decision | Options | Recommended default |
|---|---|---|---|
| D1 | **Amend INSTRUMENT to allow sound** (it currently has none, and "no fanfare") | (a) the small vocabulary above: verdict cue, tile tick, `finish` or `milestone` on Done; (b) verdict cues only, no `finish`; (c) keep silence | **(a)**. It matches the motion table's restraint, and the done cue is the one celebration INSTRUMENT already allows, now audible |
| D2 | **Silent switch** for effects | (a) honour it (ambient: mixes with music, muted on Silent); (b) override it (`playback`: always audible, but pauses music on every answer) | **(a)**. Pronunciation taps still play through the switch |
| D3 | **Default level** | On / Soft / Off | **On** (he asked for sound), with Soft one tap away |
| D4 | **Combo** | (a) sound plus the label `CORRECT · 5 IN A ROW`; (b) sound only; (c) no combo | **(a)**. It is real, 3 words, and shown only on those answers |
| D5 | **Tile tick** | on / off | **On**. It confirms each placement, stays at −12 dB relative to verdicts, and follows the level |
| D6 | **Play recordings automatically** | off / on by default | **Off**. On the iPhone a clip pauses music or podcasts. It is one tap to turn on |
| D7 | **Where Sarnai records** | (a) Fred's laptop: `py tools/record.py`, localhost, takes written straight into the repo with no transfer and no cloud; (b) a hosted `record.html` on GitHub Pages, recorded on an iPhone, exported as one file and moved to the laptop by Messages, email or cable; this suits Luna remotely | **(a)**. (b) only if the B0 spike shows Edge cannot make AAC, or for Luna |
| D8 | **TTS stopgap** (Azure mn-MN, flagged) | (a) no; (b) only beyond about 600 words, when the backlog exceeds 2 sittings; (c) now, for everything | **(a) now, (b) later** (see 5.4) |
| D9 | **Publishing Sarnai's voice** on the public GitHub Pages site, credited by first name | (a) with her explicit consent: chip `SARNAI`; (b) consent but anonymous: chip `NATIVE`; (c) no publishing: Phase B stops at the laptop | **Ask her before B1** and default to her choice. Anyone with the URL can download the clips |
| D10 | **Second voice** (Luna) | yes, for pairs and the top 50 words / no | **Yes, if she is willing**. Speaker variety helps perception (HVPT) |
| D11 | **Shadowing** | ungraded `▶` and `0.75×` / graded self-rating feeding FSRS (ROADMAP 3 as written) | **Ungraded**. The evidence is weak, and a second grade would break "one grade per word per session" |

---

## 9. Risks and how each is contained

1. **"Still no sounds" on the iPhone because of the silent switch.**
   - Contained by the Settings caption on iOS and step 1 of the iPhone gate.
   - D2 is a deliberate choice, not an accident.
2. **The iOS AudioContext sticks in `interrupted` or `suspended`** after backgrounding in the
   home-screen app (WebKit 263627 and 291892), or the iOS 26 silent-audio bug in PWAs.
   - `unlock()` resumes in *every* gesture, before the cue is scheduled.
   - The idle suspend avoids a stale running context.
   - Sound is purely additive, so a failure costs a chime, never a lesson.
   - Gate steps 4 and 5 record the iOS version.
3. **Toggling audioSession between ambient and playback is unreliable.**
   - Gate step 3 checks it.
   - Fallback: leave the type unset (`auto`) and accept that effects may pass the switch right after
     a clip.
4. **Build trap: a new ui module is missing from dist.**
   - A0 generalises build.py.
   - smoke.html fails if the app does not render.
5. **Cached clips do not play on the iPhone** because of Range requests.
   - The 206 branch.
   - `parseRange` unit tests.
   - Gate steps 8 and 9.
   - Desktop Chrome cannot reveal this, so the gate is mandatory.
6. **Precache bloat, or one bad clip blocking every update.**
   - A separate unversioned cache, outside `ASSETS` and the digest.
   - A sequential, failure-tolerant fill.
   - The 15 MB background cap.
   - The build fails on a missing or mis-hashed clip.
7. **Edge cannot actually record AAC with a real microphone** (only `isTypeSupported` was measured).
   - The B0 spike comes before any of Sarnai's time is booked.
   - Fallbacks: MP4 with Opus (verify it plays on the iPhone), then the hosted iPhone route (D7b).
8. **Poor recordings** (laptop microphone, room noise, uneven levels; iOS ignores `audio.volume`).
   - Calibration, per-take clip, quiet and noise prompts, and auto-playback for Sarnai.
   - The 12-clip pilot is verified on the iPhone first.
   - Suggest wired earbuds with a mic, 20–30 cm away.
9. **Text edits orphan clips.** This is intended (old audio would teach old text).
   - `--apply` lists and removes orphans.
   - test.html fails on an orphan.
   - The ROADMAP 2c items are skipped until settled.
10. **Sarnai's voice becomes public.** Covered by D9: explicit consent before B1, and raw takes and
    redos are gitignored.
11. **Sound fatigue or annoyance.**
    - The vocabulary is small and ceilings are pinned in tests (duration, peak, ≥300 Hz).
    - One cue at a time with voice stealing.
    - Soft and Off levels.
    - No sounds on taps other than tiles.
12. **Autoplay interrupts music.** It is opt-in (D6), and it is never used for machine clips or
    during a first read.
13. **Headless tests cannot hear.**
    - OfflineAudioContext render tests check level, length and clicks.
    - The `__soundLog` spy exercises the "never" list in the built app.
    - The iPhone gate covers the rest.
14. **The CI offline-URL check.**
    - No inline SVG with `xmlns`; the waveform is divs.
    - The recorder lives in `tools/`, not `dist/`.
    - `.m4a` and `.json` are not scanned.
15. **The combo drifts into gaming the numbers.**
    - The combo gives no XP.
    - Retries and overrides cannot move the run.
    - Tests pin this.
16. **Accessibility.** Sound never carries meaning alone: verdict colour and the CORRECT/WRONG text
    remain, so a muted or hearing-impaired user loses nothing. The `▶` has an
    `aria-label="Play recording by Sarnai"`.

---

## 10. Versus Ling

Ling's Mongolian course uses one template across 60–80 languages. It claims native audio, uses
generic sound effects with mascot celebrations, and has speech scoring that its own users report
scores partial phrases at 100% (research-competitors, "Ling: mistakes, review, audio and
gamification"). This design gives Fred:

- **Fred's wife's voice, on the exact words and sentences he drills.** That is the accent, register
  and speed of the family he actually talks to, not a studio narrator reading a template. Every
  clip's credit chip says whose voice it is.
- **Perception training on the contrasts Mongolian actually depends on.** Long against short vowels,
  front against back, and verbs and adjectives that sound alike, chosen from his own textbooks'
  pronunciation sections and played in a drill that cannot be memorised. Ling has no Mongolian-
  specific phonology work.
- **Feedback sounds that mean something.** Each cue follows a scored event. The combo is a real
  first-try run with no invented XP, and the session-close cue only becomes a milestone when a real
  level, badge or goal was crossed.
- **Respect for his phone.** Effects honour the silent switch and mix under his podcast. Recordings
  play on a tap. Everything works offline from a cache that survives app updates.
- **No fake judgement of his speech.** Listen, slow down to 0.75×, and repeat, without a microphone
  score that Ling's own users say is wrong.
- **A pipeline that grows with the content.** Every lexicon batch or baby paragraph Luna signs off
  can be in Sarnai's voice within one 15-minute sitting, with no cloud, no account and no machine
  pronunciation.
