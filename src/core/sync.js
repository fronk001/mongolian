/**
 * Online sync, as pure functions: how the progress is laid out in the online
 * database, what changed between two versions of it, and how versions that
 * went separate ways are combined again. DOM-free, like the rest of core/.
 *
 * Firestore layout, all under users/{uid}/mongolian/:
 *   main      settings, lifetime XP, badges, grammar counts, and `seq`
 *             (sync bookkeeping, see src/sync/engine.js)
 *   items-0   words 0–99: their FSRS memory (`items`) and which of them have
 *             been introduced (`introduced`); items-1 holds 100–199, and so on
 *   2026      that year's history rows, keyed by day
 * A word's FSRS state is sixteen index entries, so a single document could
 * hold only about 2,500 words before Firestore's 40,000-entry limit, which is
 * the B1 goal itself. Hundred-word documents stay far below it, and a grade
 * re-sends one small document instead of the whole record.
 *
 * Changes travel as operations from diff(), "main.xp = 1245", so two devices
 * that studied different words, or on different days, both land. A word's
 * FSRS state always travels whole: s, d, due, last and reps only make sense
 * together.
 */
import { blank } from './progress.js';

const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const clone = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/** Deep equality that ignores key order (Firestore hands maps back sorted). */
export function same(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (!isObj(a) || !isObj(b)) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every(k => k in b && same(a[k], b[k]));
}

/** The value at `path` in a set of documents, or undefined. */
export const get = (docs, path) => path.reduce((o, k) => (isObj(o) ? o[k] : undefined), docs);

// ------------------------------------------------------------------ layout

export const BUCKET = 100;

/** Which document holds a word. */
export function itemsDoc(id) {
  const n = Number(id);
  return `items-${Number.isInteger(n) && n >= 0 ? Math.floor(n / BUCKET) : 0}`;
}

const isItemsDoc = id => /^items-\d+$/.test(id);
const isYearDoc = id => /^\d{4}$/.test(id);
const isDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
/** Word ids are numbers in the app and strings as map keys. */
const idOf = k => (String(Number(k)) === k ? Number(k) : k);
const byId = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : 1);
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const docNumber = id => Number(id.slice(6));

/** The figures in a history row that add up across sessions; the rest are snapshots. */
export const ROW_COUNTERS = ['reviews', 'newWords', 'onTime', 'late', 'xp'];

/** Two rows for one day, folded the way recordDay() folds a second session into the first. */
function fold(a, b) {
  const out = { ...a, ...b };
  for (const k of ROW_COUNTERS) if (k in a || k in b) out[k] = (a[k] || 0) + (b[k] || 0);
  return out;
}

/**
 * History by day. Two rows for one day only exist in data from before
 * recordDay() upserted, and they fold into one. Rows without a proper date
 * are kept aside as they are.
 */
function byDay(history) {
  const rows = new Map();
  const undated = [];
  for (const row of history || []) {
    if (!row || !isDay(row.date)) undated.push(row);
    else rows.set(row.date, rows.has(row.date) ? fold(rows.get(row.date), row) : row);
  }
  return { rows, undated };
}

/** The progress, as the documents it is stored in online. */
export function toDocs(p) {
  const { items = {}, introduced = [], history = [], badges = [], ...rest } = clone(p);
  const main = { ...rest, badges: Object.fromEntries((badges || []).map(b => [String(b), true])) };
  const docs = { main };
  const words = id => (docs[itemsDoc(id)] = docs[itemsDoc(id)] || { items: {}, introduced: {} });
  for (const [id, it] of Object.entries(items || {})) words(id).items[id] = it;
  for (const id of introduced || []) words(id).introduced[String(id)] = true;
  const { rows, undated } = byDay(history);
  for (const [day, row] of rows) {
    const year = (docs[day.slice(0, 4)] = docs[day.slice(0, 4)] || { history: {} });
    year.history[day] = row;
  }
  if (undated.length) main.undated = undated;
  return docs;
}

/** The documents, back as the progress the app works with. `main.seq` stays behind. */
export function fromDocs(docs) {
  const { main = {}, ...rest } = clone(docs) || {};
  const { seq, undated = [], badges = {}, ...fields } = main;
  const p = Object.assign(blank(), fields, {
    items: {}, introduced: [], history: [], badges: Object.keys(badges || {})
  });
  const ids = Object.keys(rest);
  for (const id of ids.filter(isItemsDoc).sort((a, b) => docNumber(a) - docNumber(b))) {
    Object.assign(p.items, rest[id].items || {});
    for (const k of Object.keys(rest[id].introduced || {})) p.introduced.push(idOf(k));
  }
  p.introduced.sort(byId);
  const rows = ids.filter(isYearDoc).flatMap(y => Object.values(rest[y].history || {}));
  p.history = [...undated, ...rows.sort(byDate)];
  return p;
}

