/**
 * Grammar topic drills: grading and mastery tracking. DOM-free, like the rest
 * of core/.
 *
 * A topic (src/data/grammar.json) is explanation + examples + a short mixed
 * set of drills. Three drill kinds:
 *
 *   choice     pick one of `options`; the right one is `answer`
 *   transform  type the transformed sentence; graded like a sentence
 *              (near-miss tolerance via grade.js), accepting `to` or `alt`
 *   build      tap words into the right order; `words` is that order
 *
 * Unlike word/sentence review, grammar practice is on demand, not scheduled —
 * there is no FSRS stability here, just how many attempts on a topic have
 * been right vs wrong. `topicMastery()` withholds a percentage until there
 * have been enough attempts to mean something, matching INSTRUMENT's
 * "not measured yet" convention rather than showing an early 100% or 0%.
 */
import { gradeAnswer, diffTokens } from './grade.js';
import { dayKey } from './fsrs.js';

export const MASTERY_MIN_ATTEMPTS = 4;

/** Grade one drill response. Shape of the result mirrors gradeAnswer(). */
export function gradeDrill(drill, response, strictness = 0.2) {
  if (drill.kind === 'choice') {
    const ok = response === drill.answer;
    return { ok, matched: drill.answer };
  }
  if (drill.kind === 'transform') {
    const accepted = [drill.to, ...(drill.alt || [])];
    const g = gradeAnswer(response, accepted, strictness);
    return { ...g, diff: diffTokens(response, g.matched || drill.to) };
  }
  if (drill.kind === 'build') {
    const ok = JSON.stringify(response) === JSON.stringify(drill.words);
    return { ok, matched: drill.words.join(' ') };
  }
  return { ok: false, matched: '' };
}

/** Record one graded attempt against a topic's running right/wrong count. */
export function applyGrammarGrade(p, topicId, ok, today = dayKey()) {
  const prev = p.grammar[topicId] || { right: 0, wrong: 0 };
  const next = {
    right: prev.right + (ok ? 1 : 0),
    wrong: prev.wrong + (ok ? 0 : 1),
    last: today
  };
  p.grammar[topicId] = next;
  return next;
}

/** Share correct, or null before there is enough of a sample to show one. */
export function topicMastery(stat) {
  if (!stat) return null;
  const total = stat.right + stat.wrong;
  if (total < MASTERY_MIN_ATTEMPTS) return null;
  return stat.right / total;
}
