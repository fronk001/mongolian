/**
 * The in-lesson mistake loop: a miss comes back until it is answered right.
 * Design: docs/design/A-learn-loop.md; plan: docs/PLAN.md §1.
 *
 *   first attempt ─miss→ fix   (a few screens later, one step easier)
 *   fix          ─right→ again (at the end of the lesson, at its own step)
 *                ─miss→  study (at the end: the answer shown, nothing asked)
 *   again        ─right→ fixed
 *                ─miss→  study
 *   study        ──────→ shown (it comes back tomorrow, as FSRS already set)
 *
 * Only the first attempt is graded. Retries never reach applyGrade, XP or the
 * review counts: a second same-day grade would multiply stability by about
 * 1.29 (Good) or 0.29 (Again) and count one memory twice. The loop is capped —
 * at most fix, again, study — and study cannot be failed, so every lesson ends.
 *
 * Re-asking straight after the answer was shown tests copying, not recall, so
 * the fix waits RETRY_GAP items and changes the surface (fresh options).
 */
export const RETRY_GAP = 3;

/** What follows an answer to `item` that was right (`ok`) or not. */
export function afterAnswer(item, ok) {
  switch (item.retry || null) {
    case null:    return ok ? {} : { queue: 'fix' };
    case 'fix':   return ok ? { queue: 'again' } : { queue: 'study' };
    case 'again': return ok ? { outcome: 'fixed' } : { queue: 'study' };
    case 'study': return { outcome: 'shown' };
    default:      return {};
  }
}

/** Where a retry of `stage` goes, given the lesson's items and the current index. */
export function retryIndex(items, i, stage) {
  return stage === 'fix' ? Math.min(i + RETRY_GAP, items.length) : items.length;
}

/** The retry copy of an item. `first` is the original first attempt. */
export function retryItem(item, stage, extra = {}) {
  const first = item.first || item;
  return { ...first, first, retry: stage, ...extra };
}
