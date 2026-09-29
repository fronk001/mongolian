/** Controller: session flow, event wiring, persistence. */
import { makeFSRS, dayKey, daysBetween } from '../core/fsrs.js';
import { load, save as saveLocal, STORE_KEY, stats, encodeCode, importCode, exportAge, recordDay } from '../core/progress.js';
import { buildSession, applyGrade } from '../core/scheduler.js';
import { gradeAnswer, diffTokens } from '../core/grade.js';
import { buildChoices, shuffle, makeRng, hashSeed } from '../core/choices.js';
import { xpFor, earnedBadges, stepCount, levelFor, xpForGrammar } from '../core/goals.js';
import { gradeDrill, applyGrammarGrade, topicMastery } from '../core/grammar.js';
import { createSync } from '../sync/engine.js';
import { firebaseBackend } from '../sync/firebase.js';
import { firebaseConfig } from '../sync/firebase-config.js';
import * as V from './views.js';
import { syncPanel, todayNotice, openSignIn, signInOpen } from './account.js';

const el = document.getElementById('app');
// ?fake-sync=<device>: sync against a pretend server kept in this browser
// (tools/smoke.html), studying on a copy of the progress that is never the
// real one.
const params = new URLSearchParams(location.search);
const fake = params.has('fake-sync') ? params.get('fake-sync') || 'laptop' : null;
const KEY = fake ? `${STORE_KEY}:fake:${fake}` : STORE_KEY;
let WORDS = [], SENTENCES = [], GRAMMAR = [], BYID = {}, POOL = [];
let P = load(localStorage, KEY);
let sync = null;      // created in boot(), before the first render
let updateReady = false;   // a new version has taken over and waits to be shown

/**
 * Keep a change: on this device at once, and online as soon as it can go.
 * `replace` is for an imported code, which replaces rather than adds up.
 */
function save(p, opts) {
  saveLocal(p, localStorage, KEY);
  if (sync) sync.commit(p, opts);
}
const syncStatus = () => (sync ? sync.status() : { mode: 'off', claimed: false });

/**
 * Whether the screen can be redrawn for news from elsewhere (another device,
 * the connection) without the learner noticing anything but new figures:
 * not in a lesson or a drill, and nothing half-typed.
 */
function quiet() {
  if (S.screen !== 'home' && S.screen !== 'done') return false;
  if (S.editPurpose) return false;
  const inc = document.getElementById('incode');
  return !(inc && inc.value);
}

/** Also a safe moment to reload the page: for a new version, or sync's retry after an offline start. */
const idle = () => S.screen === 'home' && quiet() && !signInOpen();

/**
 * The online copy had something newer (another device studied): take it.
 * Shown at once where that disturbs nothing; mid-lesson it waits for the
 * next screen, and grading carries on against the newer copy.
 */
function adopt(next) {
  P = next;
  saveLocal(P, localStorage, KEY);
  if (quiet()) render({ keep: true });
}

const blankSummary = () => ({ reviews: 0, right: 0, newWords: 0, xp: 0, onTime: 0, late: 0, newBadges: [], levelBefore: 1, leveledTo: null });
const blankGrammarSummary = () => ({ xp: 0, right: 0, wrong: 0 });

let S = {
  screen: 'home', tab: 'today', session: null, i: 0,
  fb: null, msg: '',
  deckI: 0, flipped: false,          // flashcard deck position
  picked: null,                       // chosen multiple-choice index
  skip: new Set(),                    // words dismissed with "I know this"
  graded: new Set(),                  // words already graded this session
  editPurpose: false,
  summary: blankSummary(),
  // ---- grammar topic practice (separate from the daily FSRS session) -----
  gTopic: null,      // the open topic, or null
  gStep: -1,         // -1 = intro/summary, 0..drills.length-1 = a drill, drills.length = done
  gPicked: null,     // choice drill: picked option index
  gFb: null,         // transform/build drill: grade result, once checked
  gBank: [],         // build drill: shuffled word list for the current step
  gBuild: [],        // build drill: tapped bank indices, in order
  gSummary: blankGrammarSummary()
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
  if (S.screen === 'home') return `home:${S.tab}:${S.editPurpose}`;
  if (S.screen === 'grammar') return `grammar:${S.gTopic ? S.gTopic.id : ''}:${S.gStep}`;
  if (S.screen !== 'run') return `${S.screen}`;
  const item = current();
  return `run:${S.i}:${item && item.kind === 'deck' ? S.deckI + ':' + S.flipped : ''}`;
}

