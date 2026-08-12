/** Pure render functions — HTML strings. No state mutation here. */
import { fmtInterval } from '../core/fsrs.js';
import {
  weekCells, monthCells, weekTotals, monthTotals, punctuality, streak, bestStreak,
  intakeRate, projectDate, levelFor, lessonWorth, byBadgeId, BADGES
} from '../core/goals.js';

export const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const pct = n => Math.round(n * 100);

/** A small explanatory caption under a figure or control — mono grey, English only. */
const gl = en => `<div class="gl">${esc(en)}</div>`;
/** Same, inline — sits beside its line rather than under it. */
const gli = en => `<span class="gl inline-gl">${esc(en)}</span>`;

/**
 * "Correct, but you misspelt it."
 *
 * A slip is not a forgotten word, so it grades as correct — but silently
 * accepting it teaches the slip. The note names what was typed, what the
 * spelling should be, and why the grade bar is pointing at "Hard".
 */
export function typoNote(fb) {
  if (!fb || !fb.typo) return '';
  return `<div style="margin-top:11px;padding-top:10px;border-top:1px solid var(--rule2)">
    <span class="lab red">SPELLING</span>
    <div class="spell">
      <div class="was">${esc(fb.given.trim())}</div>
      <div class="is"><span class="arrow">→</span>${esc(fb.matched)}</div>
    </div>
    <div class="gl raw">accepted — one letter out, so it is graded Hard, not Good</div>
  </div>`;
}

/** Shown when the answer matched a listed alternative rather than the canonical form. */
function altNote(fb) {
  if (!fb || !fb.ok || !fb.alternative) return '';
  return `<div class="gl">accepted alternative — the listed answer is different wording</div>`;
}

