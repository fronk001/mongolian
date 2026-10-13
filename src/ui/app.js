/** Controller: session flow, event wiring, persistence. */
import { makeFSRS, dayKey, daysBetween } from '../core/fsrs.js';
import { load, save as saveLocal, STORE_KEY, stats, encodeCode, importCode, exportAge, recordDay } from '../core/progress.js';
import { buildSession, applyGrade, buildPractice } from '../core/scheduler.js';
import { gradeAnswer } from '../core/grade.js';
import { buildChoices, shuffle, makeRng, hashSeed } from '../core/choices.js';
import { xpForAnswer, earnedBadges, stepCount, levelFor } from '../core/goals.js';
import { gradeDrill, applyGrammarGrade, topicMastery } from '../core/grammar.js';
import { afterAnswer, retryIndex, retryItem } from '../core/ladder.js';
import { pickReading, recordReading } from '../core/readings.js';
import { pathState, checkpointDue, buildCheckpoint, startCheckpoint, finishCheckpoint, creditHomeUnits, unitLabel, PASS_RIGHT } from '../core/path.js';
import { streakState, byBadgeId } from '../core/goals.js';
import { makeTilePools, bankFor, acceptedFor, minTiles, gradeBuild, orderDiff, tokensOf } from '../core/tiles.js';
import { createSync } from '../sync/engine.js';
import { firebaseBackend } from '../sync/firebase.js';
import { firebaseConfig } from '../sync/firebase-config.js';
import * as V from './views.js';
import { syncPanel, syncDot, todayNotice, openSignIn, signInOpen } from './account.js';
import { makePrefs } from './prefs.js';
import { makeSound } from './sound.js';

const el = document.getElementById('app');
// ?fake-sync=<device>: sync against a pretend server kept in this browser
// (tools/smoke.html), studying on a copy of the progress that is never the
// real one.
const params = new URLSearchParams(location.search);
const fake = params.has('fake-sync') ? params.get('fake-sync') || 'laptop' : null;
const KEY = fake ? `${STORE_KEY}:fake:${fake}` : STORE_KEY;
let WORDS = [], SENTENCES = [], GRAMMAR = [], READINGS = [], UNITS = [], BYID = {}, POOL = [];
// ?dev: preview what is waiting for review (reading drafts) before Luna or Sarnai sign off.
const DEV = params.has('dev');
let TILEPOOL = () => ({ siblings: [], others: [] });   // decoy candidates per sentence, built at boot
let P = load(localStorage, KEY);
let sync = null;      // created in boot(), before the first render
const PREFS = makePrefs(localStorage, KEY);   // this device only: never synced or exported
const SND = makeSound(() => PREFS.get('sound'));
let BUILD = '';       // the service worker's cache version, shown in Settings
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

const blankSummary = () => ({ reviews: 0, right: 0, newWords: 0, xp: 0, onTime: 0, late: 0, newBadges: [], levelBefore: 1, leveledTo: null, missed: 0, fixed: 0, shown: 0, missedWords: [], answers: 0, firstRight: 0, appealed: 0 });
const blankGrammarSummary = () => ({ xp: 0, right: 0, wrong: 0 });