// ------------------------------------------------------------------ changes

/** A word's FSRS state: always one value, never split into separate fields. */
const isItem = path => path.length === 3 && isItemsDoc(path[0]) && path[1] === 'items';

/**
 * What changed from `a` to `b` (both laid out as above), as operations
 * `{ path, value, from }` or `{ path, del: true, from }`. `from` is what was
 * there before: rebase() needs it to tell a field nobody else touched from
 * one another device changed meanwhile.
 */
export function diff(a, b, path = [], ops = []) {
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = a ? a[k] : undefined;
    const y = b ? b[k] : undefined;
    const p = [...path, k];
    if (y === undefined) {
      if (x !== undefined) removed(x, p, ops);
    } else if (isObj(y) && !isItem(p)) {
      if (!isObj(x) && !Object.keys(y).length) ops.push({ path: p, value: {}, from: clone(x) });
      else diff(isObj(x) ? x : {}, y, p, ops);
    } else if (!same(x, y)) {
      ops.push({ path: p, value: clone(y), from: clone(x) });
    }
  }
  return ops;
}

// Something gone is one deletion, except a whole document: a field write
// cannot remove a document, so its fields go instead and it stays, empty.
function removed(x, p, ops) {
  if (p.length === 1 && isObj(x)) {
    for (const k of Object.keys(x)) ops.push({ path: [...p, k], del: true, from: clone(x[k]) });
  } else {
    ops.push({ path: p, del: true, from: clone(x) });
  }
}

/**
 * Operations as one merge-write per document. `DEL` is whatever the database
 * uses to mean "remove this field" (Firestore's deleteField()).
 */
export function patchesFor(ops, DEL) {
  const docs = {};
  for (const op of ops) {
    const [id, ...rest] = op.path;
    if (!rest.length) continue;
    let o = (docs[id] = docs[id] || {});
    for (const k of rest.slice(0, -1)) {
      if (!isObj(o[k])) o[k] = {};
      o = o[k];
    }
    o[rest[rest.length - 1]] = op.del ? DEL : clone(op.value);
  }
  return Object.entries(docs).map(([id, data]) => ({ id, data, merge: true }));
}

/** Documents with operations applied on top, in order: what the database holds once they land. */
export function overlay(docs, ops) {
  const out = clone(docs) || {};
  for (const op of ops) {
    let o = out;
    for (const k of op.path.slice(0, -1)) {
      if (!isObj(o[k])) o[k] = {};
      o = o[k];
    }
    const last = op.path[op.path.length - 1];
    if (op.del) delete o[last];
    else o[last] = clone(op.value);
  }
  return out;
}

/**
 * Firestore's merge-write, for the tests and the pretend server: a non-empty
 * map merges key by key, anything else (values, arrays, {}) replaces.
 */
export function applyMerge(target, patch, DEL) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === DEL) delete target[k];
    else if (isObj(v) && Object.keys(v).length) {
      if (!isObj(target[k])) target[k] = {};
      applyMerge(target[k], v, DEL);
    } else target[k] = clone(v);
  }
  return target;
}

// ------------------------------------------------------------ combining

const laterDay = (x, y) => ((x || '') > (y || '') ? x : y);
const earlierDay = (x, y) => (!x ? y : !y ? x : x < y ? x : y);

/**
 * The more recent of two FSRS states for one word: the later review, then
 * the one with more reviews behind it. A tie keeps the second.
 */
export function laterItem(x, y) {
  if (!x) return y;
  if (!y) return x;
  if ((x.last || '') !== (y.last || '')) return (x.last || '') > (y.last || '') ? x : y;
  return (x.reps || 0) > (y.reps || 0) ? x : y;
}

// Of two history rows for one day, the fuller one; of two grammar counts
// for one topic, the one with more attempts. Whole rows, never a figure
// from each: a row is one day's real record, and mixing two would describe
// a day that never happened.
const fullerRow = (x, y) =>
  (x.reviews || 0) !== (y.reviews || 0) ? ((x.reviews || 0) > (y.reviews || 0) ? x : y)
    : (x.xp || 0) > (y.xp || 0) ? x : y;
const attempts = g => (g.right || 0) + (g.wrong || 0);
const moreAttempts = (x, y) =>
  attempts(x) !== attempts(y) ? (attempts(x) > attempts(y) ? x : y)
    : (x.last || '') > (y.last || '') ? x : y;

