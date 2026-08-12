/**
 * Goal, consistency and achievement telemetry.
 *
 * The app now shows levels, XP and badges. None of them are invented: every
 * figure here is derived from something that actually happened — a day a
 * session was *finished*, a review that was *graded*, a word whose FSRS
 * stability actually crossed the known threshold. There is no number in this
 * module that the learner could inflate without doing the work.
 *
 * Two deliberate design decisions, both from the gamification-misuse research
 * in ROADMAP.md:
 *
 *   1. A streak day requires a *finished session*, not an app open. Sessions
 *      only close once every item has been graded, so protecting the streak
 *      and doing the work are the same action. There are no streak freezes.
 *   2. The week, not the 2,500-word goal, is the headline period. One lesson
 *      is 14% of a week and 0.04% of B1; a horizon nobody can move in a day
 *      does not motivate, it flattens.
 *
 * DOM-free, like the rest of core/.
 */
import { daysBetween } from './fsrs.js';
import { addDays } from './progress.js';

/** Stability at which a word counts as known. Matches stats() in progress.js. */
export const KNOWN_S = 21;

/** Days used to measure intake rate for the B1 projection. */
export const RATE_WINDOW = 14;

// ---------------------------------------------------------------- calendar
// Keys are parsed at a fixed offset, same as fsrs.js, so week and month
// arithmetic stays exact whole days across DST.

const at = key => new Date(key + 'T00:00:00Z');

/** Monday-based weekday index, 0 = Monday .. 6 = Sunday. */
export const weekday = key => (at(key).getUTCDay() + 6) % 7;

/** The Monday of the week containing `key`. */
export const weekStart = key => addDays(key, -weekday(key));

/** The 1st of the month containing `key`. */
export const monthStart = key => key.slice(0, 8) + '01';

export const daysInMonth = key => {
  const d = at(key);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
};

// ---------------------------------------------------------------- history
/**
 * History entries are appended by the app when a session closes:
 *   { date, tracked, due, reviews, newWords, known, onTime, late, xp }
 *
 * Entries written before this feature existed carry only the first three
 * fields, so every read here tolerates the rest being absent rather than
 * reporting zeroes as though they were measurements.
 */

/** Set of day keys on which a session was actually finished. */
export const studyDays = history =>
  new Set((history || []).map(h => h.date).filter(Boolean));

/** The most recent entry for a given day, or null. */
export function entryFor(history, key) {
  const hits = (history || []).filter(h => h.date === key);
  return hits.length ? hits[hits.length - 1] : null;
}

/**
 * Consecutive finished days ending today, or ending yesterday if today is
 * still unstarted — an unfinished today must not read as a broken streak at
 * nine in the morning.
 */
export function streak(history, today) {
  const days = studyDays(history);
  if (!days.size) return 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) { n++; cursor = addDays(cursor, -1); }
  return n;
}

/** Longest run of consecutive finished days ever recorded. */
export function bestStreak(history) {
  const days = [...studyDays(history)].sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

// ---------------------------------------------------------------- periods

/**
 * The seven days of the current week, for the dashboard strip.
 * state: 'done' | 'today' | 'missed' | 'future'
 *
 * A missed day stays visible as a gap. Renumbering the week to hide it would
 * make the readout flattering and false.
 */
export function weekCells(history, today) {
  const days = studyDays(history);
  const start = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    const done = days.has(key);
    const state = key === today ? (done ? 'done' : 'today')
      : key > today ? 'future'
      : done ? 'done' : 'missed';
    return { key, state, index: i };
  });
}

/**
 * Month grid cells, Monday-first, with leading blanks so the columns line up
 * under the weekday headers.
 */
export function monthCells(history, today) {
  const days = studyDays(history);
  const first = monthStart(today);
  const cells = Array.from({ length: weekday(first) }, () => ({ key: null, state: 'blank' }));
  for (let d = 1; d <= daysInMonth(today); d++) {
    const key = first.slice(0, 8) + String(d).padStart(2, '0');
    const done = days.has(key);
    cells.push({
      key, day: d,
      state: key === today ? (done ? 'done' : 'today')
        : key > today ? 'future'
        : done ? 'done' : 'missed'
    });
  }
  return cells;
}