let S = {
  screen: 'home', tab: 'today', session: null, i: 0,
  fb: null, msg: '',
  deckI: 0, flipped: false,          // flashcard deck position
  picked: null,                       // chosen multiple-choice index
  skip: new Set(),                    // words dismissed with "I know this"
  graded: new Set(),                  // words already graded this session
  run: 0,                             // first-try right answers in a row, for the combo cue
  pending: null,                      // the grade committed at this verdict, until Continue
  lastPick: null,                     // the option picked on this card, for a two-option fix
  retryOk: null,                      // a retry's answer: right or not (never graded)
  claimed: [],                        // deck words claimed as known, checked after the deck
  rung: null,                         // this sentence's surface: 'type' | 'blocks' | 'easy' | 'study'
  tiles: null,                        // { bank: [{t, ans}], placed: [bank index], refused }
  sawBlocks: false,                   // blocks were shown this attempt: it is graded as a blocks attempt
  rd: null,                           // the reader: { phase, qi, picked, right, wrong, word, en }
  cp: null,                           // today's checkpoint: { unit, of, right, typedRight, started }
  open: new Set(),                    // disclosures opened on the tab pages; survives sync redraws
  gScores: true,                      // this grammar pass earns XP: the first of the day per topic
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

/**
 * The sound for an answer the app has just judged. Every fifth right answer
 * in a row adds a third note — a real run, counted here, reset by any miss.
 * Called only from inside the tap that answered (INSTRUMENT, "Sound").
 */
function cue(ok, first = true) {
  if (!first) { SND.play(ok ? 'right' : 'wrong'); return; }
  if (!ok) { S.run = 0; SND.play('wrong'); return; }
  S.run++;
  SND.play(S.run % 5 === 0 ? 'combo' : 'right');
}

/** The grade a judged answer commits before any amendment: match Good, slip Hard, miss Again. */
const verdictGrade = g => (!g.ok ? 1 : g.typo ? 2 : 3);

/**
 * Commit the first attempt's grade at the verdict, not at Continue: leaving the
 * lesson from a verdict screen used to drop the grade, so the same card came
 * back fresh. Was hard / Was easy / I was right amend it — undo, then grade
 * again — so one answer is still one grade.
 */
function commit(item, g, typed = false, gain = null) {
  const ids = item.kind === 'sentence' ? item.targetIds : [item.word.id];
  const snaps = ids.filter(id => !S.graded.has(id)).map(id => ({
    id, prev: P.items[id] ? { ...P.items[id] } : null, intro: P.introduced.includes(id)
  }));
  // XP is per answer and fixed by the verdict, so amending the grade later
  // (Was easy, I was right) never changes what the answer scored.
  const xp = gain ?? xpForAnswer(g > 1, typed);
  const mode = typed ? 'type' : item.kind === 'card' ? 'choice' : 'blocks';
  S.pending = { item, g, snaps, xp: P.xp || 0, gain: xp, typed, summary: { ...S.summary, missedWords: [...S.summary.missedWords] } };
  if (item.checkpoint) {
    // A checkpoint answer is evidence for the unit, not a review: no FSRS.
    // The attempt counts from its first answer, so quitting is an attempt.
    if (!S.cp.started) { startCheckpoint(P, item.checkpoint); S.cp.started = true; }
    if (g > 1) { S.cp.right++; if (typed) S.cp.typedRight++; }
  } else ids.forEach(id => awardGrade(id, g, mode));
  S.summary.answers++;
  if (g > 1) S.summary.firstRight++;
  S.summary.xp += xp;
  P.xp = (P.xp || 0) + xp;      // lifetime total, only ever moved by an answer
  if (item.kind === 'sentence') item.attempt = S.sawBlocks ? 'blocks' : 'type';
  if (g === 1 && (item.kind === 'card' || item.kind === 'sentence')) {
    S.summary.missed++;
    if (item.kind === 'card') S.summary.missedWords.push(item.word);
    queueRetry(item, 'fix');
  }
  save(P);
}

function amend(g) {
  const pd = S.pending;
  if (!pd || pd.g === g) return;
  for (const s of pd.snaps) {
    if (s.prev) P.items[s.id] = s.prev; else delete P.items[s.id];
    if (!s.intro) P.introduced = P.introduced.filter(x => x !== s.id);
    S.graded.delete(s.id);
  }
  P.xp = pd.xp;
  S.summary = pd.summary;
  // "I was right": the miss is withdrawn, and so is its retry.
  if (pd.g === 1) S.session.items = S.session.items.filter((it, i) => i <= S.i || it.first !== pd.item);
  commit(pd.item, g, pd.typed, pd.gain);
  // "I was right" on a mismatch: keep his phrasing for Luna to rule on. It
  // grades Hard, but counts as neither right first time nor fixed.
  if (pd.g === 1 && g === 2 && S.fb && S.fb.given) {
    const it = pd.item, toMn = it.kind === 'sentence' ? it.dir === 'egm' : it.dir === 'egm';
    const target = it.kind === 'sentence' ? (toMn ? it.sentence.mn : it.sentence.en) : (toMn ? it.word.mn : it.word.en);
    const key = hashSeed(`${target}|${S.fb.given.trim()}`).toString(36);
    P.appeals = { ...(P.appeals || {}), [key]: {
      kind: it.kind, target, given: S.fb.given.trim(), toMn, day: dayKey(),
      ...(it.kind === 'card' ? { id: it.word.id } : { en: it.sentence.en, mn: it.sentence.mn }) } };
    S.summary.firstRight--;
    S.summary.appealed++;
    save(P);
  }
}

/** Put a retry of `item` into the lesson: a fix a few screens on, the rest at the end. */
function queueRetry(item, stage) {
  const extra = {};
  if (item.kind === 'sentence') {
    // typed → blocks → fewer blocks; at the end its own surface; study builds it.
    const first = item.first || item;
    extra.rung = stage === 'fix' ? (first.attempt === 'blocks' ? 'easy' : 'blocks')
      : stage === 'again' ? (first.attempt || 'type') : 'study';
  } else if (stage === 'fix') {
    const opts = item.kind === 'card' && S.lastPick && !S.lastPick.correct
      ? choicesFor(item).options : null;
    // Picked wrong from four: the fix offers that pick against the right one.
    // Typed wrong: the fix offers four fresh options.
    if (opts) extra.pair = [opts.find(o => o.correct), S.lastPick];
    else extra.forceMC = true;
  }
  const r = retryItem(item, stage, extra);
  // The passage closes the lesson: retries go before it, never after.
  let at = retryIndex(S.session.items, S.i, stage);
  const rd = S.session.items.findIndex((it, k) => k > S.i && it.kind === 'reading');
  if (rd >= 0 && at > rd) at = rd;
  S.session.items.splice(at, 0, r);
}

/** After a retry's verdict: queue the next step, or count it fixed or shown. */
function retryNext() {
  const item = current();
  const next = afterAnswer(item, item.retry === 'study' ? true : !!S.retryOk);
  if (next.queue) queueRetry(item, next.queue);
  if (next.outcome === 'fixed') S.summary.fixed++;
  if (next.outcome === 'shown') S.summary.shown++;
  S.retryOk = null;
  advance();
}

/** The surface the current sentence is on: a tapped switch, else the item's own rung. */
const rungOf = item => S.rung || item.rung || 'type';

function setupTiles(item, rung) {
  const s = item.sentence, toMn = item.dir === 'egm';
  S.tiles = {
    bank: bankFor(s, toMn, rung, TILEPOOL(s, toMn), `${s.mn}:${item.dir}:${dayKey()}:${item.retry || 0}`),
    placed: [], refused: null
  };
}

/** The grade a sentence's first attempt commits: blocks cap at Hard where they supplied the Mongolian. */
function sentenceGrade(g, item) {
  if (!S.sawBlocks) return verdictGrade(g);
  return g.ok ? (item.dir === 'egm' ? 2 : 3) : 1;
}

/** The line a retry's verdict carries. */
function retryNote(item, ok) {
  const next = afterAnswer(item, ok);
  if (next.outcome === 'fixed') return 'Fixed';
  if (next.queue === 'again') return 'Once more at the end';
  if (next.queue === 'study') return 'Shown again at the end';
  return '';
}


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

/** Today's lesson — or, with nothing due and nothing new, a practice lesson, so Start always works. */
function todaySession() {
  const built = buildSession(P, WORDS, SENTENCES);
  const s = built.items.length ? built : buildPractice(P, WORDS);
  // A baby paragraph closes the lesson when he can read one (core/readings.js).
  // A ready unit's checkpoint rides after the main items, before the reading.
  const unit = s.items.length ? checkpointDue(P, UNITS, WORDS) : null;
  if (unit) {
    const exclude = new Set(s.items.filter(it => it.kind === 'sentence').map(it => it.sentence.mn));
    const cp = buildCheckpoint(P, unit, SENTENCES, WORDS, { exclude, tries: (P.units?.[unit.id]?.tries) || 0 });
    if (cp.length) { s.items.push(...cp); s.checkpoint = { unit, of: cp.length }; }
  }
  const reading = s.items.length ? pickReading(P, READINGS, WORDS, { dev: DEV }) : null;
  if (reading) s.items.push({ kind: 'reading', reading });
  return s;
}

const blankRd = () => ({ phase: 'read', qi: 0, picked: null, right: 0, wrong: 0, word: null, en: new Set() });

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
  // A fix after a wrong pick: the right option and the one that was picked.
  if (item.pair) {
    return { usable: true, options: shuffle(item.pair, makeRng(hashSeed(`${item.word.id}:pair`))) };
  }
  // A retry gets a fresh arrangement: the same four in the same slots would be
  // a tap from memory, not a recall.
  return buildChoices(item.word, POOL, {
    dir, count: 4,
    introduced: new Set(P.introduced),
    seed: `${item.word.id}:${dir}:${dayKey()}${item.retry ? ':' + item.retry : ''}`
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
  if (item && item.kind === 'reading' && S.rd) return `run:${S.i}:${S.rd.phase}:${S.rd.qi}`;
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
      notice: todayNotice(syncStatus(), V.backupNotice(exportAge(P))),
      dot: syncDot(syncStatus())
    };
    let body;
    const path = UNITS.length ? pathState(P, UNITS, WORDS) : null;
    if (S.tab === 'progress') body = V.viewProgress(P, st, { ...ctx, path, open: S.open, drillable: POOL.length, byId: BYID });
    else if (S.tab === 'grammar') body = V.viewGrammarList(GRAMMAR, P);
    else if (S.tab === 'achievements') { S.tab = 'progress'; render(); return; }
    else if (S.tab === 'settings') body = settingsPage();
    else body = V.viewToday(P, st, todaySession(), { ...ctx, path, checkpointToday: !!checkpointDue(P, UNITS, WORDS) });
    el.innerHTML = body + V.tabBar(S.tab);
  } else if (S.screen === 'done') {
    el.innerHTML = V.viewDone(S.summary, st, P, { today });
  } else if (S.screen === 'grammar') {
    const topic = S.gTopic;
    if (!topic) { S.screen = 'home'; S.tab = 'grammar'; render(); return; }
    let body;
    if (S.gStep === -1) {
      body = V.viewGrammarIntro(topic, { seen: !!P.grammar[topic.id], open: S.open.has('why:' + topic.id) });
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
    } else if (item.kind === 'reading') {
      if (!S.rd) S.rd = blankRd();
      body = V.viewReading(item.reading, S.rd, BYID);
    } else if (item.kind === 'card') {
      const answeredOk = item.retry && (S.picked !== null || S.fb)
        ? (S.fb ? S.fb.ok : !!choicesFor(item).options[S.picked]?.correct) : null;
      body = V.viewCard(item, {
        retryNote: answeredOk === null ? '' : retryNote(item, answeredOk),
        fb: S.fb,
        previewIvls: previewFor(item.word.id),
        r: retrievabilityFor(item.word.id),
        dir: dirFor(item),
        choices: choicesFor(item),
        picked: S.picked,
        mcMode: mcOn()
      });
    } else {
      const rung = rungOf(item);
      if (rung !== 'type' && !S.tiles) { setupTiles(item, rung); if (!item.retry) S.sawBlocks = true; }
      body = V.viewSentence(item, {
        fb: S.fb,
        previews: item.targetIds.map(previewFor),
        byId: BYID,
        rung, tiles: S.tiles,
        minLen: minTiles(item.sentence, item.dir === 'egm'),
        retryNote: item.retry && S.fb ? retryNote(item, S.fb.ok) : ''
      });
    }
    // No dashboard header during a lesson: see lessonBar() on why the
    // telemetry belongs on the screen you read, not the screen you study on.
    const fixes = S.session.items.flatMap(it => it.kind === 'deck' ? it.words.map(() => false) : [!!it.retry]);
    el.innerHTML = V.lessonBar(step, total, fixes) + body;
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
      <div class="wline">
        <div style="flex:1"><div class="mn">Sound effects</div>${g('this device · the silent switch mutes them')}</div>
        <button class="btn ghost slim" data-act="sound">${{ on: 'On', soft: 'Soft', off: 'Off' }[PREFS.get('sound')] || 'On'}</button>
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
    <div class="foot"><span class="mono">APP BUILD</span><span class="mono">${BUILD ? V.esc(BUILD) : 'NOT INSTALLED'}</span></div>`;
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
  S.pending = null; S.lastPick = null; S.retryOk = null;
  S.rung = null; S.tiles = null; S.sawBlocks = false; S.rd = null;
  do { S.i++; } while (
    S.i < S.session.items.length &&
    S.session.items[S.i].kind === 'card' &&
    !S.session.items[S.i].retry && !S.session.items[S.i].check &&
    S.skip.has(S.session.items[S.i].word.id)
  );
  if (S.i >= S.session.items.length) finish(); else render();
}

function finish() {
  // Practising today's mistakes after Done is not a lesson: nothing is
  // recorded, and it ends where it started.
  if (S.session.mistakesRound) { S.screen = 'home'; S.session = null; render(); return; }
  const today = dayKey();
  P.lastDate = today;
  const st = stats(P, { words: WORDS });

  const before = streakState(P.history, today);
  const firstToday = !(P.history || []).some(h => h.date === today);
  const events = [];
  if (S.cp && S.cp.started) {
    const label = `${unitLabel(S.cp.unit, UNITS)} · ${S.cp.unit.title}`;
    if (finishCheckpoint(P, S.cp.unit.id, S.cp.right, S.cp.typedRight, S.cp.of)) events.push(`${label} complete`);
    else events.push(`Checkpoint ${S.cp.right} of ${S.cp.of} · again tomorrow`);
  }
  for (const id of creditHomeUnits(P, UNITS, today)) {
    const u = UNITS.find(x => x.id === id);
    events.push(`${unitLabel(u, UNITS)} complete · ${u.title}`);
  }

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
    xp: S.summary.xp,
    xv: 2,
    right: S.summary.firstRight,
    fixed: S.summary.fixed
  });

  const had = new Set(P.badges || []);
  P.badges = earnedBadges(P, { stats: st, today, perfectSentence: S.summary.perfect });
  S.summary.newBadges = P.badges.filter(b => !had.has(b));
  const after = streakState(P.history, today);
  // A rest day used: on the first lesson of the day, the covered days since
  // the previous lesson are the gap a rest day just bridged.
  const prior = (P.history || []).map(h => h.date).filter(d => d < today).sort().pop() || '';
  const rested = firstToday ? [...after.covered].filter(d => d > prior && d < today).length : 0;
  if (rested) events.push(rested === 1 ? 'Yesterday covered by a rest day' : `${rested} days covered by rest days`);
  if (after.bank > before.bank) events.push(`Rest day earned · ${after.bank} saved`);
  for (const id of S.summary.newBadges) { const b = byBadgeId[id]; if (b) events.push(`New badge · ${b.en}`); }
  S.summary.events = events;
  S.summary.milestone = events.some(e => / complete|New badge/.test(e));

  // A level crossed during this session, not just reported on it — the one
  // thing INSTRUMENT's "no fanfare but session-close" rule still gets a
  // distinct callout for, because it is rarer than a badge and never silent.
  const levelNow = levelFor(st.known).level;
  if (levelNow > S.summary.levelBefore) S.summary.leveledTo = levelNow;

  save(P);
  S.screen = 'done';
  SND.play(S.summary.milestone ? 'milestone' : 'finish');
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
function awardGrade(id, g, mode) {
  if (S.graded.has(id)) return;
  S.graded.add(id);
  const today = dayKey();
  const prev = P.items[id];
  // On time = not already overdue when it was answered.
  if (prev) (prev.due >= today ? S.summary.onTime++ : S.summary.late++);
  applyGrade(P, id, g, { mode });
  S.summary.reviews++;
  if (g > 1) S.summary.right++;
  if (!prev) S.summary.newWords++;
}

/** Continue from a verdict: the committed grade, amended if a quiet cell said otherwise. */
function grade(g) {
  if (S.pending) amend(g);
  else commit(current(), g);      // nothing committed yet (should not happen): grade now
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
  // XP for the first pass through a topic each day; a replay of the same
  // drills the same day is practice, and scores nothing.
  const xp = S.gScores ? xpForAnswer(ok, S.gTopic.drills[S.gStep]?.kind === 'transform') : 0;
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
    S.deckI = 0; S.flipped = false; S.skip = new Set(); S.graded = new Set(); S.run = 0;
    S.pending = null; S.lastPick = null; S.retryOk = null; S.claimed = [];
    S.cp = S.session.checkpoint ? { ...S.session.checkpoint, right: 0, typedRight: 0, started: false } : null;
    S.summary = blankSummary();
    // The level going in, so finish() can tell a level gained during this
    // session from a level the learner was already sitting at.
    S.summary.levelBefore = levelFor(stats(P, { words: WORDS }).known).level;
    render();
  }
  else if (act === 'home') { S.screen = 'home'; S.session = null; render(); }
  else if (act === 'tab') { S.tab = t.getAttribute('data-tab'); S.msg = ''; render(); }
  else if (act === 'next') advance();
  else if (act === 'retry-next') retryNext();

  // ---- reading ---------------------------------------------------------------
  else if (act === 'rw') {
    // First tap: the word's meaning. Second tap on it: the line's English.
    const l = +t.getAttribute('data-l'), k = +t.getAttribute('data-k');
    if (S.rd.word && S.rd.word[0] === l && S.rd.word[1] === k) { S.rd.en.add(l); S.rd.word = null; }
    else S.rd.word = [l, k];
    render({ keep: true });
  }
  else if (act === 'rd-q') { S.rd.phase = 'q'; S.rd.word = null; render(); }
  else if (act === 'rd-pick') {
    if (S.rd.picked !== null) return;
    const q = current().reading.questions[S.rd.qi];
    S.rd.picked = +t.getAttribute('data-i');
    const ok = S.rd.picked === q.answer;
    if (ok) S.rd.right++; else S.rd.wrong++;
    cue(ok, false);
    render();
  }
  else if (act === 'rd-next') {
    const r = current().reading;
    S.rd.picked = null;
    if (S.rd.qi + 1 < r.questions.length) S.rd.qi++; else S.rd.phase = 'end';
    render();
  }
  else if (act === 'rd-done') {
    // The first read of a passage scores, once: 1 per question, +1 if right.
    // Rereads score nothing. Never applyGrade: reading is not a recall test.
    const r = current().reading;
    if (recordReading(P, r.id, S.rd.right, S.rd.wrong)) {
      const xp = r.questions.length + S.rd.right;
      S.summary.xp += xp;
      P.xp = (P.xp || 0) + xp;
      S.summary.read = (S.summary.read || 0) + 1;
    }
    save(P);
    advance();
  }

  // ---- building blocks ----------------------------------------------------
  else if (act === 'use-blocks') { S.rung = 'blocks'; S.tiles = null; render(); }
  else if (act === 'use-typing') { S.rung = 'type'; render(); }   // still a blocks attempt: S.sawBlocks stays
  else if (act === 'tile-place') {
    const i = parseInt(t.getAttribute('data-i'), 10);
    const item = current();
    if (rungOf(item) === 'study') {
      // Study refuses a block that is not next, so the build always ends right.
      const want = tokensOf(item.dir === 'egm' ? item.sentence.mn : item.sentence.en)[S.tiles.placed.length];
      if (S.tiles.bank[i].t !== want) { S.tiles.refused = i; SND.play('wrong'); render(); return; }
    }
    S.tiles.refused = null;
    if (!S.tiles.placed.includes(i)) S.tiles.placed.push(i);
    render();
  }
  else if (act === 'tile-return') {
    S.tiles.placed.splice(parseInt(t.getAttribute('data-k'), 10), 1);
    S.tiles.refused = null;
    render();
  }
  else if (act === 'submit-tiles') {
    const item = current();
    const s = item.sentence, toMn = item.dir === 'egm';
    const placed = S.tiles.placed.map(i => S.tiles.bank[i].t);
    const accepted = acceptedFor(s, toMn);
    const g = gradeBuild(placed, accepted);
    const given = placed.join(' ');
    S.fb = { ...g, given, diff: orderDiff(given, g.matched || accepted[0]), blocks: true,
      alternative: g.matched !== accepted[0], grade: g.ok ? (toMn ? 2 : 3) : 1 };
    if (item.retry) S.retryOk = g.ok; else commit(item, S.fb.grade, false);
    cue(g.ok, !item.retry);
    render();
  }
  else if (act === 'toggle') {
    const id = t.getAttribute('data-id');
    if (S.open.has(id)) S.open.delete(id); else S.open.add(id);
    render({ keep: true });
  }
  else if (act === 'practise-mistakes') {
    // Today's missed words once more, ungraded: every item is a retry, so
    // nothing here reaches applyGrade, XP or the day's record.
    const words = S.summary.missedWords;
    S.session = { mistakesRound: true, items: words.map(word =>
      ({ kind: 'card', word, isNew: false, dir: 'egm', retry: 'again', first: { kind: 'card', word } })) };
    S.i = 0; S.screen = 'run'; S.fb = null; S.picked = null;
    S.summary = blankSummary();
    render();
  }

  // ---- flashcard deck ------------------------------------------------
  else if (act === 'flip') { S.flipped = !S.flipped; render(); }
  else if (act === 'deck-back') { S.deckI = Math.max(0, S.deckI - 1); S.flipped = false; render(); }
  else if (act === 'deck-learn' || act === 'deck-known') {
    const item = current();
    const w = item.words[S.deckI];
    if (act === 'deck-known') {
      // Claimed as already known: checked straight after the deck by one
      // question in the harder direction, and graded on that answer. A claim
      // alone used to set a 16-day interval and pay full XP with no recall.
      S.claimed.push(w);
      S.skip.add(w.id);
    }
    S.flipped = false;
    if (S.deckI + 1 < item.words.length) { S.deckI++; render(); }
    else {
      const checks = S.claimed.map(word => ({ kind: 'card', word, isNew: true, dir: 'egm', check: true }));
      S.session.items.splice(S.i + 1, 0, ...checks);
      S.claimed = [];
      advance();
    }
  }

  // ---- multiple choice ------------------------------------------------
  else if (act === 'pick') {
    const item = current();
    S.picked = parseInt(t.getAttribute('data-i'), 10);
    const opt = choicesFor(item).options[S.picked];
    const right = !!(opt && opt.correct);
    if (item.retry) S.retryOk = right;
    else { S.lastPick = opt; commit(item, right ? 3 : 1, false); }
    cue(right, !item.retry);
    render();
  }
  // A closed set of four: the app scored the answer, so it grades it too —
  // "Good" for a right pick, "Again" for a wrong one. "That was easy" is the
  // one judgement the learner still holds, and it is optional.
  else if (act === 'card-next') grade(parseInt(t.getAttribute('data-g'), 10));
  else if (act === 'mc-off') { P.mcMode = false; save(P); S.picked = null; render(); }
  else if (act === 'mc-on') { P.mcMode = true; save(P); S.fb = null; render(); }
  else if (act === 'mc') { P.mcMode = !mcOn(); save(P); render(); }
  else if (act === 'sound') {
    const order = ['on', 'soft', 'off'];
    PREFS.set('sound', order[(order.indexOf(PREFS.get('sound')) + 1) % order.length]);
    SND.play('right');      // let the new level be heard (silent when Off)
    render();
  }
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
    if (item.retry) S.retryOk = g.ok;
    else commit(item, verdictGrade(g), true);
    cue(g.ok, !item.retry);
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
    const diff = orderDiff(given, g.matched || accepted[0]);
    const grade = sentenceGrade(g, item);
    S.fb = { ...g, given, diff, alternative: g.matched !== accepted[0], grade, blocks: S.sawBlocks };
    // A sentence reproduced with nothing missing — a real, checkable event.
    if (g.ok && !g.typo && !item.retry && !S.sawBlocks && diff.every(d => d.state === 'hit')) S.summary.perfect = true;
    if (item.retry) S.retryOk = g.ok; else commit(item, grade, !S.sawBlocks);
    cue(g.ok, !item.retry);
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
    S.gScores = (P.grammar[topic.id] || {}).last !== dayKey();
    S.gBank = []; S.gBuild = []; S.gSummary = blankGrammarSummary(); S.run = 0;
    S.screen = 'grammar';
    render();
  }
  else if (act === 'grammar-begin') { S.gStep = 0; setupGrammarStep(); render(); }
  else if (act === 'grammar-exit') { S.screen = 'home'; S.tab = 'grammar'; S.gTopic = null; render(); }
  else if (act === 'grammar-pick') {
    const drill = S.gTopic.drills[S.gStep];
    const i = parseInt(t.getAttribute('data-i'), 10);
    S.gPicked = i;
    const ok = gradeDrill(drill, drill.options[i]).ok;
    awardGrammarGrade(ok);
    cue(ok);
    render();
  }
  else if (act === 'grammar-check') {
    const drill = S.gTopic.drills[S.gStep];
    const box = document.getElementById('ansbox');
    const given = box ? box.value : '';
    const g = gradeDrill(drill, given, Math.max(0, P.strictness - 0.15));
    S.gFb = { ...g, given };
    awardGrammarGrade(g.ok);
    cue(g.ok);
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
    cue(g.ok);
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
    const order = ['submit', 'submit-tiles', 'check-word', 'grammar-check', 'grammar-build-check',
      'card-next', 'grade', 'retry-next', 'rd-q', 'rd-next', 'rd-done', 'grammar-continue', 'deck-learn', 'next'];
    for (const act of order) {
      const b = document.querySelector(`[data-act="${act}"]`);
      if (b) { e.preventDefault(); b.click(); return; }
    }
  }
  // Blocks on the laptop: 1–9 place the bank's blocks in order, Backspace
  // sends the last placed one back.
  if (S.tiles && !(e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName))) {
    if (/^[1-9]$/.test(e.key)) {
      const b = document.querySelector(`[data-act="tile-place"][data-i="${parseInt(e.key, 10) - 1}"]:not(:disabled)`);
      if (b) { e.preventDefault(); b.click(); return; }
    }
    if (e.key === 'Backspace') {
      const placed = document.querySelectorAll('[data-act="tile-return"]');
      if (placed.length) { e.preventDefault(); placed[placed.length - 1].click(); return; }
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
      document.querySelector(`.choice[data-act="rd-pick"][data-i="${n - 1}"]:not(:disabled)`) ||
      document.querySelector(`.choice[data-act="grammar-pick"][data-i="${n - 1}"]:not(:disabled)`);
    if (pick) { e.preventDefault(); pick.click(); return; }
    const g = document.querySelector(`[data-act="grade"][data-g="${n}"]`);
    if (g) { e.preventDefault(); g.click(); }
  }
});

/**
 * Which build is running, from the service worker's cache name (mng-<hash>).
 * Shown in Settings so Fred can see when the iPhone has picked up a release.
 */
async function readBuild() {
  try {
    const keys = await caches.keys();
    const k = keys.find(x => x.startsWith('mng-'));
    if (k) { BUILD = k.slice(4); if (S.screen === 'home' && S.tab === 'settings' && quiet()) render({ keep: true }); }
  } catch (e) { /* no Cache Storage: not installed */ }
}

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
  const [w, s, g, rd, un] = await Promise.all([
    fetch('./data/words.json').then(r => r.json()),
    fetch('./data/sentences.json').then(r => r.json()),
    fetch('./data/grammar.json').then(r => r.json()),
    fetch('./data/readings.json').then(r => r.json()).catch(() => []),
    fetch('./data/units.json').then(r => r.json()).catch(() => ({ units: [] }))
  ]);
  WORDS = w; SENTENCES = s; GRAMMAR = g; READINGS = rd; UNITS = un.units || [];
  BYID = Object.fromEntries(WORDS.map(x => [x.id, x]));
  // Distractors come from drillable vocabulary only: offering «байна» as an
  // option against a noun gives the answer away by register alone.
  POOL = WORDS.filter(x => x.drill !== false);
  TILEPOOL = makeTilePools(WORDS, SENTENCES);
  sync = createSync({ storage: localStorage, key: KEY, backend: await makeBackend(), state: () => P, adopt, idle });
  sync.subscribe(() => { if (quiet()) render({ keep: true }); });
  requestPersistence();
  registerServiceWorker();
  readBuild();
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
