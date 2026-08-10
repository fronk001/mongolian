/**
 * Multiple-choice option building.
 *
 * Ported from `distractors()` in the original single-file prototype, with the
 * three corrections that mattered once real content was behind it:
 *
 *   1. **No two options may read the same.** The lexicon has entries that
 *      gloss identically in English; showing both makes a question with two
 *      right answers, which grades as a failure the learner did not commit.
 *      Options are deduplicated on their displayed face.
 *   2. **Distractors are drawn from words already met, when there are enough.**
 *      An option you have never seen is eliminated by unfamiliarity rather
 *      than by meaning, which turns a recall test into a recognition test.
 *   3. **The shuffle is seeded, not random.** The view re-renders on every
 *      state change; with Math.random the options jumped position between the
 *      answer and the feedback frame.
 *
 * DOM-free, like the rest of core/.
 */

/** Which field the options display, given the prompt direction. */
export const faceFor = dir => (dir === 'mge' ? 'en' : 'mn');

/** Deterministic PRNG (mulberry32). Same seed, same options, every render. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Comparison key: casing and surrounding punctuation must not create a "difference". */
export const faceKey = s => String(s || '').toLowerCase().replace(/[.,!?;:"'`’]/g, '').trim();

/**
 * Candidate wrong answers for `target`.
 *
 * Ordering prefers words that look like the target — same opening letter,
 * similar length, same register — because a distractor that is obviously the
 * wrong shape is not a distractor. The jitter keeps the same four words from
 * appearing together every time a word comes up.
 */
export function distractors(target, pool, n, r, opts = {}) {
  const face = opts.face || 'en';
  const targetFace = faceKey(target[face]);
  const targetDrill = target.drill !== false;

  const seen = new Set([targetFace]);
  const candidates = pool.filter(w => {
    if (!w || w.id === target.id) return false;
    const key = faceKey(w[face]);
    if (!key || seen.has(key)) return false;   // never two options that read alike
    seen.add(key);
    return true;
  });

  const score = w => {
    const a = String(w[face] || ''), b = String(target[face] || '');
    let s = 0;
    if (a[0] && b[0] && a[0].toLowerCase() === b[0].toLowerCase()) s -= 2;
    s += Math.abs(a.length - b.length) * 0.2;
    if ((w.drill !== false) !== targetDrill) s += 1.5;  // keep the register consistent
    return s;
  };

  const ranked = candidates
    .map(w => ({ w, s: score(w) + (r() - 0.5) * 0.6 }))
    .sort((a, b) => a.s - b.s)
    .map(x => x.w);

  // Widen past the top n before shuffling, or the same words recur forever.
  return shuffle(ranked.slice(0, Math.max(n * 2, 6)), r).slice(0, n);
}

/**
 * Full option set for a word card.
 *
 * `introduced` narrows the distractor pool to words already met; it is only
 * honoured when it leaves enough candidates to fill the question, otherwise
 * an early session would have nothing to draw from.
 *
 * Returns `usable: false` when the pool cannot produce at least two distinct
 * options — the caller must fall back to a typed answer rather than show a
 * question with one choice.
 */
export function buildChoices(target, pool, opts = {}) {
  const { dir = 'mge', count = 4, introduced = null, seed } = opts;
  const face = faceFor(dir);
  const r = makeRng(hashSeed(String(seed ?? `${target.id}:${dir}`)));

  let source = pool;
  if (introduced && introduced.size) {
    const met = pool.filter(w => introduced.has(w.id) || introduced.has(String(w.id)));
    if (met.length >= count + 2) source = met;
  }

  const wrong = distractors(target, source, count - 1, r, { face });
  if (wrong.length < 1) return { usable: false, options: [], answerIndex: -1 };

  const options = shuffle(
    [{ id: target.id, text: target[face], correct: true },
     ...wrong.map(w => ({ id: w.id, text: w[face], correct: false }))],
    r
  );
  return {
    usable: options.length >= 2,
    options,
    answerIndex: options.findIndex(o => o.correct)
  };
}
