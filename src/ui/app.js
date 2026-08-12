/** Controller: session flow, event wiring, persistence. */
import { makeFSRS, dayKey, daysBetween } from '../core/fsrs.js';
import { load, save, stats, encodeCode, importCode, exportAge, recordDay } from '../core/progress.js';
import { buildSession, applyGrade } from '../core/scheduler.js';
import { gradeAnswer, diffTokens } from '../core/grade.js';
import { buildChoices } from '../core/choices.js';
import { xpFor, earnedBadges, stepCount } from '../core/goals.js';
import * as V from './views.js';

const el = document.getElementById('app');
let WORDS = [], SENTENCES = [], BYID = {}, POOL = [];
let P = load();

const blankSummary = () => ({ reviews: 0, right: 0, newWords: 0, xp: 0, onTime: 0, late: 0, newBadges: [] });

let S = {
  screen: 'home', session: null, i: 0,
  fb: null, tools: false, msg: '',
  deckI: 0, flipped: false,          // flashcard deck position
  picked: null,                       // chosen multiple-choice index
  skip: new Set(),                    // words dismissed with "I know this"
  graded: new Set(),                  // words already graded this session
  editPurpose: false,
  summary: blankSummary()
};

const fsrs = () => makeFSRS(undefined, P.desiredRetention);
const mcOn = () => P.mcMode !== false;

// How many words are drilled on their own each lesson. A cycle rather than a
// free number: buildSession() always holds a few targets back for the sentence
// phase, so these are the steps that make a visible difference to a session.
const DRILL_STEPS = [0, 4, 8, 14];
const drillCount = () => P.wordDrills ?? 8;

function current() { return S.session?.items[S.i]; }

function elapsedFor(id) {
  const it = P.items[id];
  return it ? Math.max(0, daysBetween(it.last || dayKey(), dayKey())) : 0;
}
function retrievabilityFor(id) {
  const it = P.items[id];
  return it ? fsrs().retrievability(elapsedFor(id), it.s) : 0;
}
function previewFor(id) {
  return fsrs().preview(P.items[id], elapsedFor(id));
}

function todaySession() {
  return buildSession(P, WORDS, SENTENCES);
}

/**
 * Direction for a word card. Decided by the scheduler, which seeds it on the
 * word and the date rather than on the card's position in the session.
 */
const dirFor = item => item.dir || 'mge';

/**
 * Options for a word card. Seeded on the word, direction and day, so the
 * arrangement survives a re-render but is not the same four words forever.
 */
function choicesFor(item) {
  const dir = dirFor(item);
  return buildChoices(item.word, POOL, {
    dir, count: 4,
    introduced: new Set(P.introduced),
    seed: `${item.word.id}:${dir}:${dayKey()}`
  });
}

/**
 * Entry motion plays when the screen is showing something new — a different
 * question, a different deck face, a different screen — and not on the
 * re-renders that happen within one question. The whole view is rebuilt from a
 * string on every state change, so without this gate picking a multiple-choice
 * option would replay the entry animation of the prompt the learner is already
 * reading. INSTRUMENT: nothing moves that has not changed.
 */
let lastKey = null;
function renderKey() {
  if (S.screen !== 'run') return `${S.screen}:${S.tools}:${S.editPurpose}`;
  const item = current();
  return `run:${S.i}:${item && item.kind === 'deck' ? S.deckI + ':' + S.flipped : ''}`;
}

function render() {
  const st = stats(P, { words: WORDS });
  const today = dayKey();
  const key = renderKey();
  const fresh = key !== lastKey;
  lastKey = key;
  el.className = fresh ? 'wrap enter' : 'wrap';

  if (S.screen === 'home') {
    el.innerHTML = V.viewDash(P, st, todaySession(), toolsPanel(), {
      today, exportAge: exportAge(P),
      corpusWords: POOL.length, editPurpose: S.editPurpose
    });
  } else if (S.screen === 'done') {
    el.innerHTML = V.viewDone(S.summary, st, P, { today });
  } else {
    const item = current();
    if (!item) { finish(); return; }
    const total = stepCount(S.session);
    const step = S.session.items.slice(0, S.i)
      .reduce((n, it) => n + (it.kind === 'deck' ? it.words.length : 1), 0)
      + (item.kind === 'deck' ? S.deckI : 0);

    let body;
    if (item.kind === 'deck') {
      body = V.viewDeck(item, { deckI: S.deckI, flipped: S.flipped });
    } else if (item.kind === 'card') {
      body = V.viewCard(item, {
        fb: S.fb,
        previewIvls: previewFor(item.word.id),
        r: retrievabilityFor(item.word.id),
        dir: dirFor(item),
        choices: choicesFor(item),
        picked: S.picked,
        mcMode: mcOn()
      });
    } else {
      body = V.viewSentence(item, {
        fb: S.fb,
        previewIvls: previewFor(item.targetIds[0]),
        byId: BYID
      });
    }
    // No dashboard header during a lesson: see lessonBar() on why the
    // telemetry belongs on the screen you read, not the screen you study on.
    el.innerHTML = V.lessonBar(step, total) + body;
  }

  window.scrollTo(0, 0);
  const box = document.getElementById('ansbox') || document.getElementById('purposebox');
  if (box && !('ontouchstart' in window)) box.focus();
}