/** Monday-first, matching weekCells(). */
const WEEKDAYS = ['MO','TU','WE','TH','FR','SA','SU'];
const monthLabel = key =>
  new Date(key.slice(0, 7) + '-01T00:00:00Z')
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
const dateLabel = key =>
  new Date(key + 'T00:00:00Z').toLocaleDateString('en-GB',
    { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();

export function header(st, sub) {
  return `<div class="top">
    <div>
      <div class="mono">MONGOLIAN · FSRS</div>
      <h1>${esc(sub)}</h1>
      <div class="sub">${st.tracked} words tracked · ${st.due} due</div>
    </div>
    <div class="mono right">${new Date().toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'}).toUpperCase()}<br>
    RET ${pct(st.avgRetrievability)}%<br>ACC ${pct(st.accuracy)}%</div>
  </div>`;
}

/**
 * The whole chrome of a question screen.
 *
 * A lesson used to carry the dashboard header — app name, words tracked, due
 * count, date, RET, ACC — on top of every single question. Eight lines and
 * about twenty words, identical on every screen, none of it answerable and
 * none of it needed while recalling a word. Measured on the sentence feedback
 * screen it was a third of the text on screen.
 *
 * What survives is what a question actually needs: how far through you are,
 * and a way out. The telemetry is not deleted — it is on the dashboard, which
 * is where you go to read it rather than to study.
 */
export function lessonBar(done, total) {
  const segs = Array.from({ length: total }, (_, i) =>
    `<i class="${i < done ? 'done' : i === done ? 'now' : ''}"></i>`).join('');
  return `<div class="lessonbar">
    <div class="rail">${segs}</div>
    <div class="barfoot">
      <span class="mono">${done} / ${total}</span>
      <button class="exit" data-act="home" title="exit">✕</button>
    </div>
  </div>`;
}

export function retrievabilityMeter(r) {
  return `<div class="rmeter"><span class="mono">RECALL</span>
    <span class="track"><i class="${r < 0.6 ? 'low' : ''}" style="width:${pct(r)}%"></i></span>
    <span class="mono">${pct(r)}%</span></div>`;
}

const GRADE_LABELS = ['Again', 'Hard', 'Good', 'Easy'];

export function gradeBar(previewIvls, selected) {
  return `<div class="gradebar">${GRADE_LABELS.map((l, i) => `
    <button class="grade${selected === i + 1 ? ' sel' : ''}" data-act="grade" data-g="${i + 1}">
      <div class="lbl">${l}</div>
      <div class="ivl">${fmtInterval(previewIvls[i])}</div>
    </button>`).join('')}</div>`;
}

export function contextChips(ids, targetIds, byId) {
  const t = new Set(targetIds);
  return `<div class="ctx">${ids.map(id => {
    const w = byId[id];
    return w ? `<span class="${t.has(id) ? 'target' : ''}">${esc(w.mn)} · ${esc(w.en)}</span>` : '';
  }).join('')}</div>`;
}

/**
 * Backup staleness. Real telemetry: days since a code was actually exported
 * on this device, never a nag with an invented urgency score.
 */
export function backupNotice(age) {
  if (age !== null && age < 14) return '';
  const never = age === null;
  return `<div class="panel red">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div><div style="font-size:14px;font-weight:600">Export a backup code</div>
        <div class="gl">progress lives only on this device — there is no sync</div></div>
      <div class="mono red">${never ? 'NEVER' : age + 'D AGO'}</div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Dashboard.

   Week-led on purpose. A single lesson is 14% of a week and 0.04% of the
   2,500-word B1 estimate; leading with the number nobody can move in a day
   makes every session look like nothing. The long horizon still appears —
   it is the last band on the screen, as context rather than as the verdict.
   ══════════════════════════════════════════════════════════════════════ */

function weekStrip(cells, today) {
  return `<div class="week">${cells.map((c, i) => `
    <div class="d${c.key === today ? ' now' : ''}">
      <div class="bar ${c.state}"></div>
      <div class="lbl">${WEEKDAYS[i]}</div>
    </div>`).join('')}</div>`;
}

function monthGrid(cells) {
  return `<div class="mhead">${WEEKDAYS.map(d => `<span>${d}</span>`).join('')}</div>
    <div class="month">${cells.map(c => `<i class="${c.state}"></i>`).join('')}</div>`;
}

function badgeRow(earned) {
  const has = new Set(earned);
  const won = BADGES.filter(b => has.has(b.id));
  const locked = BADGES.length - won.length;
  if (!won.length) {
    return `<div class="gl" style="margin-top:8px">no milestones yet — the first arrives when you finish a session</div>`;
  }
  return `<div class="badges">
      ${won.map(b => `<span class="badge" title="${esc(b.en)}">${esc(b.en)}</span>`).join('')}
      ${locked ? `<span class="badge locked">+${locked}</span>` : ''}
    </div>
    <div class="mono" style="margin-top:6px">${won.length} / ${BADGES.length} EARNED</div>`;
}

/**
 * The «why» band.
 *
 * Empty until Fred writes one — never a placeholder platitude. The whole
 * point is that it is his sentence, in his words, on the screen every day;
 * a default would make it wallpaper.
 */
function purposeBand(purpose, editing) {
  if (editing) {
    return `<div class="panel gold">
      <span class="lab">WHY</span>
      ${gl('one sentence — why this is worth the time')}
      <textarea class="text" id="purposebox" rows="2" maxlength="240"
        placeholder="…">${esc(purpose || '')}</textarea>
      <div class="inline" style="margin-top:10px">
        <button class="btn secondary" data-act="purpose-save">Save</button>
        <button class="btn ghost" data-act="purpose-cancel">Cancel</button>
      </div>
    </div>`;
  }
  if (!purpose) {
    return `<div class="panel gold">
      <span class="lab">WHY</span>
      <div class="gl" style="margin-top:8px">why you are doing this — it shows here every day</div>
      <div class="btns"><button class="btn secondary" data-act="purpose">Write your reason</button></div>
    </div>`;
  }
  return `<div class="panel gold">
    <span class="lab">WHY</span>
    <div style="font-size:14.5px;font-weight:500;line-height:1.5;margin-top:8px">${esc(purpose)}</div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px">
      <button class="btn ghost slim" data-act="purpose">Edit</button></div>
  </div>`;
}

export function viewDash(p, st, session, extra, ctx = {}) {
  const { exportAge, today, editPurpose } = ctx;
  const diag = session.diagnostics;
  const nothing = diag.dueCount + diag.newCount === 0;
  const history = p.history || [];

  const cells = weekCells(history, today);
  const doneThisWeek = cells.filter(c => c.state === 'done').length;
  const wt = weekTotals(history, today);
  const mt = monthTotals(history, today);
  const onTime = punctuality(wt);
  const run = streak(history, today);
  const best = bestStreak(history);
  const worth = lessonWorth(session, history, today);

  const goal = p.goalWords || 2500;
  const lvl = levelFor(st.known);
  const rate = intakeRate(history, today);
  const eta = projectDate(st.known, goal, rate, today);

  return header(st, 'Today') +
    backupNotice(ctx.exportAge === undefined ? null : exportAge) +
    purposeBand(p.purpose, editPurpose) +

    // ---- the week: the period one lesson can actually move ----------
    `<div class="h"><span class="mono">THIS WEEK</span></div>
    <div class="panel red">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="big">${doneThisWeek}<span class="u"> / 7 days</span></div>
        <span class="lab red">STREAK ${run}</span>
      </div>
      <div class="gl">${doneThisWeek} of 7 days · ${run}-day streak${best > run ? ` · best ${best}` : ''}</div>
      ${weekStrip(cells, today)}
    </div>

    <div class="goldband">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="mono">THIS LESSON</div>
          <div class="big" style="margin-top:5px">${worth.items}<span class="u"> items</span></div></div>
        <div style="text-align:right">
          <div class="big" style="font-size:26px">${worth.weekShare ? '+1' : '✓'}</div>
          <div class="mono" style="margin-top:2px">${worth.weekShare ? 'DAY OF 7' : 'DONE TODAY'}</div></div>
      </div>
      <div class="gl">${worth.newWords} new · ${worth.reviews} due · ~${worth.minutes} min estimated</div>
    </div>

    <div class="panel red rows">
      <div class="wline"><span class="mn">Due reviews</span><span class="n">${diag.dueCount}</span></div>
      <div class="wline"><span class="mn">New words</span><span class="n">${diag.newCount}</span></div>
      <div class="wline"><span class="mn">Sentences</span><span class="n">${diag.sentenceCount}</span></div>
      <div class="wline"><span class="mn">Comprehensible</span><span class="n">${pct(diag.avgComprehensibility)}%</span></div>
    </div>

    <div class="btns"><button class="btn primary" data-act="start"${nothing ? ' disabled' : ''}>
      ${nothing ? 'Nothing due today' : `Start →${gli(`${worth.items} items · ~${worth.minutes} min`)}`}</button></div>

    <!-- ---- below: what the work has already produced ---------------- -->
    <div class="h"><span class="mono">WEEK SO FAR</span></div>
    <div class="panel blue flush"><div class="grid2">
      <div><span class="lab">REVIEWS</span><div class="big">${wt.reviews}</div><div class="gl">reviews landed</div></div>
      <div><span class="lab">NEW WORDS</span><div class="big">${wt.newWords}</div><div class="gl">new words met</div></div>
      <div><span class="lab">KNOWN</span><div class="big blue">${wt.knownGain === null ? '—' : '+' + wt.knownGain}</div>
        <div class="gl">${wt.knownGain === null ? 'not measured yet' : 'crossed into known'}</div></div>
      <div><span class="lab">ON TIME</span><div class="big">${onTime === null ? '—' : pct(onTime) + '%'}</div>
        <div class="gl">${onTime === null ? 'no reviews yet' : 'reviews on time'}</div></div>
    </div></div>

    <div class="h"><span class="mono">${monthLabel(today)}</span><span class="mono">MONTH · ${mt.days}/${monthCells(history, today).filter(c => c.day).length}</span></div>
    <div class="panel">
      ${monthGrid(monthCells(history, today))}
      <div class="gl" style="margin-top:9px">each square is a day you finished a session · ${mt.reviews} reviews this month</div>
    </div>

    <div class="h"><span class="mono">LEVEL</span></div>
    <div class="panel gold">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="big">${lvl.level}<span class="u"> level</span></div>
        <span class="lab">${p.xp || 0} XP</span>
      </div>
      <div class="meter gold"><i style="width:${Math.max(2, pct(lvl.share))}%"></i></div>
      <div class="gl">${lvl.toNext === null
        ? 'top level — the goal itself'
        : `${lvl.toNext} more known words to level ${lvl.level + 1} · xp comes from reviews graded`}</div>
      ${badgeRow(p.badges || [])}
    </div>

    <div class="h"><span class="mono">GOAL</span></div>
    <div class="panel blue">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="big">${st.known}<span class="u"> / ${goal.toLocaleString('en-GB')} words</span></div>
        <span class="lab blue">B1 · ${(st.known / goal * 100).toFixed(1)}%</span>
      </div>
      <div class="meter gold"><i style="width:${Math.max(0.6, st.known / goal * 100)}%"></i></div>
      <div class="wline" style="margin-top:6px">
        <span class="mn" style="font-size:13px">${rate === null ? '—' : (rate >= 0 ? '+' : '') + rate.toFixed(1) + ' words'}</span>
        <span class="en">${rate === null ? 'rate needs two days of history' : 'known words per day, last 14d'}</span></div>
      <div class="wline">
        <span class="mn" style="font-size:13px">${eta ? dateLabel(eta) : '—'}</span>
        <span class="en">${eta ? 'projected at this rate' : 'no projection at this rate'}</span></div>
      <div class="gl" style="margin-top:8px">known = fsrs stability ≥ 21d · b1 target is a research estimate, not a cefr spec</div>
      <div class="mono red" style="margin-top:7px">CORPUS CEILING · ${ctx.corpusWords || 0} WORDS WRITTEN</div>
    </div>` +
    (extra || '') +
    `<div class="foot"><span class="mono">INSTRUMENT v3 · SOYOMBO</span><span class="mono">FSRS-6 · OFFLINE</span></div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Flashcard deck — how new words arrive.

   Was a static panel with the word and its translation already showing,
   and one button. Nothing was asked of the learner, so nothing was
   retrieved. Now the Mongolian faces up, the English is behind a flip,
   and each card ends in a decision that actually routes the word.
   ══════════════════════════════════════════════════════════════════════ */

export function viewDeck(item, ctx) {
  const { deckI, flipped } = ctx;
  const words = item.words;
  const w = words[deckI];
  const dots = words.map((_, i) =>
    `<i class="${i < deckI ? 'done' : i === deckI ? 'now' : ''}"></i>`).join('');

  return `<div class="sec">
    <div class="qhead"><span class="tag red">NEW WORD</span>
      <span class="mono">NEW ${deckI + 1}/${words.length}</span></div>
    <div class="deckdots" style="grid-template-columns:repeat(${words.length},1fr)">${dots}</div>

    <div class="deckpanel" data-act="flip">
      ${flipped
        ? `<div class="face en">${esc(w.en)}</div>
           <div class="gl">${esc(w.mn)}</div>
           <div class="flip"><span class="lab">WORD #${w.id}</span></div>`
        : `<div class="face">${esc(w.mn)}</div>
           <div class="flip"><span class="lab red">TAP TO FLIP</span></div>`}
    </div>

    <div class="btns">
      <button class="btn primary" data-act="deck-learn">Learn${gli('queue for review')}</button>
      <button class="btn secondary" data-act="deck-known">I know this${gli('schedule it further out')}</button>
    </div>
    ${deckI > 0 ? `<div class="inline" style="margin-top:8px">
      <button class="btn ghost slim" data-act="deck-back">← Back</button></div>` : ''}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Word card — multiple choice, or typed when mcMode is off.
   ══════════════════════════════════════════════════════════════════════ */

export function viewCard(item, ctx) {
  const { word } = item;
  const { fb, previewIvls, r, dir, choices, picked, mcMode } = ctx;
  const front = dir === 'mge' ? word.mn : word.en;
  const back  = dir === 'mge' ? word.en : word.mn;
  const answered = picked !== null && picked !== undefined;
  const useMC = mcMode && choices && choices.usable;

  const head = `<div class="qhead">
      <span class="tag">${dir === 'mge' ? 'MGL → ENG' : 'ENG → MGL'}</span>
      <span class="mono">CARD · ${item.isNew ? 'NEW' : 'REVIEW'}</span></div>`;

  /* No boxed "prompt" label: the tag above already says which way round the
     card is, and a boxed label naming a 44px word as "the prompt" is a line of
     text on every question that tells you nothing you cannot see.

     The recall meter moves to the answer. It reports how likely you were to
     remember this word — which is worth reading *after* trying, and is a
     distraction, if not a hint, while you are still trying. */
  /* The spine is red only while the question is live. Once it is answered the
     prompt is reference material, and the one red on screen is the verdict —
     INSTRUMENT: two panels claiming the same domain means one of them is
     wrong, and red naming both "do this now" and "this was wrong" at the same
     time is exactly that. */
  const settled = answered || !!fb;
  const prompt = `<div class="panel${settled ? '' : ' red'}">
      <div class="prompt${dir === 'mge' ? '' : ' en'}">${esc(front)}</div>
    </div>`;
  const recall = !item.isNew ? retrievabilityMeter(r) : '';

  if (useMC) {
    const rows = choices.options.map((o, i) => {
      let cls = '';
      if (answered) {
        if (o.correct) cls = ' right';
        else if (i === picked) cls = ' wrong';
        else cls = ' muted';
      }
      return `<button class="choice${cls}" data-act="pick" data-i="${i}"${answered ? ' disabled' : ''}>
        <span class="k">${i + 1}</span><span class="txt">${esc(o.text)}</span></button>`;
    }).join('');

    const correct = answered && choices.options[picked].correct;
    /* Answered from a closed set of four, so the app already knows whether it
       was recalled — it does not ask. Picking a grade here meant answering the
       same question twice, the second time as a row of future dates. The
       interval is still printed, because INSTRUMENT requires that what the
       scheduler is about to do is on screen; it is now a readout rather than a
       question. See viewCard's typed branch, where nothing but the learner
       knows how hard it was, and the grade bar stays. */
    const ivl = answered ? fmtInterval(previewIvls[correct ? 2 : 0]) : '';
    return `<div class="sec">${head}${prompt}
      <div class="choices">${rows}</div>
      ${answered ? `<div class="panel ${correct ? 'green' : 'red'} reveal">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <span class="lab ${correct ? 'green' : 'red'}">${correct ? 'CORRECT' : 'WRONG'}</span>
            <div style="font-size:15px;font-weight:500;margin-top:7px">${esc(word.mn)} — ${esc(word.en)}</div>
          </div>
          <div style="text-align:right;flex:none">
            <div class="mono">NEXT</div>
            <div class="mono n" style="font-size:13px;color:var(--ink);margin-top:3px">${ivl}</div>
          </div>
        </div>
        ${recall}
      </div>` : ''}
      ${answered
        /* INSTRUMENT: red is action and red is error, and the two never appear
           as peers. A correct answer's continue button carries the same green
           as the verdict that produced it; a wrong answer's verdict already
           owns red, so the button steps back to secondary rather than
           claiming red for a second, different reason. */
        ? `<div class="btns">
             <button class="btn ${correct ? 'correct' : 'secondary'}" data-act="card-next" data-g="${correct ? 3 : 1}">Continue</button>
             ${correct ? `<button class="btn ghost slim" data-act="card-next" data-g="4">That was easy${gli('wait longer before asking again')}</button>` : ''}
           </div>`
        : `<div class="btns"><button class="btn ghost" data-act="mc-off">Type the answer instead</button></div>`}
    </div>`;
  }

  /* Multiple choice off: type the answer. Harder than picking from four and
     harder than reveal-and-self-rate, because nothing is on screen to
     recognise — the same production demand the sentences make. Graded by the
     same lenient-on-spelling comparison, so a Cyrillic typo is not a lapse. */
  const toMn = dir === 'egm';
  return `<div class="sec">${head}${prompt}
    ${fb
      ? `<div class="panel ${fb.ok ? 'green' : 'red'} reveal">
           <span class="lab ${fb.ok ? 'green' : 'red'}">${fb.ok ? 'CORRECT' : 'MISMATCH'}</span>
           <div class="fb" style="margin-top:0;border-top:0;padding-top:8px">
             <div class="ans">${esc(back)}</div>
             ${fb.given ? `<div class="yours">Your answer — ${esc(fb.given)}</div>`
               : '<div class="gl">nothing typed</div>'}
             ${fb.close && !fb.ok ? `<div class="gl">close — check the spelling</div>` : ''}
           </div>
           ${typoNote(fb)}
           ${recall}
         </div>
         ${gradeBar(previewIvls, fb.ok ? (fb.typo ? 2 : undefined) : 1)}`
      /* The placeholder already says which language is being asked for, and
         the tag above says which way round the card is. */
      : `<textarea class="text" id="ansbox" rows="1" autocapitalize="off" autocorrect="off"
           spellcheck="false" placeholder="${toMn ? 'type in Mongolian' : 'type in English'}"></textarea>
         <div class="btns">
           <button class="btn primary" data-act="check-word">Check</button>
           ${choices && choices.usable
             ? `<button class="btn ghost" data-act="mc-on">Use multiple choice instead</button>` : ''}
         </div>`}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Sentence — always typed. Picking a translation from four teaches
   recognition, and production is the thing that fails in conversation.
   ══════════════════════════════════════════════════════════════════════ */

export function viewSentence(item, ctx) {
  const { fb, previewIvls, byId } = ctx;
  const s = item.sentence;
  const toMn = item.dir === 'egm';
  const prompt = toMn ? s.en : s.mn;
  return `<div class="sec">
    <div class="qhead"><span class="tag">${toMn ? 'ENG → MGL' : 'MGL → ENG'}</span>
      <span class="mono">i+${item.weak} · ${pct(item.comprehensible)}% KNOWN</span></div>
    <div class="panel${fb ? '' : ' red'}">
      <span class="lab">TRANSLATE</span>
      <div class="prompt ${toMn ? 'en' : 'sm'}" style="margin-top:9px">${esc(prompt)}</div>
      ${s.note ? `<div class="subnote">${esc(s.note)}</div>` : ''}
      ${fb ? '' : `<textarea class="text" id="ansbox" rows="2" autocapitalize="off"
        autocorrect="off" spellcheck="false"
        placeholder="${toMn ? 'type in Mongolian' : 'type in English'}"></textarea>`}
    </div>
    ${fb ? `<div class="panel ${fb.ok ? 'green' : 'red'} reveal">
        <span class="lab ${fb.ok ? 'green' : 'red'}">${fb.ok ? 'CORRECT' : 'MISMATCH'}</span>
        <div class="fb" style="margin-top:0;border-top:0;padding-top:8px">
          <div class="ans diff">${fb.diff.map(t =>
            `<span class="${t.state === 'miss' ? 'miss' : t.state === 'near' ? 'near' : 'hit'}">${esc(t.tok)}</span>`).join(' ')}</div>
          ${altNote(fb)}
          ${fb.given ? `<div class="yours">Your answer — ${esc(fb.given)}</div>` : ''}
          ${contextChips(item.targetIds, item.targetIds, byId)}
        </div>
        ${typoNote(fb)}
      </div>
      ${gradeBar(previewIvls, fb.ok ? (fb.typo ? 2 : undefined) : 1)}`
      : `<div class="btns"><button class="btn primary" data-act="submit">Check</button></div>`}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Session close.
   ══════════════════════════════════════════════════════════════════════ */

export function viewDone(summary, st, p, ctx = {}) {
  const { today } = ctx;
  const history = p.history || [];
  const cells = weekCells(history, today);
  const doneThisWeek = cells.filter(c => c.state === 'done').length;
  const run = streak(history, today);
  const lvl = levelFor(st.known);
  const fresh = (summary.newBadges || []).map(id => byBadgeId[id]).filter(Boolean);

  return header(st, 'Finished') +
    `<div class="goldband">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="mono">TODAY</div>
          <div class="big" style="margin-top:5px">+${summary.xp}<span class="u"> XP</span></div></div>
        <div style="text-align:right"><div class="big" style="font-size:26px">${doneThisWeek}/7</div>
          <div class="mono" style="margin-top:2px">THIS WEEK</div></div>
      </div>
      <div class="gl">${summary.reviews} reviews graded · ${summary.newWords} new words met · ${run}-day streak</div>
    </div>

    <div class="h"><span class="mono">WEEK</span></div>
    <div class="panel red">${weekStrip(cells, today)}</div>

    <div class="panel blue flush"><div class="grid2">
      <div><span class="lab">REVIEWS</span><div class="big">${summary.reviews}</div><div class="gl">graded this session</div></div>
      <div><span class="lab green">CORRECT</span><div class="big green">${summary.reviews ? pct(summary.right / summary.reviews) : 0}%</div><div class="gl">answered correctly</div></div>
      <div><span class="lab">KNOWN</span><div class="big">${st.known}</div><div class="gl">words known overall</div></div>
      <div><span class="lab">LEVEL</span><div class="big">${lvl.level}</div>
        <div class="gl">${lvl.toNext === null ? 'top level' : `${lvl.toNext} words to next`}</div></div>
    </div></div>` +

    (fresh.length ? `<div class="h"><span class="mono">NEW MILESTONE</span></div>
      <div class="panel gold">${fresh.map(b => `
        <div class="earned"><span class="dot"></span>
          <div><div style="font-size:14px;font-weight:600">${esc(b.en)}</div></div></div>`).join('')}</div>` : '') +

    `<div class="btns"><button class="btn primary" data-act="home">Close</button></div>`;
}
