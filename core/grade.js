/** Typed-answer grading. Lenient on Cyrillic spelling early, strict as accuracy rises. */

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
 * strictness 0..1 controls tolerated edit distance.
 * Words of 4 characters or fewer are never accepted as typos — otherwise
 * cat/eat and дэр/дээр would pass as spelling slips rather than errors.
 */
export function gradeText(ans, correct, strictness) {
  const a = norm(ans), c = norm(correct);
  if (!a) return { ok: false, close: false };
  if (a === c) return { ok: true, close: false };
  if (c.split(/[\/,]/).map(norm).includes(a)) return { ok: true, close: false };

  const d = lev(a, c);
  let tol = strictness < 0.34 ? 2 : strictness < 0.67 ? 1 : 0;
  tol = Math.min(tol, c.length <= 4 ? 0 : Math.ceil(c.length * 0.25));
  if (strictness >= 0.67) tol = 0;

  if (d <= tol) return { ok: true, close: d > 0 };
  if (d <= tol + 1 && d <= Math.ceil(c.length * 0.4)) return { ok: false, close: true };
  return { ok: false, close: false };
}

/** Token-level diff for sentence feedback: which words landed, which were missed. */
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
