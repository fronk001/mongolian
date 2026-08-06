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
src/core/     fsrs.js scheduler.js progress.js grade.js   ← pure logic, no DOM
src/ui/       app.js views.js *.css                        ← DOM lives only here
src/data/     words.json sentences.json                    ← large; avoid reading unless changing content
build.py      copies files, rewrites 2 imports in app.js, injects SW precache list
tools/        serve.py (dev server), test.html (test suite)
```

No bundler and no npm dependencies. Browsers load the ES modules directly;
the build only copies, concatenates CSS, generates icons, and stamps sw.js.

## Rules

- **Instrument design system.** Read `docs/INSTRUMENT.md` before touching UI.
  The one rule that bites: *numbers are real* — no XP, no invented scores.
  Every readout must be genuine telemetry.
- **Offline first.** No CDNs, no external requests, ever. Fonts are self-hosted.
- **Never break backup codes.** `importCode()` must keep accepting v1 (Leitner)
  codes forever. Verify with a round-trip test after any schema change —
  `tools/test.html` covers both the v1 wire format
  (`btoa(unescape(encodeURIComponent(json)))`) and the v2 round-trip.
- **Day keys are local, not UTC.** `dayKey()` names the calendar day where Fred
  is; the keys are then parsed at a fixed offset so day arithmetic stays exact.
- Interface chrome is Mongolian; telemetry labels are uppercase Latin mono.
- `core/` must stay DOM-free so it can be tested in plain Node.

## State

`localStorage['mng_study_v2']` — see `blank()` in `src/core/progress.js`.
v1 saves are migrated automatically on load; box level seeds stability,
accuracy seeds difficulty.

## Current status

FSRS-6 scheduling with i+1 sentence selection. Deployed target is GitHub Pages
(`DEPLOY.md`). Audio, richer content packs and morphology drills are not built —
see `ROADMAP.md`.

**Known limit:** only 111 words and 164 sentences. Simulation shows the i+1
selector runs out of good candidates around day 30. More content is the binding
constraint, not more features.
