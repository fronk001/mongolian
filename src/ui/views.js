/** Pure render functions — HTML strings. No state mutation here. */
import { fmtInterval } from '../core/fsrs.js';
import {
  weekCells, monthCells, weekTotals, monthTotals, punctuality, streak, bestStreak,
  intakeRate, projectDate, levelFor, lessonWorth, byBadgeId, BADGES
} from '../core/goals.js';

export const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const pct = n => Math.round(n * 100);

/**
 * English gloss under a piece of Mongolian chrome.
 *
 * INSTRUMENT: "English sits under the Mongolian in mono grey." Every piece of
 * Mongolian the interface shows carries one — buttons, section headers,
 * verdicts, labels. Switchable off from Хадгалалт once the chrome is familiar.
 */
const gl = (en, on) => on ? `<div class="gl">${esc(en)}</div>` : '';
/** Same, inline — for a gloss that sits beside its Mongolian rather than under it. */
const gli = (en, on) => on ? `<span class="gl inline-gl">${esc(en)}</span>` : '';

/**
 * "Correct, but you misspelt it."
 *
 * A slip is not a forgotten word, so it grades as correct — but silently
 * accepting it teaches the slip. The note names what was typed, what the
 * spelling should be, and why the grade bar is pointing at «Хэцүү».
 */
export function typoNote(fb, gloss) {
  if (!fb || !fb.typo) return '';
  return `<div style="margin-top:11px;padding-top:10px;border-top:1px solid var(--rule2)">
    <span class="lab red">БИЧГИЙН АЛДАА · SPELLING</span>
    <div class="spell">
      <div class="was">${esc(fb.given.trim())}</div>
      <div class="is"><span class="arrow">→</span>${esc(fb.matched)}</div>
    </div>
    ${gloss ? `<div class="gl raw">accepted — one letter out, so it is graded «Хэцүү», not «Сайн»</div>` : ''}
  </div>`;
}

/** Shown when the answer matched a listed alternative rather than the canonical form. */
function altNote(fb, gloss) {
  if (!fb || !fb.ok || !fb.alternative) return '';
  return gloss ? `<div class="gl">accepted alternative — the listed answer is different wording</div>` : '';
}

