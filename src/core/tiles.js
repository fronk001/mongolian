/**
 * Building blocks: a sentence answered by tapping word tiles into order.
 * Design: docs/design/A-learn-loop.md §3.6; plan: docs/PLAN.md §1.
 *
 * A bank is the answer's own words plus decoys. Decoys are drawn only from
 * Mongolian (or English) already in sentences.json — never generated
 * inflections — and other forms of the sentence's own words come first
 * (хаалга / хаалгыг / хаалгаа), so choosing the right ending is part of the
 * task rather than something solved by elimination.
 *
 * Two invariants, enforced here and in tools/test.html:
 *   - no decoy appears in ANY accepted form of the sentence, so a decoy can
 *     never complete another listed answer;
 *   - an order is right only if it is listed ([canonical, ...alt]); the app
 *     never permutes Mongolian word order (CLAUDE.md, MM p18 [PDF 30]).
 *
 * DOM-free.
 */
import { norm, lev, gradeAnswer } from './grade.js';
import { makeRng, hashSeed, shuffle } from './choices.js';

/** Decoys per rung: blocks on a first attempt, fewer on a retry, none to study. */
export const DECOYS = { blocks: 3, easy: 1, study: 0 };

const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'to', 'of', 'in',
  'on', 'at', 'it', 'this', 'that', 'my', 'your', 'his', 'her', 'our', 'their', 'and', 'please', 'i']);
const VOWEL_END = /[аэиоөуүы]$/;

/** Every phrasing that counts, canonical first. */
export const acceptedFor = (s, toMn) =>
  toMn ? [s.mn, ...(s.alt?.mn || [])] : [s.en, ...(s.alt?.en || [])];

/** A sentence's words as tiles: lowercase (no capital gives the first word away), except "I". */
export const tokensOf = text => norm(text).split(' ').filter(Boolean).map(t => (t === 'i' ? 'I' : t));

/** Fewest tiles any accepted form needs: Check lights from there. */
export const minTiles = (s, toMn) =>
  Math.min(...acceptedFor(s, toMn).map(f => norm(f).split(' ').filter(Boolean).length));

/**
 * Index the corpus once. Returns poolFor(sentence, toMn): candidate decoys,
 * best first, with every token of every accepted form already excluded.
 */
export function makeTilePools(words, sentences) {
  const mnFreq = new Map(), enFreq = new Map();
  const bump = (m, t) => m.set(t, (m.get(t) || 0) + 1);
  for (const s of sentences) {
    for (const f of [s.mn, ...(s.alt?.mn || [])]) norm(f).split(' ').filter(Boolean).forEach(t => bump(mnFreq, t));
    norm(s.en).split(' ').filter(Boolean).forEach(t => bump(enFreq, t));
  }
  // A headword's stem: a verb without its -х, a noun without a final short
  // vowel (хаалга -> хаалг-), so its other forms in the corpus can be found.
  const stems = words.map(w => w.mn.toLowerCase()).filter(m => !m.includes(' '))
    .map(m => (m.endsWith('х') ? m.slice(0, -1) : VOWEL_END.test(m) ? m.slice(0, -1) : m))
    .filter(st => st.length >= 3);
  const stemOf = tok => stems.filter(st => tok.startsWith(st)).sort((a, b) => b.length - a.length)[0] || null;
  const byId = Object.fromEntries(words.map(w => [w.id, w]));
  const byFreq = m => [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(e => e[0]);
  const mnOrder = byFreq(mnFreq), enOrder = byFreq(enFreq);

  return function poolFor(s, toMn) {
    const accepted = new Set(acceptedFor(s, toMn).flatMap(f => norm(f).split(' ')));
    if (toMn) {
      const answer = norm(s.mn).split(' ').filter(Boolean);
      const answerStems = answer.map(stemOf).filter(Boolean);
      const sib = [], look = [], rest = [];
      for (const t of mnOrder) {
        if (accepted.has(t)) continue;
        const shared = Math.max(0, ...answerStems.filter(st => t.startsWith(st)).map(st => st.length));
        if (shared) sib.push([t, shared]);
        else if (answer.some(a => a[0] === t[0] && Math.abs(a.length - t.length) <= 2)) look.push(t);
        else rest.push(t);
      }
      // Longest shared stem first: хаалгаа (хаалг-) before хаана (хаа-).
      const siblings = sib.sort((a, b) => b[1] - a[1]).map(x => x[0]);
      return { siblings, others: [...look, ...rest] };
    }
    // English: the meanings of this sentence's own words are never decoys,
    // so "yard" cannot sit in the bank when хашаа means yard/fence.
    const gloss = new Set((s.ids || []).flatMap(id => (byId[id]?.en || '').toLowerCase().split(/[^a-z']+/)));
    const others = enOrder.filter(t => !accepted.has(t) && !STOP.has(t) && !gloss.has(t));
    return { siblings: [], others };
  };
}

/**
 * The bank for one attempt: [{ t, ans }], shuffled on `seed`, so a retry
 * (different seed and rung) never shows the same arrangement twice.
 */
export function bankFor(s, toMn, rung, pool, seed) {
  const rng = makeRng(hashSeed(String(seed)));
  const answer = tokensOf(toMn ? s.mn : s.en).map(t => ({ t, ans: true }));
  const n = DECOYS[rung] ?? 0;
  const decoys = [];
  if (n) {
    const { siblings, others } = pool;
    decoys.push(...siblings.slice(0, n));
    const fill = shuffle(others.slice(0, 12), rng);
    for (const t of fill) { if (decoys.length >= n) break; if (!decoys.includes(t)) decoys.push(t); }
  }
  return shuffle([...answer, ...decoys.map(t => ({ t, ans: false }))], rng);
}

/** Grade a build: exact against the listed forms only (strictness 1: tiles cannot slip). */
export function gradeBuild(placed, accepted) {
  return gradeAnswer(placed.join(' '), accepted, 1);
}

/**
 * Order-aware diff against the expected form: hit (right word, right place),
 * moved (right word, wrong place), near (one letter off), miss. A swapped
 * order used to show all green, because the old diff ignored position.
 */
export function orderDiff(given, correct) {
  const g = norm(given).split(' ').filter(Boolean);
  const c = norm(correct).split(' ').filter(Boolean);
  // Longest common subsequence: the words that are in place relative to each other.
  const L = Array.from({ length: c.length + 1 }, () => new Array(g.length + 1).fill(0));
  for (let i = c.length - 1; i >= 0; i--)
    for (let j = g.length - 1; j >= 0; j--)
      L[i][j] = c[i] === g[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const state = new Array(c.length).fill(null), used = new Array(g.length).fill(false);
  for (let i = 0, j = 0; i < c.length && j < g.length;) {
    if (c[i] === g[j]) { state[i] = 'hit'; used[j] = true; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return c.map((tok, i) => {
    if (state[i]) return { tok, state: state[i] };
    const k = g.findIndex((x, j) => !used[j] && x === tok);
    if (k >= 0) { used[k] = true; return { tok, state: 'moved' }; }
    const n = g.findIndex((x, j) => !used[j] && tok.length >= 3 && lev(x, tok) <= 1);
    if (n >= 0) { used[n] = true; return { tok, state: 'near' }; }
    return { tok, state: 'miss' };
  });
}