/**
 * What a period actually produced. `known` is a snapshot per entry rather than
 * a delta, so the gain is the difference between the first and last snapshot
 * that exist — robust to days with no session and to the older entries that
 * never recorded it.
 */
export function periodTotals(history, from, to) {
  const inRange = (history || []).filter(h => h.date >= from && h.date <= to);
  const knowns = inRange.map(h => h.known).filter(k => typeof k === 'number');
  const before = (history || []).filter(h => h.date < from && typeof h.known === 'number');
  const baseline = before.length ? before[before.length - 1].known : knowns[0];
  return {
    days: new Set(inRange.map(h => h.date)).size,
    reviews: inRange.reduce((a, h) => a + (h.reviews || 0), 0),
    newWords: inRange.reduce((a, h) => a + (h.newWords || 0), 0),
    xp: inRange.reduce((a, h) => a + (h.xp || 0), 0),
    onTime: inRange.reduce((a, h) => a + (h.onTime || 0), 0),
    late: inRange.reduce((a, h) => a + (h.late || 0), 0),
    knownGain: knowns.length && typeof baseline === 'number'
      ? Math.max(0, knowns[knowns.length - 1] - baseline)
      : null
  };
}

export const weekTotals = (history, today) =>
  periodTotals(history, weekStart(today), addDays(weekStart(today), 6));

export const monthTotals = (history, today) =>
  periodTotals(history, monthStart(today), today);

/** Share of reviews graded on or before their due date. Null until measured. */
export function punctuality(totals) {
  const n = totals.onTime + totals.late;
  return n ? totals.onTime / n : null;
}

// ---------------------------------------------------------------- the goal

/**
 * Known words gained per day over the trailing window.
 *
 * Needs two `known` snapshots at least a day apart; returns null rather than
 * guessing. A null rate must render as "not enough data yet", never as zero
 * progress or an infinite projection.
 */
export function intakeRate(history, today, window = RATE_WINDOW) {
  const from = addDays(today, -window);
  const pts = (history || [])
    .filter(h => h.date >= from && h.date <= today && typeof h.known === 'number')
    .sort((a, b) => a.date < b.date ? -1 : 1);
  if (pts.length < 2) return null;
  const span = daysBetween(pts[0].date, pts[pts.length - 1].date);
  if (span <= 0) return null;
  return (pts[pts.length - 1].known - pts[0].known) / span;
}

/**
 * Day key on which `target` known words is reached at the current rate.
 * Null when the rate is unknown or non-positive — an unreachable goal gets no
 * date rather than a date in the year 9999.
 */
export function projectDate(known, target, rate, today) {
  if (rate === null || rate <= 0 || known >= target) return null;
  const days = Math.ceil((target - known) / rate);
  if (days > 365 * 50) return null;
  return addDays(today, days);
}

/**
 * Level thresholds in known words, ending exactly on the B1 estimate so the
 * ladder and the goal are the same journey. Deliberately unnamed: naming the
 * levels means writing Mongolian that neither Luna nor Sarnai has checked.
 */
export const LEVELS = [0, 10, 25, 50, 100, 175, 275, 400, 600, 850, 1150, 1500, 1900, 2500];

export function levelFor(known) {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) if (known >= LEVELS[i]) level = i + 1;
  const floor = LEVELS[level - 1];
  const next = LEVELS[level] ?? null;
  return {
    level,
    floor,
    next,
    toNext: next === null ? null : next - known,
    share: next === null ? 1 : (known - floor) / (next - floor)
  };
}

/**
 * XP for one graded review.
 *
 * Base for doing the work at all, plus the stability the review actually
 * bought, capped. A lapse still earns the base — showing up on a word you had
 * forgotten is the review that matters most — but it earns no bonus, because
 * no memory was gained. Nothing here can be earned without grading a card.
 */
export const XP_BASE = 6;
export const XP_CAP = 14;

export function xpFor(prevS, nextS) {
  const gain = Math.max(0, (nextS || 0) - (prevS || 0));
  return XP_BASE + Math.round(Math.min(XP_CAP, gain));
}

