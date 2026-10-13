/**
 * Baby paragraphs: short passages about Fred's home, read at the end of a
 * lesson, with a few questions after the text. Design: docs/design/C-reading.md;
 * plan: docs/PLAN.md §3. Data: src/data/readings.json (tagged by
 * tools/readings.py).
 *
 * A passage is offered only when he can read it: its expected coverage — the
 * mean recall probability of its words, by the scheduler's own figures, with
 * words never studied counting as 0 — is at least 95% (Hu & Nation; Schmitt
 * 2011), and at most 3 of its words are new to him. Grammar words (drill:false)
 * count as known. Reading never touches FSRS: a comprehension question is weak
 * evidence that any one word was recalled.
 *
 * DOM-free.
 */
import { makeFSRS, dayKey, daysBetween } from './fsrs.js';

export const READ_COVERAGE = 0.95;
export const READ_MAX_UNKNOWN = 3;

/** How much of `reading` he can be expected to follow today, and which words are new. */
export function readingCoverage(reading, p, words, today = dayKey()) {
  const fsrs = makeFSRS(undefined, p.desiredRetention);
  const byId = Object.fromEntries(words.map(w => [w.id, w]));
  let sum = 0, n = 0;
  const unknown = new Set();
  for (const line of reading.lines) {
    for (const [, id] of line.words || []) {
      n++;
      const w = id == null ? null : byId[id];
      if (w && w.drill === false) { sum += 1; continue; }
      const it = id == null ? null : p.items[id];
      if (!it) { unknown.add(id == null ? '?' : id); continue; }
      sum += fsrs.retrievability(Math.max(0, daysBetween(it.last || today, today)), it.s);
    }
  }
  return { coverage: n ? sum / n : 0, unknown: [...unknown] };
}

/**
 * The passage for today's lesson, or null: the first one not yet read that
 * he can read. `dev` (?dev) shows passages awaiting review and skips the
 * coverage gate, so the pilot can be previewed before Luna or Sarnai sign off.
 */
export function pickReading(p, readings, words, { today = dayKey(), dev = false } = {}) {
  for (const r of readings || []) {
    if (r.reviewed === false && !dev) continue;
    if ((p.readings || {})[r.id]) continue;
    if (dev) return r;
    const { coverage, unknown } = readingCoverage(r, p, words, today);
    if (coverage >= READ_COVERAGE && unknown.length <= READ_MAX_UNKNOWN) return r;
  }
  return null;
}

/**
 * The record after a read: reads add up; the first read's score is kept once.
 * `taps` counts glosses asked for on words the scheduler believed known —
 * evidence for tuning READ_COVERAGE, never a penalty.
 */
export function recordReading(p, id, right, wrong, today = dayKey(), taps = 0) {
  const prev = (p.readings || {})[id];
  p.readings = { ...(p.readings || {}), [id]: prev
    ? { ...prev, reads: (prev.reads || 0) + 1, last: today, taps: (prev.taps || 0) + taps }
    : { reads: 1, last: today, firstDay: today, firstRight: right, firstWrong: wrong, taps } };
  return !prev;   // true when this was the first read, the one that scores
}

/**
 * The Read tab's shelf: every passage, with its state — read (with its first
 * score), ready, or locked with the words it still needs. Unreviewed passages
 * are only counted unless `dev`.
 */
export function readingShelf(p, readings, words, { today = dayKey(), dev = false } = {}) {
  const byId = Object.fromEntries(words.map(w => [w.id, w]));
  const list = [];
  let waiting = 0;
  for (const r of readings || []) {
    if (r.reviewed === false && !dev) { waiting++; continue; }
    const rec = (p.readings || {})[r.id];
    if (rec) { list.push({ r, state: 'read', rec }); continue; }
    const { coverage, unknown } = readingCoverage(r, p, words, today);
    const ok = dev || (coverage >= READ_COVERAGE && unknown.length <= READ_MAX_UNKNOWN);
    list.push({ r, state: ok ? 'ready' : 'locked', coverage,
      need: unknown.map(id => byId[id]?.mn).filter(Boolean) });
  }
  return { list, waiting };
}