/** `keep`: a redraw for news from elsewhere, which leaves the scroll position and focus alone. */
function render({ keep = false } = {}) {
  const st = stats(P, { words: WORDS });
  const today = dayKey();
  const key = renderKey();
  const fresh = key !== lastKey;
  lastKey = key;
  el.className = fresh ? 'wrap enter' : 'wrap';

  if (S.screen === 'home') {
    el.className += ' tabbed';
    const ctx = {
      today, exportAge: exportAge(P), corpusWords: POOL.length, editPurpose: S.editPurpose,
      notice: todayNotice(syncStatus(), V.backupNotice(exportAge(P)))
    };
    let body;
    if (S.tab === 'progress') body = V.viewProgress(P, st, ctx);
    else if (S.tab === 'grammar') body = V.viewGrammarList(GRAMMAR, P);
    else if (S.tab === 'achievements') body = V.viewAchievements(P, st, ctx);
    else if (S.tab === 'settings') body = settingsPage();
    else body = V.viewToday(P, st, todaySession(), ctx);
    el.innerHTML = body + V.tabBar(S.tab);
  } else if (S.screen === 'done') {
    el.innerHTML = V.viewDone(S.summary, st, P, { today });
  } else if (S.screen === 'grammar') {
    const topic = S.gTopic;
    if (!topic) { S.screen = 'home'; S.tab = 'grammar'; render(); return; }
    let body;
    if (S.gStep === -1) {
      body = V.viewGrammarIntro(topic);
    } else if (S.gStep >= topic.drills.length) {
      body = V.viewGrammarDone(topic, S.gSummary, topicMastery(P.grammar[topic.id]));
    } else {
      body = V.viewGrammarDrill(topic, topic.drills[S.gStep], S.gStep, topic.drills.length, {
        picked: S.gPicked, fb: S.gFb, bank: S.gBank, build: S.gBuild
      });
    }
    el.innerHTML = body;
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

  if (!keep) {
    window.scrollTo(0, 0);
    const box = document.getElementById('ansbox') || document.getElementById('purposebox');
    if (box && !('ontouchstart' in window)) box.focus();
  }
  settle();
}

// A moment with nothing under way: a waiting new version can load now, and
// sync can make its second try after an offline start.
function settle() {
  if (!idle()) return;
  if (updateReady) location.reload();
  else if (sync) sync.poke();
}

/** The Settings tab — sync, options, and the backup code, always shown in full now that it is its own page. */
function settingsPage() {
  const g = en => `<div class="gl">${V.esc(en)}</div>`;
  const age = exportAge(P);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const synced = syncStatus().claimed;
  // With sync on, the online copy is the backup: an old code is no longer
  // something to act on, so it stops claiming red.
  const stale = age === null || age >= 14;
  const warn = stale && !synced;
  const panel = syncPanel(syncStatus());
  return V.pageHead('SETTINGS') + panel +
    `<div class="h"${panel ? '' : ' style="margin-top:10px"'}><span class="mono">OPTIONS</span></div>
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
    <div class="panel${warn ? ' red' : stale ? '' : ' blue'}">
      <div class="wline">
        <div style="flex:1"><div class="mn">Last export</div>${
          synced ? g('optional while sync is on — the online copy is the backup') : ''}</div>
        <div class="mono${warn ? ' red' : ''}">${
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
      </div>
      <div class="gl" style="margin-top:10px">importing replaces everything ${
        synced ? 'on this device and online' : 'on this device'} — it does not merge</div>
    </div>
    <div class="foot"><span class="mono">INSTRUMENT v3 · SOYOMBO</span><span class="mono">FSRS-6 · OFFLINE-FIRST</span></div>`;
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

  // A level crossed during this session, not just reported on it — the one
  // thing INSTRUMENT's "no fanfare but session-close" rule still gets a
  // distinct callout for, because it is rarer than a badge and never silent.
  const levelNow = levelFor(st.known).level;
  if (levelNow > S.summary.levelBefore) S.summary.leveledTo = levelNow;

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

/**
 * Grammar practice has no FSRS stability to earn XP off, so this is flatter
 * than awardGrade() — a base for the attempt, a bonus for getting it right —
 * but it is still real: nothing here fires without a drill being answered.
 * Mastery is a running right/wrong count per topic, not per-drill; a topic
 * is practised on demand, never scheduled.
 */
function awardGrammarGrade(ok) {
  applyGrammarGrade(P, S.gTopic.id, ok);
  const xp = xpForGrammar(ok);
  S.gSummary.xp += xp;
  P.xp = (P.xp || 0) + xp;      // lifetime total, same figure the word/sentence XP moves
  S.gSummary.right += ok ? 1 : 0;
  S.gSummary.wrong += ok ? 0 : 1;
  save(P);
}

/** Shuffle a fresh word bank when a build drill comes into view. */
function setupGrammarStep() {
  const topic = S.gTopic;
  if (!topic || S.gStep < 0 || S.gStep >= topic.drills.length) return;
  const drill = topic.drills[S.gStep];
  if (drill.kind === 'build') {
    S.gBank = shuffle(drill.words, makeRng(hashSeed(drill.id)));
  }
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
    // The level going in, so finish() can tell a level gained during this
    // session from a level the learner was already sitting at.
    S.summary.levelBefore = levelFor(stats(P, { words: WORDS }).known).level;
    render();
  }
  else if (act === 'home') { S.screen = 'home'; S.session = null; render(); }
  else if (act === 'tab') { S.tab = t.getAttribute('data-tab'); S.msg = ''; render(); }
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

  // ---- grammar topic practice ------------------------------------------
  else if (act === 'grammar-open') {
    const topic = GRAMMAR.find(g => g.id === t.getAttribute('data-id'));
    if (!topic) return;
    S.gTopic = topic; S.gStep = -1; S.gPicked = null; S.gFb = null;
    S.gBank = []; S.gBuild = []; S.gSummary = blankGrammarSummary();
    S.screen = 'grammar';
    render();
  }
  else if (act === 'grammar-begin') { S.gStep = 0; setupGrammarStep(); render(); }
  else if (act === 'grammar-exit') { S.screen = 'home'; S.tab = 'grammar'; S.gTopic = null; render(); }
  else if (act === 'grammar-pick') {
    const drill = S.gTopic.drills[S.gStep];
    const i = parseInt(t.getAttribute('data-i'), 10);
    S.gPicked = i;
    awardGrammarGrade(gradeDrill(drill, drill.options[i]).ok);
    render();
  }
  else if (act === 'grammar-check') {
    const drill = S.gTopic.drills[S.gStep];
    const box = document.getElementById('ansbox');
    const given = box ? box.value : '';
    const g = gradeDrill(drill, given, Math.max(0, P.strictness - 0.15));
    S.gFb = { ...g, given };
    awardGrammarGrade(g.ok);
    render();
  }
  else if (act === 'grammar-build-tap') {
    const i = parseInt(t.getAttribute('data-i'), 10);
    if (!S.gBuild.includes(i)) S.gBuild.push(i);
    render();
  }
  else if (act === 'grammar-build-remove') { S.gBuild.pop(); render(); }
  else if (act === 'grammar-build-check') {
    const drill = S.gTopic.drills[S.gStep];
    const g = gradeDrill(drill, S.gBuild.map(i => S.gBank[i]));
    S.gFb = g;
    awardGrammarGrade(g.ok);
    render();
  }
  else if (act === 'grammar-continue') {
    S.gStep++; S.gPicked = null; S.gFb = null; S.gBuild = [];
    setupGrammarStep();
    render();
  }

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
    if (next) {
      // Clear the box first: a half-pasted code holds back redraws (quiet()).
      if (box) box.value = '';
      P = next; save(P, { replace: true });
      S.msg = 'Imported' + (next.migratedFrom ? ' (v1 → v2)' : '');
    }
    else S.msg = '!Invalid code';
    render();
  }

  // ---- sync -------------------------------------------------------------
  else if (act === 'sync-sign-in') openSignIn(sync);
  else if (act === 'sync-sign-out') {
    const { waiting } = sync.status();
    const unsent = waiting
      ? `\n\n${waiting} ${waiting === 1 ? 'change hasn’t' : 'changes haven’t'} reached the online copy yet. ` +
        'They stay on this device and go up when you sign in again.'
      : '';
    if (confirm(`Stop syncing on this device? Your progress stays here, and online.${unsent}`)) sync.signOut();
  }
  else if (act === 'sync-retry') location.reload();
});