/**
 * Two versions of the progress with no common past to compare against, for
 * the first time a device signs in: its own copy, kept before it ever
 * synced, and the online one. Nothing studied on either is dropped.
 *
 *   words        the most recent review of each word
 *   history      every day from both; a day on both keeps the fuller row
 *   xp           the higher of the two. Without a common starting point the
 *                sum would count the part they share twice.
 *   badges, introduced words   everything from either
 *   grammar      per topic, the count with more attempts
 *   settings     from the copy studied most recently
 */
export function mergeStates(a, b) {
  a = clone(a) || {};
  b = clone(b) || {};
  const primary = (a.lastDate || '') > (b.lastDate || '') ? a : b;
  const other = primary === a ? b : a;
  const out = Object.assign(blank(), other, primary);

  out.items = { ...(b.items || {}) };
  for (const [id, it] of Object.entries(a.items || {})) out.items[id] = laterItem(it, out.items[id]);

  const ids = new Map();
  for (const id of [...(b.introduced || []), ...(a.introduced || [])]) ids.set(String(id), id);
  out.introduced = [...ids.values()].sort(byId);
  out.badges = [...new Set([...(b.badges || []), ...(a.badges || [])])];

  const A = byDay(a.history);
  const B = byDay(b.history);
  const rows = new Map(B.rows);
  for (const [day, row] of A.rows) rows.set(day, rows.has(day) ? fullerRow(row, rows.get(day)) : row);
  const undated = [...B.undated];
  for (const row of A.undated) if (!undated.some(u => same(u, row))) undated.push(row);
  out.history = [...undated, ...[...rows.values()].sort(byDate)];

  out.grammar = { ...(b.grammar || {}) };
  for (const [t, g] of Object.entries(a.grammar || {})) out.grammar[t] = out.grammar[t] ? moreAttempts(g, out.grammar[t]) : g;

  out.xp = Math.max(a.xp || 0, b.xp || 0);
  out.createdAt = earlierDay(a.createdAt, b.createdAt) || out.createdAt;
  out.lastDate = laterDay(a.lastDate, b.lastDate) || null;
  out.lastExport = laterDay(a.lastExport, b.lastExport) || null;
  out.purpose = primary.purpose || other.purpose || '';
  return out;
}

// Figures that only ever grow by what was done: lifetime XP, a day's
// counters, a grammar topic's right and wrong.
const isCounter = p =>
  (p.length === 2 && p[0] === 'main' && p[1] === 'xp') ||
  (p.length === 4 && isYearDoc(p[0]) && p[1] === 'history' && ROW_COUNTERS.includes(p[3])) ||
  (p.length === 4 && p[0] === 'main' && p[1] === 'grammar' && (p[3] === 'right' || p[3] === 'wrong'));
const isLatest = p =>
  (p.length === 2 && p[0] === 'main' && (p[1] === 'lastDate' || p[1] === 'lastExport')) ||
  (p.length === 4 && p[0] === 'main' && p[1] === 'grammar' && p[3] === 'last');
const isEarliest = p => p.length === 2 && p[0] === 'main' && p[1] === 'createdAt';

/**
 * Changes this device made, re-applied on top of what the database holds
 * now. A field still at `from` was not touched by anyone else, and the change
 * goes through as it is: always the case while online. For a change made
 * offline, another device may have studied meanwhile, and then:
 *
 *   counters     this device's increase is added to the database's figure,
 *                so a lesson on each device both count
 *   a word       the more recent review wins
 *   last studied, last export   the later date; the first day, the earlier
 *   anything else (settings, badges)   this change, the most recent one
 *
 * Deletions go through as they are: only an import makes them.
 */
export function rebase(ops, docs) {
  const out = [];
  for (const op of ops) {
    const cur = get(docs, op.path);
    const p = op.path;
    if (op.del || same(cur, op.from)) out.push(op);
    else if (isCounter(p) && typeof op.value === 'number') {
      const gained = op.value - (typeof op.from === 'number' ? op.from : 0);
      out.push({ path: p, value: (typeof cur === 'number' ? cur : 0) + gained, from: clone(cur) });
    } else if (isItem(p)) {
      if (laterItem(cur, op.value) === op.value) out.push({ ...op, from: clone(cur) });
    } else if (isLatest(p)) {
      if ((op.value || '') >= (cur || '')) out.push({ ...op, from: clone(cur) });
    } else if (isEarliest(p)) {
      if (!cur || (op.value && op.value < cur)) out.push({ ...op, from: clone(cur) });
    } else {
      out.push({ ...op, from: clone(cur) });
    }
  }
  return out;
}