/**
 * XP for one graded grammar drill.
 *
 * Grammar practice has no FSRS stability to measure a gain against — it is
 * on demand, not scheduled — so this is flatter than xpFor(): a small base
 * for attempting, a bonus for getting it right. Still real: nothing here
 * fires without a drill actually being answered.
 */
export const GRAMMAR_XP_BASE = 3;
export const GRAMMAR_XP_BONUS = 3;

export function xpForGrammar(ok) {
  return GRAMMAR_XP_BASE + (ok ? GRAMMAR_XP_BONUS : 0);
}

// ---------------------------------------------------------------- badges

/**
 * Every badge is a real event with a checkable condition. Mongolian labels are
 * machine-written and follow the lexicon's `reviewed: false` convention —
 * Luna or Sarnai should confirm them before they count as chrome.
 */
export const BADGES = [
  { id: 'first',      mn: 'Эхлэл',              en: 'first session',      reviewed: false },
  { id: 'week7',      mn: 'Долоо хоног',        en: '7 day streak',       reviewed: false },
  { id: 'day30',      mn: 'Гуч хоног',          en: '30 day streak',      reviewed: false },
  { id: 'day100',     mn: 'Зуу хоног',          en: '100 day streak',     reviewed: false },
  { id: 'full-week',  mn: 'Бүтэн долоо хоног',  en: 'all 7 days in a week', reviewed: false },
  { id: 'known25',    mn: '25 үг',              en: '25 words known',     reviewed: false },
  { id: 'known50',    mn: '50 үг',              en: '50 words known',     reviewed: false },
  { id: 'known100',   mn: '100 үг',             en: '100 words known',    reviewed: false },
  { id: 'known250',   mn: '250 үг',             en: '250 words known',    reviewed: false },
  { id: 'perfect',    mn: 'Төгс өгүүлбэр',      en: 'sentence with no misses', reviewed: false },
  { id: 'retention',  mn: 'Тогтоолт 90%',       en: 'retention at target', reviewed: false },
  { id: 'backup',     mn: 'Нөөцлөв',            en: 'backup code taken',  reviewed: false }
];

export const byBadgeId = Object.fromEntries(BADGES.map(b => [b.id, b]));

/**
 * Which badges the current state qualifies for. Returns the full earned set;
 * the caller diffs it against `p.badges` to find what is newly won.
 */
export function earnedBadges(p, ctx = {}) {
  const { stats = {}, today, perfectSentence = false } = ctx;
  const history = p.history || [];
  const known = stats.known || 0;
  const run = streak(history, today);
  const out = new Set(p.badges || []);

  if (history.length) out.add('first');
  if (run >= 7) out.add('week7');
  if (run >= 30) out.add('day30');
  if (run >= 100) out.add('day100');
  if (known >= 25) out.add('known25');
  if (known >= 50) out.add('known50');
  if (known >= 100) out.add('known100');
  if (known >= 250) out.add('known250');
  if (perfectSentence) out.add('perfect');
  if (p.lastExport) out.add('backup');
  if ((stats.tracked || 0) >= 20 && (stats.avgRetrievability || 0) >= 0.9) out.add('retention');
  if (weekCells(history, today).filter(c => c.state === 'done').length === 7) out.add('full-week');

  return [...out];
}

/**
 * What the session ahead is worth, stated before it starts.
 *
 * The share is of the *week*, because that is the period a single lesson can
 * visibly move. Estimated minutes come from the item count at a measured pace,
 * and are labelled as an estimate wherever they are shown.
 */
export const SECONDS_PER_ITEM = 20;

/** Screens the learner will actually step through: the deck counts as its cards. */
export const stepCount = session =>
  session.items.reduce((n, it) => n + (it.kind === 'deck' ? it.words.length : 1), 0);

export function lessonWorth(session, history, today) {
  const items = stepCount(session);
  const cells = weekCells(history, today);
  const done = cells.filter(c => c.state === 'done').length;
  return {
    items,
    newWords: session.fresh.length,
    reviews: session.due.length,
    minutes: Math.max(1, Math.round(items * SECONDS_PER_ITEM / 60)),
    // One more finished day out of seven. Zero once today is already done.
    weekShare: cells.find(c => c.key === today && c.state === 'done') ? 0 : 1 / 7,
    weekDone: done
  };
}
