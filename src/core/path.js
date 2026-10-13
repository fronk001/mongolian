/**
 * The path: units of words (src/data/units.json), one ladder instead of levels.
 * Design: docs/design/D-gamification.md §3.5; plan: docs/PLAN.md §4.
 *
 * A unit fills as its words become familiar (FSRS stability ≥ 7 days, about
 * two clean spaced recalls). A home unit — the words Fred met before the path
 * existed — completes when all its words are familiar. A textbook unit is
 * then "ready" and completes when its checkpoint is passed: 5 sentences, 4
 * right first time, at least 3 of them typed. One attempt per unit per day,
 * recorded at the first answer, so quitting counts. Completion is recorded
 * once and kept, like a badge. Checkpoints never touch FSRS.
 *
 * DOM-free.
 */
import { dayKey } from './fsrs.js';
import { makeRng, hashSeed, shuffle } from './choices.js';

export const FAMILIAR_S = 7;
export const CHECKPOINT_SIZE = 5;
export const PASS_RIGHT = 4;
export const PASS_TYPED = 3;

export function wordState(p, id) {
  const it = p.items[id];
  return !it ? 'new' : it.s >= FAMILIAR_S ? 'familiar' : 'learning';
}

/** "Home 3" / "Unit 1": numbered within its kind, so ids never show. */
export function unitLabel(unit, units) {
  const home = unit.part === 'home';
  const n = units.filter(u => (u.part === 'home') === home).indexOf(unit) + 1;
  return `${home ? 'Home' : 'Unit'} ${n}`;
}

/** done | ready | active | later | planned, with have (familiar) / need. */
export function unitState(unit, p) {
  if (unit.planned) return { status: 'planned', have: 0, need: 0, met: 0 };
  const need = unit.words.length;
  let have = 0, met = 0;
  for (const id of unit.words) {
    const s = wordState(p, id);
    if (s !== 'new') met++;
    if (s === 'familiar') have++;
  }
  const rec = (p.units || {})[unit.id];
  const status = rec && rec.passed ? 'done'
    : have === need ? 'ready'
    : met ? 'active' : 'later';
  return { status, have, need, met, rec };
}

/**
 * Units in the order Fred meets them: by where each unit's first word sits
 * in words.json, which is the order the deck introduces them.
 */
export function orderedUnits(units, words) {
  const pos = new Map(words.map((w, i) => [w.id, i]));
  const at = u => (u.planned || !u.words.length ? Infinity : Math.min(...u.words.map(id => pos.get(id) ?? Infinity)));
  return units.map((u, i) => ({ u, i, at: at(u) }))
    .sort((a, b) => a.at - b.at || a.i - b.i).map(x => x.u);
}

/** Every unit with its state, in path order, and the current one. */
export function pathState(p, units, words) {
  const list = orderedUnits(units, words).map(u => ({ unit: u, label: unitLabel(u, units), ...unitState(u, p) }));
  const current = list.find(x => x.status !== 'done' && x.status !== 'planned') || null;
  return { list, current, done: list.filter(x => x.status === 'done').length,
    total: list.filter(x => x.status !== 'planned').length };
}

/**
 * Home units whose words are all familiar are complete — credited from his
 * memory, no checkpoint (plan decision 3). Records the day once; returns the
 * ids completed now.
 */
export function creditHomeUnits(p, units, today = dayKey()) {
  const out = [];
  for (const u of units) {
    if (u.part !== 'home' || u.planned) continue;
    const st = unitState(u, p);
    if (st.status === 'ready') {
      p.units = { ...(p.units || {}), [u.id]: { ...(p.units || {})[u.id], passed: today, credited: true } };
      out.push(u.id);
    }
  }
  return out;
}

/** The textbook unit whose checkpoint rides in today's lesson, or null. */
export function checkpointDue(p, units, words, today = dayKey()) {
  for (const x of pathState(p, units, words).list) {
    if (x.unit.part === 'home' || x.status !== 'ready') continue;
    if (x.rec && x.rec.last === today) continue;   // one attempt a day
    return x.unit;
  }
  return null;
}

/**
 * The checkpoint: 5 sentences that contain a unit word and nothing he has
 * not met, seeded on the unit and the attempt, 3 into Mongolian then 2 out
 * of it; topped up with word cards when too few sentences qualify.
 */
export function buildCheckpoint(p, unit, sentences, words, { exclude = new Set(), tries = 0 } = {}) {
  const byId = Object.fromEntries(words.map(w => [w.id, w]));
  const inUnit = new Set(unit.words);
  const usable = s => s.ids.some(id => inUnit.has(id)) &&
    s.ids.every(id => !byId[id] || byId[id].drill === false || p.items[id]);
  const rng = makeRng(hashSeed(`${unit.id}:${tries}`));
  let pool = shuffle(sentences.filter(s => usable(s) && !exclude.has(s.mn)), rng);
  if (pool.length < CHECKPOINT_SIZE) pool = shuffle(sentences.filter(usable), rng);
  const items = pool.slice(0, CHECKPOINT_SIZE).map((s, i) => ({
    kind: 'sentence', sentence: s, dir: i < 3 ? 'egm' : 'mge',
    targetIds: s.ids.filter(id => inUnit.has(id)), weak: 0, comprehensible: 1, checkpoint: unit.id
  }));
  const weakest = unit.words.filter(id => p.items[id]).sort((a, b) => p.items[a].s - p.items[b].s);
  for (const id of weakest) {
    if (items.length >= CHECKPOINT_SIZE) break;
    items.push({ kind: 'card', word: byId[id], isNew: false, dir: 'egm', checkpoint: unit.id });
  }
  return items;
}

/** An attempt starts: counted at the first answer, so quitting is an attempt. */
export function startCheckpoint(p, unitId, today = dayKey()) {
  const rec = (p.units || {})[unitId] || {};
  p.units = { ...(p.units || {}), [unitId]: { ...rec, tries: (rec.tries || 0) + 1, last: today } };
}

/** The attempt's result: passed records the day once, with the score. */
export function finishCheckpoint(p, unitId, right, typedRight, of, today = dayKey()) {
  const passed = right >= PASS_RIGHT && typedRight >= PASS_TYPED;
  const rec = (p.units || {})[unitId] || {};
  if (passed && !rec.passed) p.units = { ...(p.units || {}), [unitId]: { ...rec, passed: today, right, of } };
  return passed;
}
