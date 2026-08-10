/**
 * Session builder: what to study today, and in what form.
 *
 * Two ideas drive this:
 *   1. FSRS decides *when* an item is worth reviewing (retrievability-based).
 *   2. i+1 decides *how* it is presented — as a sentence where exactly one
 *      element is weak, so the rest of the sentence supplies context.
 *
 * Research basis: input is most useful at 90–98% comprehensibility, and words
 * met in context are retained longer than words drilled in isolation.
 * See ROADMAP.md for sources.
 */
import { makeFSRS, dayKey, daysBetween } from './fsrs.js';
import { hashSeed } from './choices.js';

const KNOWN_R = 0.80;   // recall probability above which a word is "supporting context"
const WEAK_R  = 0.60;   // below this the word is the thing being taught
const SENTENCE_TARGET_FLOOR = 3;   // targets never taken from the sentence phase

/**
 * Which way a word card faces.
 *
 * A word met today is asked Mongolian-first: recognition before production.
 * After that the direction alternates on the word and the date, so both halves
 * come round on their own. It used to be `sessionIndex % 2`, which meant the
 * direction depended on where the card happened to land in the session — the
 * same word could be asked the same way for a week.
 */
function cardDir(word, isNew, today) {
  if (isNew) return 'mge';
  return hashSeed(`${word.id}:${today}`) % 2 ? 'egm' : 'mge';
}