function toolsPanel() {
  const g = en => `<div class="gl">${V.esc(en)}</div>`;
  if (!S.tools) return `<div class="btns" style="margin-top:18px">
    <button class="btn ghost" data-act="tools">Settings ▾${g('settings and backup')}</button></div>`;

  const age = exportAge(P);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  return `<div class="h" style="margin-top:20px"><span class="mono">SETTINGS</span></div>
    <div class="panel">
      <div class="wline">
        <div style="flex:1"><div class="mn">Multiple choice</div>${g('on word cards')}</div>
        <button class="btn ghost slim" data-act="mc">${mcOn() ? 'On' : 'Off'}${g(mcOn() ? 'on' : 'off — you type instead')}</button>
      </div>
      <div class="wline">
        <div style="flex:1"><div class="mn">Word drills</div>${g('word cards per lesson — drilled on their own, before the sentences')}</div>
        <button class="btn ghost slim" data-act="drills">${drillCount() || 'Off'}${
          g(drillCount() ? 'per lesson, when there is that much due' : 'off — only words no sentence covers')}</button>
      </div>
    </div>

    <div class="h"><span class="mono">BACKUP CODE</span></div>
    <div class="panel ${age === null || age >= 14 ? 'red' : 'blue'}">
      <div class="wline">
        <div style="flex:1"><div class="mn">Last export</div></div>
        <div class="mono${age === null || age >= 14 ? ' red' : ''}">${
          age === null ? 'NEVER' : age === 0 ? 'TODAY' : age + 'D AGO'}</div>
      </div>
      <div class="mono" style="margin-top:14px">EXPORT</div>
      <textarea class="code" id="outcode" readonly>${V.esc(encodeCode(P))}</textarea>
      <div class="inline" style="margin-top:8px">
        <button class="btn secondary" data-act="copy">Copy</button>
        ${canShare ? `<button class="btn secondary" data-act="share">Share</button>` : ''}
      </div>
      <div class="mono" style="margin-top:14px">IMPORT</div>
      <textarea class="code" id="incode" placeholder="paste code (v1 or v2)"></textarea>
      ${S.msg ? `<div class="mono" style="margin-top:8px;color:${S.msg[0] === '!' ? 'var(--red)' : 'var(--green)'}">${V.esc(S.msg.replace(/^!/, ''))}</div>` : ''}
      <div class="inline" style="margin-top:10px">
        <button class="btn secondary" data-act="import">Import</button>
        <button class="btn ghost" data-act="tools">Close</button>
      </div>
      <div class="gl" style="margin-top:10px">importing replaces everything on this device — it does not merge</div>
    </div>`;
}

/** Record that a code actually left the device. Only called on success. */
function markExported() {
  P.lastExport = dayKey();
  save(P);
}

async function copyCode() {
  const code = encodeCode(P);
  try {
    await navigator.clipboard.writeText(code);
  } catch (e) {
    // Safari refuses clipboard writes outside a trusted gesture in some
    // versions; fall back to selecting the field so the OS menu can copy.
    const box = document.getElementById('outcode');
    if (!box) return false;
    box.removeAttribute('readonly');
    box.select(); box.setSelectionRange(0, code.length);
    const ok = document.execCommand && document.execCommand('copy');
    box.setAttribute('readonly', '');
    if (!ok) return false;
  }
  return true;
}

/** Advance past any card whose word was dismissed with "I know this". */
function advance() {
  S.fb = null; S.picked = null; S.deckI = 0; S.flipped = false;
  do { S.i++; } while (
    S.i < S.session.items.length &&
    S.session.items[S.i].kind === 'card' &&
    S.skip.has(S.session.items[S.i].word.id)
  );
  if (S.i >= S.session.items.length) finish(); else render();
}

function finish() {
  const today = dayKey();
  P.lastDate = today;
  const st = stats(P, { words: WORDS });

  // One row per day, not per session: two sessions in a day are one study
  // day, or the streak rewards re-opening the app rather than doing the work.
  recordDay(P, {
    date: today,
    tracked: st.tracked,
    due: st.due,
    known: st.known,
    reviews: S.summary.reviews,
    newWords: S.summary.newWords,
    onTime: S.summary.onTime,
    late: S.summary.late,
    xp: S.summary.xp
  });

  const before = new Set(P.badges || []);
  P.badges = earnedBadges(P, { stats: st, today, perfectSentence: S.summary.perfect });
  S.summary.newBadges = P.badges.filter(b => !before.has(b));

  save(P);
  S.screen = 'done';
  render();
}

