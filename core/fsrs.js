/**
 * FSRS-6 scheduler.
 *
 * Each item carries { s, d, due, last, reps, lapses } where
 *   s    stability, in days: the interval at which recall probability is 90%
 *   d    difficulty 1..10
 *   due  ISO date string
 *
 * Grades are 1..4 = again / hard / good / easy.
 * Published default weights; not yet optimised against Fred's own review log
 * (needs a few hundred reviews first — see ROADMAP.md item 1b).
 *
 * Known deviation: w[19] is unused. It belongs to the FSRS-6 same-day
 * (elapsed < 1 day) stability term; shortTermStability() below implements the
 * simpler FSRS-5 form. This only affects a word graded twice within one day.
 * Left alone deliberately — there are no reference vectors to validate a
 * change against here. See ROADMAP.md item 1b.
 */

export const DEFAULT_W = [
  0.2172, 1.1771, 3.2602, 16.1507, 7.0114, 0.57, 2.0966, 0.0069, 1.5261,
  0.112, 1.0178, 1.849, 0.1133, 0.3127, 2.2934, 0.2191, 3.0004, 0.7536,
  0.3332, 0.1437, 0.2
];

const MIN_S = 0.01;
const MAX_S = 36500;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function makeFSRS(w = DEFAULT_W, desiredRetention = 0.9) {
  const decay = -w[20];
  const factor = Math.pow(0.9, 1 / decay) - 1;

  /** Probability of recall after `t` days at stability `s`. */
  const retrievability = (t, s) =>
    s <= 0 ? 0 : Math.pow(1 + factor * (t / s), decay);

  /** Days until recall probability falls to `r`. */
  const interval = (s, r = desiredRetention) =>
    (s / factor) * (Math.pow(r, 1 / decay) - 1);

  const initStability = g => clamp(w[g - 1], MIN_S, MAX_S);
  const initDifficulty = g => clamp(w[4] - Math.exp(w[5] * (g - 1)) + 1, 1, 10);

  function nextDifficulty(d, g) {
    const delta = -w[6] * (g - 3);
    const damped = d + delta * ((10 - d) / 9);
    return clamp(w[7] * initDifficulty(4) + (1 - w[7]) * damped, 1, 10);
  }

  function recallStability(d, s, r, g) {
    const hard = g === 2 ? w[15] : 1;
    const easy = g === 4 ? w[16] : 1;
    const inc =
      Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) *
      (Math.exp((1 - r) * w[10]) - 1) * hard * easy;
    return clamp(s * (1 + inc), MIN_S, MAX_S);
  }

  function forgetStability(d, s, r) {
    const next =
      w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) *
      Math.exp((1 - r) * w[14]);
    return clamp(Math.min(next, s), MIN_S, MAX_S);
  }

  /** Same-day repeat: small nudge rather than a full interval recalculation. */
  function shortTermStability(s, g) {
    return clamp(s * Math.exp(w[17] * (g - 3 + w[18])), MIN_S, MAX_S);
  }

  /**
   * Apply a grade. `elapsedDays` is time since last review.
   * Returns the updated memory state plus the scheduled interval in days.
   */
  function review(state, g, elapsedDays) {
    if (!state || state.reps === 0 || state.s == null) {
      const s = initStability(g);
      const d = initDifficulty(g);
      return { s, d, reps: 1, lapses: g === 1 ? 1 : 0, ivl: interval(s) };
    }
    const r = retrievability(Math.max(0, elapsedDays), state.s);
    const d = nextDifficulty(state.d, g);
    let s;
    if (elapsedDays < 1) s = shortTermStability(state.s, g);
    else if (g === 1) s = forgetStability(state.d, state.s, r);
    else s = recallStability(state.d, state.s, r, g);
    return {
      s, d,
      reps: (state.reps || 0) + 1,
      lapses: (state.lapses || 0) + (g === 1 ? 1 : 0),
      ivl: interval(s)
    };
  }

  /** Interval each grade would produce — shown under the grade buttons. */
  function preview(state, elapsedDays) {
    return [1, 2, 3, 4].map(g => review(state, g, elapsedDays).ivl);
  }

  return { retrievability, interval, review, preview, decay, factor, desiredRetention };
}

/** "1m" / "6m" / "3d" / "2.1mo" — the label under each grade button. */
export function fmtInterval(days) {
  if (days < 1 / 48) return '1m';
  if (days < 1) {
    const mins = Math.round(days * 24 * 60);
    return mins < 60 ? mins + 'm' : Math.round(days * 24) + 'h';
  }
  if (days < 30) return Math.round(days) + 'd';
  if (days < 365) return (days / 30).toFixed(1) + 'mo';
  return (days / 365).toFixed(1) + 'y';
}

export const DAY = 86400000;

/**
 * The calendar day where the user is, as YYYY-MM-DD.
 *
 * Deliberately local, not UTC. toISOString() would roll the day over at 01:00
 * or 02:00 local in the Netherlands, so an evening session after midnight was
 * filed under the previous day and its reviews came due a few hours later.
 *
 * Keys are calendar labels; daysBetween/addDays parse them back at a fixed
 * offset so the arithmetic stays exact whole days across DST.
 */
export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const daysBetween = (a, b) =>
  (new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / DAY;
