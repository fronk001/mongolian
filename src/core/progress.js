/**
 * Progress state, persistence and migration.
 *
 * v2 schema (FSRS):
 *   items: { [wordId]: { s, d, due, last, reps, lapses, right, wrong } }
 *
 * v1 schema (Leitner boxes) is migrated on load; old backup codes stay importable.
 */
import { makeFSRS, dayKey, daysBetween } from './fsrs.js';

export const STORE_KEY = 'mng_study_v2';
export const LEGACY_KEY = 'mng_study_v1';
const SCHEMA = 2;

export function blank() {
  return {
    schema: SCHEMA,
    items: {},
    introduced: [],
    dailyNewCap: 6,
    desiredRetention: 0.9,
    strictness: 0.2,
    sentSkill: 0.5,
    history: [],
    createdAt: dayKey(),
    lastDate: null
  };
}

/** Box level -> seed stability, in days. Deliberately conservative. */
const BOX_STABILITY = [0.5, 1, 3, 8, 21, 60];

/**
 * Rebuild FSRS memory state from v1 box data.
 * v1 stored no real review dates, so rather than inventing a review history we
 * re-anchor: weak items (box <= 2) come due immediately, stronger items are
 * spread forward proportional to their seeded stability. Accuracy maps to
 * difficulty, which is the part of the old data that carries real signal.
 */
export function migrateV1(old) {
  const p = blank();
  p.strictness = old.strictness ?? 0.2;
  p.sentSkill = old.sentSkill ?? 0.5;
  p.history = old.history || [];
  p.introduced = (old.learned || []).slice();
  p.dailyNewCap = Math.max(3, (old.newPerDay || 3) * 2);
  p.migratedFrom = 'v1';

  const today = dayKey();
  for (const id of p.introduced) {
    const st = (old.words || {})[id] || {};
    const box = Math.max(0, Math.min(5, st.box || 0));
    const right = st.right || 0, wrong = st.wrong || 0;
    const acc = right + wrong > 0 ? right / (right + wrong) : 0.5;
    const s = BOX_STABILITY[box];
    const offset = box <= 2 ? 0 : Math.round(s * 0.35);
    p.items[id] = {
      s,
      d: Math.min(10, Math.max(1, 1 + 9 * (1 - acc))),
      due: addDays(today, offset),
      last: today,
      reps: right + wrong,
      lapses: wrong,
      right, wrong
    };
  }
  return p;
}

export function addDays(key, n) {
  const t = new Date(key + 'T00:00:00Z').getTime() + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

export function normalise(raw) {
  if (!raw || typeof raw !== 'object') return blank();
  if (raw.schema === SCHEMA) return Object.assign(blank(), raw);
  if (raw.words || raw.learned) return migrateV1(raw);
  return blank();
}

export function load(storage = globalThis.localStorage) {
  try {
    const cur = storage.getItem(STORE_KEY);
    if (cur) return normalise(JSON.parse(cur));
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) return migrateV1(JSON.parse(legacy));
  } catch (e) { /* fall through to blank */ }
  return blank();
}

export function save(p, storage = globalThis.localStorage) {
  try { storage.setItem(STORE_KEY, JSON.stringify(p)); } catch (e) {}
}

/**
 * Backup codes are UTF-8 JSON in base64.
 *
 * The v1 app used btoa(unescape(encodeURIComponent(...))), which produces the
 * same bytes as a TextEncoder round-trip — so old codes still decode here — but
 * escape/unescape are deprecated and absent in some environments. This avoids them.
 */
const toB64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const fromB64 = b64 => {
  const bin = atob(String(b64).trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export const encodeCode = p => {
  try { return toB64(JSON.stringify(p)); } catch (e) { return ''; }
};
export const decodeCode = s => {
  try { return JSON.parse(fromB64(s)); } catch (e) { return null; }
};

/** Accepts both v1 and v2 codes. */
export function importCode(str) {
  const raw = decodeCode(str);
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.items && !raw.words) return null;
  return normalise(raw);
}

/**
 * Telemetry for the home screen.
 *
 * Pass `words` so items whose word has left words.json are excluded — the
 * session builder drops them too, and the two readouts sit on the same screen.
 */
export function stats(p, opts = {}) {
  const fsrs = opts.fsrs || makeFSRS(undefined, p.desiredRetention);
  const valid = opts.words ? new Set(opts.words.map(w => String(w.id))) : null;
  const today = dayKey();
  let due = 0, known = 0, rSum = 0, n = 0, right = 0, wrong = 0;
  for (const id in p.items) {
    if (valid && !valid.has(id)) continue;
    const it = p.items[id];
    n++;
    right += it.right || 0; wrong += it.wrong || 0;
    const elapsed = daysBetween(it.last || today, today);
    const r = fsrs.retrievability(Math.max(0, elapsed), it.s);
    rSum += r;
    if (it.due <= today) due++;
    if (it.s >= 21) known++;
  }
  return {
    tracked: n,
    due,
    known,
    avgRetrievability: n ? rSum / n : 0,
    accuracy: right + wrong ? right / (right + wrong) : 0
  };
}