/**
 * Apply a grade to every word the current item covers, and award the XP it
 * actually earned — base for doing the work, plus the memory stability the
 * review genuinely bought. Nothing here can be earned without grading a card.
 *
 * A word is graded at most once per session. Two sentences in one session can
 * share a target word (a sentence is only skipped when *every* word it teaches
 * is already covered), and the word drills reserved by buildSession() sit
 * alongside sentences that may contain the same vocabulary. Grading twice would
 * apply the FSRS same-day term twice — about 1.29× stability each time — and
 * would count one memory as two reviews and two XP awards. The first grade
 * wins: word cards run before sentences, and a card is the sharper measurement
 * of that one word than a sentence graded across all of its targets.
 */
function awardGrade(id, g) {
  if (S.graded.has(id)) return;
  S.graded.add(id);
  const today = dayKey();
  const prev = P.items[id];
  // On time = not already overdue when it was answered.
  if (prev) (prev.due >= today ? S.summary.onTime++ : S.summary.late++);
  const next = applyGrade(P, id, g);
  const xp = xpFor(prev?.s, next.s);
  S.summary.xp += xp;
  P.xp = (P.xp || 0) + xp;      // lifetime total, only ever moved by a real grade
  S.summary.reviews++;
  if (g > 1) S.summary.right++;
  if (!prev) S.summary.newWords++;
}

function grade(g) {
  const item = current();
  const ids = item.kind === 'sentence' ? item.targetIds : [item.word.id];
  ids.forEach(id => awardGrade(id, g));
  save(P);
  advance();
}

document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
  if (!t || t.disabled) return;
  const act = t.getAttribute('data-act');

  if (act === 'start') {
    S.session = todaySession(); S.i = 0; S.screen = 'run';
    S.fb = null; S.picked = null;
    S.deckI = 0; S.flipped = false; S.skip = new Set(); S.graded = new Set();
    S.summary = blankSummary();
    render();
  }
  else if (act === 'home') { S.screen = 'home'; S.session = null; render(); }
  else if (act === 'next') advance();

  // ---- flashcard deck ------------------------------------------------
  else if (act === 'flip') { S.flipped = !S.flipped; render(); }
  else if (act === 'deck-back') { S.deckI = Math.max(0, S.deckI - 1); S.flipped = false; render(); }
  else if (act === 'deck-learn' || act === 'deck-known') {
    const item = current();
    const w = item.words[S.deckI];
    if (act === 'deck-known') {
      // Claimed as already known: introduce it at a long interval and drop
      // its card from the rest of this session. It still comes back on
      // schedule — nothing here removes a word from the rotation for good.
      awardGrade(w.id, 4);
      S.skip.add(w.id);
      save(P);
    }
    S.flipped = false;
    if (S.deckI + 1 < item.words.length) { S.deckI++; render(); }
    else advance();
  }

  // ---- multiple choice ------------------------------------------------
  else if (act === 'pick') { S.picked = parseInt(t.getAttribute('data-i'), 10); render(); }
  // A closed set of four: the app scored the answer, so it grades it too —
  // "Good" for a right pick, "Again" for a wrong one. "That was easy" is the
  // one judgement the learner still holds, and it is optional.
  else if (act === 'card-next') grade(parseInt(t.getAttribute('data-g'), 10));
  else if (act === 'mc-off') { P.mcMode = false; save(P); S.picked = null; render(); }
  else if (act === 'mc-on') { P.mcMode = true; save(P); S.fb = null; render(); }
  else if (act === 'mc') { P.mcMode = !mcOn(); save(P); render(); }
  else if (act === 'drills') {
    const i = DRILL_STEPS.indexOf(drillCount());
    P.wordDrills = DRILL_STEPS[(i + 1) % DRILL_STEPS.length];
    save(P); render();
  }

  else if (act === 'grade') grade(parseInt(t.getAttribute('data-g'), 10));
  else if (act === 'check-word') {
    // A word's English may list variants with a slash ("yard/fence");
    // acceptedForms() splits them, so both halves count as right.
    const item = current();
    const target = dirFor(item) === 'mge' ? item.word.en : item.word.mn;
    const box = document.getElementById('ansbox');
    const given = box ? box.value : '';
    const g = gradeAnswer(given, [target], Math.max(0, P.strictness - 0.15));
    S.fb = { ...g, given };
    render();
  }
  else if (act === 'submit') {
    const item = current();
    const s = item.sentence;
    const toMn = item.dir === 'egm';
    const box = document.getElementById('ansbox');
    const given = box ? box.value : '';
    // Every phrasing this sentence accepts, canonical first. Written down in
    // advance because once the app is live there is nobody to appeal to.
    const accepted = toMn
      ? [s.mn, ...(s.alt?.mn || [])]
      : [s.en, ...(s.alt?.en || [])];
    const g = gradeAnswer(given, accepted, Math.max(0, P.strictness - 0.15));
    // Diff against the form the answer actually scored best on: showing a
    // learner who wrote a legitimate alternative a diff against a sentence
    // they never attempted would read as a fault they did not commit.
    const diff = diffTokens(given, g.matched || accepted[0]);
    S.fb = { ...g, given, diff, alternative: g.matched !== accepted[0] };
    // A sentence reproduced with nothing missing — a real, checkable event.
    if (g.ok && !g.typo && diff.every(d => d.state === 'hit')) S.summary.perfect = true;
    render();
  }

  // ---- purpose --------------------------------------------------------
  else if (act === 'purpose') { S.editPurpose = true; render(); }
  else if (act === 'purpose-save') {
    const box = document.getElementById('purposebox');
    P.purpose = box ? box.value.trim().slice(0, 240) : '';
    S.editPurpose = false; save(P); render();
  }
  else if (act === 'purpose-cancel') { S.editPurpose = false; render(); }

  else if (act === 'tools') { S.tools = !S.tools; S.msg = ''; render(); }
  else if (act === 'copy') {
    copyCode().then(ok => {
      if (ok) markExported();
      S.msg = ok ? 'Copied' : '!Could not copy';
      render();
    });
  }
  else if (act === 'share') {
    // iOS share sheet: the only one-tap route off the device, and it never
    // touches the network — the OS hands the text to whatever app is picked.
    navigator.share({ title: 'Mongolian — backup code', text: encodeCode(P) })
      .then(() => { markExported(); S.msg = 'Shared'; render(); })
      .catch(err => {
        // Dismissing the sheet is not a failure, and must not claim a backup.
        if (err && err.name === 'AbortError') return;
        S.msg = '!Could not share';
        render();
      });
  }
  else if (act === 'import') {
    const box = document.getElementById('incode');
    const next = importCode(box ? box.value : '');
    if (next) { P = next; save(P); S.msg = 'Imported' + (next.migratedFrom ? ' (v1 → v2)' : ''); }
    else S.msg = '!Invalid code';
    render();
  }
});