/** Monday-first, matching weekCells(). */
const WEEKDAYS = ['Да','Мя','Лх','Пү','Ба','Бя','Ня'];
const monthLabel = key => `${Number(key.slice(5,7))}-р сар`;
const dateLabel = key =>
  new Date(key + 'T00:00:00Z').toLocaleDateString('en-GB',
    { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();

export function header(st, sub, en, gloss) {
  return `<div class="top">
    <div>
      <div class="mono">МОНГОЛ ХЭЛ · FSRS</div>
      <h1>${esc(sub || 'Өнөөдөр')}</h1>
      ${gl(en || 'today', gloss)}
      <div class="sub">${st.tracked} үг · ${st.due} давтах</div>
      ${gl(`${st.tracked} words tracked · ${st.due} due`, gloss)}
    </div>
    <div class="mono right">${new Date().toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'}).toUpperCase()}<br>
    RET ${pct(st.avgRetrievability)}%<br>ACC ${pct(st.accuracy)}%</div>
  </div>`;
}

export function progressRail(done, total) {
  const segs = Array.from({ length: total }, (_, i) =>
    `<i class="${i < done ? 'done' : i === done ? 'now' : ''}"></i>`).join('');
  return `<div style="margin-top:12px"><div class="rail">${segs}</div>
    <div class="mono" style="margin-top:7px">${done} / ${total}</div></div>`;
}

export function retrievabilityMeter(r) {
  return `<div class="rmeter"><span class="mono">RECALL</span>
    <span class="track"><i class="${r < 0.6 ? 'low' : ''}" style="width:${pct(r)}%"></i></span>
    <span class="mono">${pct(r)}%</span></div>`;
}

const GRADE_LABELS = ['Дахин', 'Хэцүү', 'Сайн', 'Амархан'];
const GRADE_EN = ['again', 'hard', 'good', 'easy'];

export function gradeBar(previewIvls, selected, gloss) {
  return `<div class="gradebar">${GRADE_LABELS.map((l, i) => `
    <button class="grade${selected === i + 1 ? ' sel' : ''}" data-act="grade" data-g="${i + 1}">
      <div class="lbl">${l}</div>
      ${gloss ? `<div class="gl">${GRADE_EN[i]}</div>` : ''}
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
export function backupNotice(age, gloss) {
  if (age !== null && age < 14) return '';
  const never = age === null;
  return `<div class="panel red">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div><div class="mn" style="font-size:14px;font-weight:600">Нөөц хуулбар аваарай</div>
        ${gl('export a backup code', gloss)}</div>
      <div class="mono red">${never ? 'NEVER' : age + 'D AGO'}</div>
    </div>
    <div class="gl" style="margin-top:7px">progress lives only on this device — there is no sync</div>
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

function badgeRow(earned, gloss) {
  const has = new Set(earned);
  const won = BADGES.filter(b => has.has(b.id));
  const locked = BADGES.length - won.length;
  if (!won.length) {
    return `<div class="gl" style="margin-top:8px">no milestones yet — the first arrives when you finish a session</div>`;
  }
  return `<div class="badges">
      ${won.map(b => `<span class="badge" title="${esc(b.en)}">${esc(b.mn)}</span>`).join('')}
      ${locked ? `<span class="badge locked">+${locked}</span>` : ''}
    </div>
    ${gloss ? `<div class="gl" style="margin-top:8px">${won.map(b => b.en).join(' · ')}</div>` : ''}
    <div class="mono" style="margin-top:6px">${won.length} / ${BADGES.length} EARNED</div>`;
}

/**
 * The «why» band.
 *
 * Empty until Fred writes one — never a placeholder platitude. The whole
 * point is that it is his sentence, in his words, on the screen every day;
 * a default would make it wallpaper.
 */
function purposeBand(purpose, gloss, editing) {
  if (editing) {
    return `<div class="panel gold">
      <span class="lab">ЯАГААД · WHY</span>
      ${gl('one sentence — why this is worth the time', gloss)}
      <textarea class="text" id="purposebox" rows="2" maxlength="240"
        placeholder="…">${esc(purpose || '')}</textarea>
      <div class="inline" style="margin-top:10px">
        <button class="btn secondary" data-act="purpose-save">Хадгалах${gl('save', gloss)}</button>
        <button class="btn ghost" data-act="purpose-cancel">Болих${gl('cancel', gloss)}</button>
      </div>
    </div>`;
  }
  if (!purpose) {
    return `<div class="panel gold">
      <span class="lab">ЯАГААД · WHY</span>
      <div class="gl" style="margin-top:8px">why you are doing this — it shows here every day</div>
      <div class="btns"><button class="btn secondary" data-act="purpose">Зорилгоо бичих${gl('write your reason', gloss)}</button></div>
    </div>`;
  }
  return `<div class="panel gold">
    <span class="lab">ЯАГААД · WHY</span>
    <div style="font-size:14.5px;font-weight:500;line-height:1.5;margin-top:8px">${esc(purpose)}</div>
    <div style="display:flex;justify-content:flex-end;margin-top:8px">
      <button class="btn ghost slim" data-act="purpose">Засах${gl('edit', gloss)}</button></div>
  </div>`;
}

export function viewDash(p, st, session, extra, ctx = {}) {
  const { gloss, exportAge, today, editPurpose } = ctx;
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

  return header(st, 'Өнөөдөр', 'today', gloss) +
    backupNotice(exportAge === undefined ? null : exportAge, gloss) +
    purposeBand(p.purpose, gloss, editPurpose) +

    // ---- the week: the period one lesson can actually move ----------
    `<div class="h"><span class="mono">Энэ долоо хоног</span><span class="mono">THIS WEEK</span></div>
    <div class="panel red">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="big">${doneThisWeek}<span class="u"> / 7 хоног</span></div>
        <span class="lab red">ЦУВАА ${run}</span>
      </div>
      ${gloss ? `<div class="gl">${doneThisWeek} of 7 days · ${run}-day streak${best > run ? ` · best ${best}` : ''}</div>` : ''}
      ${weekStrip(cells, today)}
    </div>

    <div class="goldband">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="mono">ЭНЭ ХИЧЭЭЛ · THIS LESSON</div>
          <div class="big" style="margin-top:5px">${worth.items}<span class="u"> зүйл</span></div></div>
        <div style="text-align:right">
          <div class="big" style="font-size:26px">${worth.weekShare ? '+1' : '✓'}</div>
          <div class="mono" style="margin-top:2px">${worth.weekShare ? 'DAY OF 7' : 'DONE TODAY'}</div></div>
      </div>
      <div class="gl">${worth.newWords} new · ${worth.reviews} due · ~${worth.minutes} min estimated</div>
    </div>

    <div class="panel red rows">
      <div class="wline"><span class="mn">Давтах</span><span class="en">due reviews</span><span class="n">${diag.dueCount}</span></div>
      <div class="wline"><span class="mn">Шинэ үг</span><span class="en">new words</span><span class="n">${diag.newCount}</span></div>
      <div class="wline"><span class="mn">Өгүүлбэр</span><span class="en">sentences</span><span class="n">${diag.sentenceCount}</span></div>
      <div class="wline"><span class="mn">Ойлгомжтой</span><span class="en">comprehensible</span><span class="n">${pct(diag.avgComprehensibility)}%</span></div>
    </div>

    <div class="btns"><button class="btn primary" data-act="start"${nothing ? ' disabled' : ''}>
      ${nothing ? 'Өнөөдөр давтах зүйл алга' : 'Эхлэх →'}${
        gl(nothing ? 'nothing due today' : `start · ${worth.items} items · ~${worth.minutes} min`, gloss)}</button></div>

    <!-- ---- below: what the work has already produced ---------------- -->
    <div class="h"><span class="mono">Долоо хоногийн дүн</span><span class="mono">WEEK SO FAR</span></div>
    <div class="panel blue flush"><div class="grid2">
      <div><span class="lab">ДАВТАЛТ</span><div class="big">${wt.reviews}</div><div class="gl">reviews landed</div></div>
      <div><span class="lab">ШИНЭ ҮГ</span><div class="big">${wt.newWords}</div><div class="gl">new words met</div></div>
      <div><span class="lab">ТОГТСОН</span><div class="big blue">${wt.knownGain === null ? '—' : '+' + wt.knownGain}</div>
        <div class="gl">${wt.knownGain === null ? 'not measured yet' : 'crossed into known'}</div></div>
      <div><span class="lab">ЦАГТАА</span><div class="big">${onTime === null ? '—' : pct(onTime) + '%'}</div>
        <div class="gl">${onTime === null ? 'no reviews yet' : 'reviews on time'}</div></div>
    </div></div>

    <div class="h"><span class="mono">${monthLabel(today)}</span><span class="mono">MONTH · ${mt.days}/${monthCells(history, today).filter(c => c.day).length}</span></div>
    <div class="panel">
      ${monthGrid(monthCells(history, today))}
      ${gloss ? `<div class="gl" style="margin-top:9px">each square is a day you finished a session · ${mt.reviews} reviews this month</div>` : ''}
    </div>

    <div class="h"><span class="mono">Түвшин</span><span class="mono">LEVEL</span></div>
    <div class="panel gold">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="big">${lvl.level}<span class="u"> түвшин</span></div>
        <span class="lab">${p.xp || 0} XP</span>
      </div>
      <div class="meter gold"><i style="width:${Math.max(2, pct(lvl.share))}%"></i></div>
      <div class="gl">${lvl.toNext === null
        ? 'top level — the goal itself'
        : `${lvl.toNext} more known words to level ${lvl.level + 1} · xp comes from reviews graded`}</div>
      ${badgeRow(p.badges || [], gloss)}
    </div>

    <div class="h"><span class="mono">Зорилго</span><span class="mono">GOAL</span></div>
    <div class="panel blue">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div class="big">${st.known}<span class="u"> / ${goal.toLocaleString('en-GB')} үг</span></div>
        <span class="lab blue">B1 · ${(st.known / goal * 100).toFixed(1)}%</span>
      </div>
      <div class="meter gold"><i style="width:${Math.max(0.6, st.known / goal * 100)}%"></i></div>
      <div class="wline" style="margin-top:6px">
        <span class="mn" style="font-size:13px">${rate === null ? '—' : (rate >= 0 ? '+' : '') + rate.toFixed(1) + ' үг'}</span>
        <span class="en">${rate === null ? 'rate needs two days of history' : 'known words per day, last 14d'}</span></div>
      <div class="wline">
        <span class="mn" style="font-size:13px">${eta ? dateLabel(eta) : '—'}</span>
        <span class="en">${eta ? 'projected at this rate' : 'no projection at this rate'}</span></div>
      <div class="gl" style="margin-top:8px">known = fsrs stability ≥ 21d · b1 target is a research estimate, not a cefr spec</div>
      <div class="mono red" style="margin-top:7px">CORPUS CEILING · ${ctx.corpusWords || 0} WORDS WRITTEN</div>
    </div>` +
    (extra || '') +
    `<div class="foot"><span class="mono">INSTRUMENT v3 · СОЁМБО</span><span class="mono">FSRS-6 · OFFLINE</span></div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Flashcard deck — how new words arrive.

   Was a static panel with the word and its translation already showing,
   and one «Ойлголоо» button. Nothing was asked of the learner, so nothing
   was retrieved. Now the Mongolian faces up, the English is behind a flip,
   and each card ends in a decision that actually routes the word.
   ══════════════════════════════════════════════════════════════════════ */

export function viewDeck(item, ctx) {
  const { deckI, flipped, gloss } = ctx;
  const words = item.words;
  const w = words[deckI];
  const dots = words.map((_, i) =>
    `<i class="${i < deckI ? 'done' : i === deckI ? 'now' : ''}"></i>`).join('');

  return `<div class="sec">
    <div class="qhead"><span class="tag red">Шинэ үг</span>
      <span class="mono">NEW ${deckI + 1}/${words.length}</span></div>
    ${gloss ? '<div class="gl">new words — tap the card to turn it over</div>' : ''}
    <div class="deckdots" style="grid-template-columns:repeat(${words.length},1fr)">${dots}</div>

    <div class="deckpanel" data-act="flip">
      ${flipped
        ? `<div class="face en">${esc(w.en)}</div>
           <div class="gl">${esc(w.mn)}</div>
           <div class="flip"><span class="lab">ҮГ #${w.id}</span></div>`
        : `<div class="face">${esc(w.mn)}</div>
           <div class="flip"><span class="lab red">ЭРГҮҮЛЭХ · TAP TO FLIP</span></div>`}
    </div>

    <div class="btns">
      <button class="btn primary" data-act="deck-learn">Сурах${gl('learn it — queue for review', gloss)}</button>
      <button class="btn secondary" data-act="deck-known">Мэдэж байна${gl('i know this — schedule it further out', gloss)}</button>
    </div>
    ${deckI > 0 ? `<div class="inline" style="margin-top:8px">
      <button class="btn ghost slim" data-act="deck-back">← Буцах${gl('back', gloss)}</button></div>` : ''}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Word card — multiple choice, or typed when mcMode is off.
   ══════════════════════════════════════════════════════════════════════ */

export function viewCard(item, ctx) {
  const { word } = item;
  const { fb, previewIvls, r, dir, gloss, choices, picked, mcMode } = ctx;
  const front = dir === 'mge' ? word.mn : word.en;
  const back  = dir === 'mge' ? word.en : word.mn;
  const answered = picked !== null && picked !== undefined;
  const useMC = mcMode && choices && choices.usable;

  const head = `<div class="qhead">
      <span class="tag">${dir === 'mge' ? 'MGL → ENG' : 'ENG → MGL'}</span>
      <span class="mono">CARD · ${item.isNew ? 'NEW' : 'REVIEW'}</span></div>`;

  const prompt = `<div class="panel red">
      <span class="lab">АСУУЛТ · PROMPT</span>
      <div class="prompt${dir === 'mge' ? '' : ' en'}" style="margin-top:9px">${esc(front)}</div>
      ${!item.isNew ? retrievabilityMeter(r) : ''}
    </div>`;

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
      ${answered ? `<div class="panel ${correct ? 'blue' : 'red'} reveal">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <span class="lab ${correct ? 'blue' : 'red'}">${correct ? 'ЗӨВ · CORRECT' : 'БУРУУ · WRONG'}</span>
            <div style="font-size:15px;font-weight:500;margin-top:7px">${esc(word.mn)} — ${esc(word.en)}</div>
          </div>
          <div style="text-align:right;flex:none">
            <div class="mono">NEXT</div>
            <div class="mono n" style="font-size:13px;color:var(--ink);margin-top:3px">${ivl}</div>
          </div>
        </div>
        ${gloss ? `<div class="gl raw">${correct ? 'counted as «Сайн»' : 'counted as «Дахин»'} — back in ${ivl}</div>` : ''}
      </div>` : ''}
      ${answered
        ? `<div class="btns">
             <button class="btn primary" data-act="card-next" data-g="${correct ? 3 : 1}">Үргэлжлүүлэх${gl('continue', gloss)}</button>
             ${correct ? `<button class="btn ghost slim" data-act="card-next" data-g="4">Амархан байсан${gl('that was easy — wait longer before asking again', gloss)}</button>` : ''}
           </div>`
        : `<div class="btns"><button class="btn ghost" data-act="mc-off">Бичиж хариулах${gl('type the answer instead — harder', gloss)}</button></div>`}
    </div>`;
  }

  /* Multiple choice off: type the answer. Harder than picking from four and
     harder than reveal-and-self-rate, because nothing is on screen to
     recognise — the same production demand the sentences make. Graded by the
     same lenient-on-spelling comparison, so a Cyrillic typo is not a lapse. */
  const toMn = dir === 'egm';
  return `<div class="sec">${head}${prompt}
    ${fb
      ? `<div class="panel ${fb.ok ? 'blue' : 'red'} reveal">
           <span class="lab ${fb.ok ? 'blue' : 'red'}">${fb.ok ? 'ЗӨВ · CORRECT' : 'ЗӨРҮҮ · MISMATCH'}</span>
           <div class="fb" style="margin-top:0;border-top:0;padding-top:8px">
             <div class="ans">${esc(back)}</div>
             ${fb.given ? `<div class="yours">Таны хариу — ${esc(fb.given)}${gli('your answer', gloss)}</div>`
               : gloss ? '<div class="gl">nothing typed</div>' : ''}
             ${fb.close && !fb.ok ? `<div class="gl">close — check the spelling</div>` : ''}
           </div>
           ${typoNote(fb, gloss)}
         </div>
         <div class="h"><span class="mono">Дараагийн давталт</span><span class="mono">NEXT REVIEW</span></div>
         ${gradeBar(previewIvls, fb.ok ? (fb.typo ? 2 : undefined) : 1, gloss)}`
      : `<textarea class="text" id="ansbox" rows="1" autocapitalize="off" autocorrect="off"
           spellcheck="false" placeholder="${toMn ? 'монголоор бич' : 'англиар бич'}"></textarea>
         ${gloss ? `<div class="gl">${toMn ? 'write it in mongolian' : 'write it in english'}</div>` : ''}
         <div class="btns">
           <button class="btn primary" data-act="check-word">Шалгах${gl('check', gloss)}</button>
           ${choices && choices.usable
             ? `<button class="btn ghost" data-act="mc-on">Сонголтоор${gl('use multiple choice instead — easier', gloss)}</button>` : ''}
         </div>`}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Sentence — always typed. Picking a translation from four teaches
   recognition, and production is the thing that fails in conversation.
   ══════════════════════════════════════════════════════════════════════ */

export function viewSentence(item, ctx) {
  const { fb, previewIvls, byId, gloss } = ctx;
  const s = item.sentence;
  const toMn = item.dir === 'egm';
  const prompt = toMn ? s.en : s.mn;
  return `<div class="sec">
    <div class="qhead"><span class="tag">${toMn ? 'ENG → MGL' : 'MGL → ENG'}</span>
      <span class="mono">i+${item.weak} · ${pct(item.comprehensible)}% KNOWN</span></div>
    <div class="panel red">
      <span class="lab">ОРЧУУЛ · TRANSLATE</span>
      <div class="prompt ${toMn ? 'en' : 'sm'}" style="margin-top:9px">${esc(prompt)}</div>
      ${s.note ? `<div class="subnote">${esc(s.note)}</div>` : ''}
      ${fb ? '' : `<textarea class="text" id="ansbox" rows="2" autocapitalize="off"
        autocorrect="off" spellcheck="false"
        placeholder="${toMn ? 'монголоор бич' : 'англиар бич'}"></textarea>`}
      ${fb ? '' : gloss ? `<div class="gl">${toMn ? 'write it in mongolian' : 'write it in english'}</div>` : ''}
    </div>
    ${fb ? `<div class="panel ${fb.ok ? 'blue' : 'red'} reveal">
        <span class="lab ${fb.ok ? 'blue' : 'red'}">${fb.ok ? 'ЗӨВ · CORRECT' : 'ЗӨРҮҮ · MISMATCH'}</span>
        <div class="fb" style="margin-top:0;border-top:0;padding-top:8px">
          <div class="ans diff">${fb.diff.map(t =>
            `<span class="${t.state === 'miss' ? 'miss' : t.state === 'near' ? 'near' : 'hit'}">${esc(t.tok)}</span>`).join(' ')}</div>
          ${altNote(fb, gloss)}
          ${fb.given ? `<div class="yours">Таны хариу — ${esc(fb.given)}${gli('your answer', gloss)}</div>` : ''}
          ${contextChips(s.ids, item.targetIds, byId)}
          ${gloss ? '<div class="gl">chips outlined blue are what this sentence is teaching</div>' : ''}
        </div>
        ${typoNote(fb, gloss)}
      </div>
      <div class="h"><span class="mono">Дараагийн давталт</span><span class="mono">NEXT REVIEW</span></div>
      ${gradeBar(previewIvls, fb.ok ? (fb.typo ? 2 : undefined) : 1, gloss)}`
      : `<div class="btns"><button class="btn primary" data-act="submit">Шалгах${gl('check', gloss)}</button></div>`}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   Session close.
   ══════════════════════════════════════════════════════════════════════ */

export function viewDone(summary, st, p, ctx = {}) {
  const { gloss, today } = ctx;
  const history = p.history || [];
  const cells = weekCells(history, today);
  const doneThisWeek = cells.filter(c => c.state === 'done').length;
  const run = streak(history, today);
  const lvl = levelFor(st.known);
  const fresh = (summary.newBadges || []).map(id => byBadgeId[id]).filter(Boolean);

  return header(st, 'Дууслаа', 'finished', gloss) +
    `<div class="goldband">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="mono">ӨНӨӨДӨР · TODAY</div>
          <div class="big" style="margin-top:5px">+${summary.xp}<span class="u"> XP</span></div></div>
        <div style="text-align:right"><div class="big" style="font-size:26px">${doneThisWeek}/7</div>
          <div class="mono" style="margin-top:2px">THIS WEEK</div></div>
      </div>
      <div class="gl">${summary.reviews} reviews graded · ${summary.newWords} new words met · ${run}-day streak</div>
    </div>

    <div class="h"><span class="mono">Долоо хоног</span><span class="mono">WEEK</span></div>
    <div class="panel red">${weekStrip(cells, today)}</div>

    <div class="panel blue flush"><div class="grid2">
      <div><span class="lab">ДАВТАЛТ</span><div class="big">${summary.reviews}</div><div class="gl">graded this session</div></div>
      <div><span class="lab">ЗӨВ</span><div class="big blue">${summary.reviews ? pct(summary.right / summary.reviews) : 0}%</div><div class="gl">answered correctly</div></div>
      <div><span class="lab">ТОГТСОН</span><div class="big">${st.known}</div><div class="gl">words known overall</div></div>
      <div><span class="lab">ТҮВШИН</span><div class="big">${lvl.level}</div>
        <div class="gl">${lvl.toNext === null ? 'top level' : `${lvl.toNext} words to next`}</div></div>
    </div></div>` +

    (fresh.length ? `<div class="h"><span class="mono">Шинэ тэмдэг</span><span class="mono">NEW MILESTONE</span></div>
      <div class="panel gold">${fresh.map(b => `
        <div class="earned"><span class="dot"></span>
          <div><div style="font-size:14px;font-weight:600">${esc(b.mn)}</div>
            ${gl(b.en, gloss)}</div></div>`).join('')}</div>` : '') +

    `<div class="btns"><button class="btn primary" data-act="home">Хаах${gl('close', gloss)}</button></div>`;
}