export function buildSession(p, words, sentences, opts = {}) {
  const today = opts.today || dayKey();
  const fsrs = makeFSRS(opts.w, p.desiredRetention);
  const byId = Object.fromEntries(words.map(w => [w.id, w]));

  // --- current memory picture -------------------------------------------
  const R = {};
  for (const id in p.items) {
    const it = p.items[id];
    R[id] = fsrs.retrievability(Math.max(0, daysBetween(it.last || today, today)), it.s);
  }
  // Closed-class grammar (drill:false) is scaffolding, not material under
  // instruction: it is never introduced, never scheduled, and never the i+1
  // element. It still counts as known context, or every sentence containing
  // «байна» would read as incomprehensible forever — and because such a word
  // is never in p.items, isNew() would otherwise call all of them weak.
  const drillable = id => byId[id] ? byId[id].drill !== false : true;

  const isKnown = id => !drillable(id) || (R[id] ?? 0) >= KNOWN_R;
  const isWeak  = id => drillable(id) && p.items[id] && (R[id] ?? 0) < WEAK_R;
  const isNew   = id => drillable(id) && !p.items[id];

  // --- due reviews, most overdue first ----------------------------------
  // Items whose word has since left words.json are dropped: they can never be
  // presented, so counting them would show due work that cannot be started.
  const due = Object.keys(p.items)
    .filter(id => p.items[id].due <= today && byId[id] && drillable(id))
    .map(Number)
    .sort((a, b) => (R[a] ?? 0) - (R[b] ?? 0));

  // --- new words, capped ------------------------------------------------
  const introduced = new Set(p.introduced);
  const backlog = due.length;
  // Back off on new material when reviews are piling up — otherwise the
  // schedule compounds and the day becomes unmanageable.
  const room = Math.max(0, p.dailyNewCap - Math.floor(backlog / 6));
  const fresh = words
    .filter(w => w.drill !== false && !introduced.has(w.id))
    .slice(0, opts.newCount ?? room)
    .map(w => w.id);

  const targets = [...due, ...fresh];

  // --- word drills, reserved before the sentences claim everything -------
  // Vocabulary drilled in isolation used to be *residue*: a target became a
  // word card only when no chosen sentence happened to contain it. With 164
  // sentences over 184 words the sentence phase absorbed nearly all of them,
  // so the card — and with it multiple choice, the only place it lives —
  // vanished for days at a time. A cold start produced no word card at all on
  // days 1, 2 and 4, and averaged 3.7 a day against 7.7 sentences.
  //
  // Targets are reserved for drilling *before* the sentences are scored. That
  // keeps the property which made the old arrangement correct: a word is
  // presented once per session, so it is graded once per session, and the FSRS
  // same-day term (~1.29× stability per repeat) never compounds on it.
  const drillCap = opts.wordDrills ?? p.wordDrills ?? 8;   // default in blank()
  // Never reserve so much that the sentence phase has nothing left to teach.
  // Sentences are what build comprehension; a session of bare word cards is
  // the flashcard app this scheduler was written to replace. Holding back a
  // fixed few rather than a fraction keeps the setting meaningful: a share of
  // the targets would have capped every setting above ~6 at the same figure.
  const reserveN = (!drillCap || !targets.length)
    ? 0
    : Math.max(1, Math.min(drillCap, targets.length - SENTENCE_TARGET_FLOOR));
  // Alternating the two sources matters more than it looks. Taking all the new
  // words first let a day of fresh vocabulary crowd the reviews out entirely,
  // and reviews are the only cards that ask ENG→MGL — new words are always
  // asked the other way round. Straight new-words-first left that direction at
  // 14% of all cards, so the harder half of the vocabulary barely came up.
  const drillOrder = [];
  for (let i = 0; i < Math.max(fresh.length, due.length); i++) {
    if (i < fresh.length) drillOrder.push(fresh[i]);
    if (i < due.length) drillOrder.push(due[i]);   // `due` is weakest-first
  }
  const drilled = new Set(drillOrder.slice(0, reserveN));

  // --- sentence selection -----------------------------------------------
  const targetSet = new Set(targets.filter(id => !drilled.has(id)));

  const scored = sentences.map(s => {
    const ids = s.ids;
    const weak = ids.filter(id => isNew(id) || isWeak(id));
    const known = ids.filter(id => isKnown(id));
    const teaches = ids.filter(id => targetSet.has(id));
    const comprehensible = ids.length ? known.length / ids.length : 0;
    // The i+1 sweet spot: exactly one unfamiliar element, everything else solid.
    let score = 0;
    if (teaches.length === 0) score = -100;
    else if (weak.length === 1) score = 100 + teaches.length * 5;
    else if (weak.length === 0) score = 40;            // consolidation
    else score = 30 - (weak.length - 1) * 12;          // too many unknowns
    score += comprehensible * 10;
    // prefer sentences whose target is the most overdue
    const worst = Math.min(...teaches.map(id => R[id] ?? 0), 1);
    score += (1 - worst) * 8;
    return { s, score, weak: weak.length, comprehensible, teaches };
  }).filter(x => x.score > -100)
    .sort((a, b) => b.score - a.score);

  const sentenceCount = opts.sentenceCount ?? 8;
  const picked = [];
  const covered = new Set();
  for (const cand of scored) {
    if (picked.length >= sentenceCount) break;
    // avoid drilling the same target repeatedly in one session
    if (cand.teaches.every(id => covered.has(id))) continue;
    cand.teaches.forEach(id => covered.add(id));
    picked.push(cand);
  }

  const sentenceItems = picked.map((c, i) => ({
    kind: 'sentence',
    sentence: c.s,
    dir: i % 2 === 0 ? 'egm' : 'mge',
    targetIds: c.teaches,
    weak: c.weak,
    comprehensible: c.comprehensible
  }));

  // Word cards: the reserved drills, plus any target no sentence could carry —
  // a due word with no usable sentence must still be practised somewhere.
  // Kept in `targets` order (reviews, then new words) so the deck at the top of
  // the session and the first recall of a word it introduced are not adjacent.
  const inSentences = new Set(picked.flatMap(c => c.teaches));
  const cardItems = targets
    .filter(id => drilled.has(id) || !inSentences.has(id))
    .map(id => ({ kind: 'card', word: byId[id], isNew: isNew(id) }))
    .filter(x => x.word)
    .map(it => ({ ...it, dir: cardDir(it.word, it.isNew, today) }));

  // New words arrive as one flip-through deck rather than N separate screens.
  // They are introduced together, then tested individually by the card items
  // that follow — introduction and first recall are different jobs.
  const deckWords = fresh.map(id => byId[id]).filter(Boolean);

  return {
    date: today,
    fresh,
    due,
    items: [
      ...(deckWords.length ? [{ kind: 'deck', words: deckWords }] : []),
      ...cardItems,
      ...sentenceItems
    ],
    diagnostics: {
      dueCount: due.length,
      newCount: fresh.length,
      sentenceCount: sentenceItems.length,
      cardCount: cardItems.length,
      avgComprehensibility: sentenceItems.length
        ? sentenceItems.reduce((a, b) => a + b.comprehensible, 0) / sentenceItems.length
        : 0,
      iPlusOneShare: sentenceItems.length
        ? sentenceItems.filter(x => x.weak === 1).length / sentenceItems.length
        : 0
    }
  };
}

/** Apply a grade to one word and reschedule it. */
export function applyGrade(p, wordId, g, opts = {}) {
  const today = opts.today || dayKey();
  const fsrs = makeFSRS(opts.w, p.desiredRetention);
  const prev = p.items[wordId];
  const elapsed = prev ? Math.max(0, daysBetween(prev.last || today, today)) : 0;
  const next = fsrs.review(prev, g, elapsed);
  const ivlDays = Math.max(1, Math.round(next.ivl));
  p.items[wordId] = {
    s: next.s,
    d: next.d,
    reps: next.reps,
    lapses: next.lapses,
    last: today,
    due: shift(today, ivlDays),
    right: (prev?.right || 0) + (g > 1 ? 1 : 0),
    wrong: (prev?.wrong || 0) + (g === 1 ? 1 : 0)
  };
  if (!p.introduced.includes(wordId)) p.introduced.push(wordId);
  return p.items[wordId];
}

function shift(key, n) {
  return new Date(new Date(key + 'T00:00:00Z').getTime() + n * 86400000)
    .toISOString().slice(0, 10);
}