document.addEventListener('keydown', e => {
  if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName) && e.key !== 'Enter') return;

  if (e.key === 'Enter' && !e.shiftKey) {
    const order = ['submit', 'check-word', 'card-next', 'deck-learn', 'next'];
    for (const act of order) {
      const b = document.querySelector(`[data-act="${act}"]`);
      if (b) { e.preventDefault(); b.click(); return; }
    }
  }
  if (e.key === ' ' && document.querySelector('[data-act="flip"]')) {
    e.preventDefault();
    document.querySelector('[data-act="flip"]').click();
    return;
  }
  // 1-4 picks an option while the question is open, and grades once it is
  // answered — the two never share a screen.
  if (/^[1-4]$/.test(e.key)) {
    const n = parseInt(e.key, 10);
    const pick = document.querySelector(`.choice[data-act="pick"][data-i="${n - 1}"]:not(:disabled)`);
    if (pick) { e.preventDefault(); pick.click(); return; }
    const g = document.querySelector(`[data-act="grade"][data-g="${n}"]`);
    if (g) { e.preventDefault(); g.click(); }
  }
});

/** Ask the browser to exempt our storage from eviction. */
async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (e) { /* non-fatal */ }
}

async function boot() {
  const [w, s] = await Promise.all([
    fetch('./data/words.json').then(r => r.json()),
    fetch('./data/sentences.json').then(r => r.json())
  ]);
  WORDS = w; SENTENCES = s;
  BYID = Object.fromEntries(WORDS.map(x => [x.id, x]));
  // Distractors come from drillable vocabulary only: offering «байна» as an
  // option against a noun gives the answer away by register alone.
  POOL = WORDS.filter(x => x.drill !== false);
  requestPersistence();
  registerServiceWorker();
  render();
}
boot();

/**
 * A home-screen PWA on iOS is resumed from memory, not re-navigated to, so the
 * browser's own "check for a new service worker" pass may never run — the app
 * can sit on a build from weeks ago indefinitely, silently. This checks for an
 * update on boot and again every time the app returns to the foreground, and
 * reloads once a new version has taken over so the swap is never stuck behind
 * a stale cache.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }).catch(() => {});

  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}
