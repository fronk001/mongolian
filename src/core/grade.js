/**
 * Answer grading.
 *
 * Two jobs, and they are separate on purpose:
 *
 *   1. **Accept every correct answer.** Mongolian and English rarely map one
 *      to one. «Хашаа минь жижиг» is "my yard is small" *and* "my fence is
 *      small"; «Шал цэвэр байна» and «Шал цэвэр» are both grammatical (the
 *      copula is droppable). Once the app is live there is nobody to appeal
 *      to, so the accepted set has to be written down in advance —
 *      `sentences.json` carries `alt.en` / `alt.mn`, and a word's English may
 *      list variants with a slash.
 *
 *   2. **Distinguish a wrong answer from a misspelt right one.** Typing
 *      «хаалагыг» for «хаалгыг» is not a forgotten word, it is a slip. It
 *      grades as correct, says so, and shows the correct spelling — but it is
 *      reported as a typo so the interface can suggest «Хэцүү» rather than
 *      «Сайн». A slip that is silently accepted teaches the slip.
 *
 * Lenient on spelling early, strict as accuracy rises (`p.strictness`).
 */

export const norm = s =>
  (s || '').toLowerCase().replace(/[.,!?;:"'`’]/g, '').replace(/\s+/g, ' ').trim();

export function lev(a, b) {
  const m = a.length, n = b.length, d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1,
                         d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[m][n];
}

/**
 * The surface forms one target field accepts.
 *
 * A slash separates genuine variants of a single word — `words.json` has 38 of
 * them (`хашаа` → "yard/fence"), and both halves must be accepted. Splitting
 * on commas as well, which an earlier version did, was a latent bug: it would
 * have torn "No, thank you" into two fragments and accepted either half. Only
 * the slash means "or" here.
 */
export function acceptedForms(target) {
  return String(target ?? '').split('/').map(s => s.trim()).filter(Boolean);
}

/**
 * Is this a misspelling of `correct`, or a different answer?
 *
 * Measured per word, not across the whole string. A flat edit-distance
 * budget over a sentence is far too loose: "The floor is dry" is two edits
 * from "The floor is dirty" and would have been accepted as a typo, when it
 * is simply the wrong answer. Likewise "This stair is small" for "This tail
 * is small". Both were caught by the cross-sentence collision test.
 *
 * A spelling slip looks like exactly one word being slightly wrong:
 *
 *   - the same number of words (a missing or extra word is a real error),
 *   - exactly one of them different,
 *   - that word at least 5 characters (дэр/дээр and cat/eat are distinct
 *     words, not slips, and accepting them teaches the confusion),
 *   - off by at most one character per five.
 *
 * Returns the distance, or Infinity when it is not a slip.
 */
export function typoDistance(given, correct) {
  const a = given.split(' '), c = correct.split(' ');
  if (a.length !== c.length) return Infinity;
  let odd = null, seen = 0;
  for (let i = 0; i < c.length; i++) {
    if (a[i] === c[i]) continue;
    if (++seen > 1) return Infinity;
    odd = { d: lev(a[i], c[i]), len: c[i].length };
  }
  if (!odd) return 0;
  if (odd.len < 5) return Infinity;
  return odd.d <= Math.max(1, Math.floor(odd.len / 5)) ? odd.d : Infinity;
}

/**
 * Grade a typed answer against every form that counts as correct.
 *
 * Returns the *best* outcome across the accepted set — an exact match to any
 * one of them beats a near miss on another, so listing more alternatives can
 * only ever help the learner, never penalise them.
 *
 *   ok       accepted as correct
 *   typo     accepted, but the spelling was off — `matched` holds the right form
 *   close    rejected, but near enough to be worth showing the target
 *   matched  which accepted form the answer was scored against
 *   distance edit distance to `matched`
 */
export function gradeAnswer(given, accepted, strictness = 0.2) {
  const a = norm(given);
  const forms = (Array.isArray(accepted) ? accepted : [accepted])
    .flatMap(acceptedForms)
    .map(f => ({ raw: f, norm: norm(f) }))
    .filter(f => f.norm);

  if (!a || !forms.length) {
    return { ok: false, typo: false, close: false, matched: forms[0]?.raw ?? '', distance: Infinity };
  }

  // Score against every accepted form and keep the best outcome, so listing
  // more alternatives can only help the learner, never penalise them.
  let best = null;
  for (const f of forms) {
    const exact = f.norm === a;
    const slip = exact ? 0 : typoDistance(a, f.norm);
    const cand = {
      matched: f.raw, norm: f.norm,
      distance: exact ? 0 : lev(a, f.norm),
      slip
    };
    if (!best || cand.slip < best.slip ||
        (cand.slip === best.slip && cand.distance < best.distance)) best = cand;
    if (exact) break;
  }

  const { matched, distance } = best;
  if (distance === 0) return { ok: true, typo: false, close: false, matched, distance };

  // Above this strictness nothing but an exact answer counts.
  if (strictness < 0.67 && best.slip !== Infinity) {
    return { ok: true, typo: true, close: false, matched, distance: best.slip };
  }
  // Not accepted, but near enough that showing the target is useful.
  if (distance <= Math.ceil(best.norm.length * 0.34)) {
    return { ok: false, typo: false, close: true, matched, distance };
  }
  return { ok: false, typo: false, close: false, matched, distance };
}

/**
 * Back-compatible wrapper: grade against a single target field, honouring the
 * slash convention inside it.
 */
export function gradeText(ans, correct, strictness) {
  const { ok, close, typo, matched, distance } = gradeAnswer(ans, [correct], strictness);
  return { ok, close, typo, matched, distance };
}

/**
 * Token-level diff for sentence feedback: which words landed, which were
 * missed. Run against whichever accepted form the answer actually scored
 * best on, so a learner who picked a legitimate alternative phrasing is not
 * shown a diff against a sentence they never tried to write.
 */
export function diffTokens(given, correct) {
  const pool = norm(given).split(' ');
  return norm(correct).split(' ').map(tok => {
    const exact = pool.indexOf(tok);
    if (exact >= 0) { pool.splice(exact, 1); return { tok, state: 'hit' }; }
    const near = pool.findIndex(x => lev(x, tok) <= 1);
    if (near >= 0) { pool.splice(near, 1); return { tok, state: 'near' }; }
    return { tok, state: 'miss' };
  });
}