document.addEventListener('keydown', e => {
  if (signInOpen()) return;   // the sign-in form handles its own keys
  if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName) && e.key !== 'Enter') return;

  if (e.key === 'Enter' && !e.shiftKey) {
    const order = ['submit', 'check-word', 'grammar-check', 'grammar-build-check',
      'card-next', 'grammar-continue', 'deck-learn', 'next'];
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
    const pick = document.querySelector(`.choice[data-act="pick"][data-i="${n - 1}"]:not(:disabled)`) ||
      document.querySelector(`.choice[data-act="grammar-pick"][data-i="${n - 1}"]:not(:disabled)`);
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

/** The online database, or the pretend one under ?fake-sync. None without a config. */
async function makeBackend() {
  if (fake) {
    const { fakeBackend, fakeServer } = await import('../sync/fake-backend.js');
    return fakeBackend({ server: fakeServer({ storage: localStorage }), storage: localStorage, device: fake });
  }
  return firebaseConfig ? firebaseBackend(firebaseConfig) : null;
}

async function boot() {
  const [w, s, g] = await Promise.all([
    fetch('./data/words.json').then(r => r.json()),
    fetch('./data/sentences.json').then(r => r.json()),
    fetch('./data/grammar.json').then(r => r.json())
  ]);
  WORDS = w; SENTENCES = s; GRAMMAR = g;
  BYID = Object.fromEntries(WORDS.map(x => [x.id, x]));
  // Distractors come from drillable vocabulary only: offering «байна» as an
  // option against a noun gives the answer away by register alone.
  POOL = WORDS.filter(x => x.drill !== false);
  sync = createSync({ storage: localStorage, key: KEY, backend: await makeBackend(), state: () => P, adopt, idle });
  sync.subscribe(() => { if (quiet()) render({ keep: true }); });
  requestPersistence();
  registerServiceWorker();
  render();
  // After the first paint: loads the database code, and picks up the
  // sign-in if this device has one. Nothing on screen waits for it.
  sync.start();
}
boot();

/**
 * A home-screen PWA on iOS is resumed from memory, not re-navigated to, so the
 * browser's own "check for a new service worker" pass may never run — the app
 * can sit on a build from weeks ago indefinitely, silently. This checks for an
 * update on boot and again every time the app returns to the foreground, and
 * reloads once a new version has taken over so the swap is never stuck behind
 * a stale cache.
 *
 * The reload waits for a moment with nothing under way (settle(), from
 * render()), or for the app to be out of sight: never under a question being
 * answered or a half-typed password. The very first copy taking over is not
 * an update at all, and reloads nothing: the page is already current.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }).catch(() => {});

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    updateReady = true;
    if (idle()) location.reload();
  });
  document.addEventListener('visibilitychange', () => {
    if (updateReady && document.hidden) location.reload();
  });
}
