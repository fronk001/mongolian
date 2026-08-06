/** Pure render functions — HTML strings. No state mutation here. */
import { fmtInterval } from '../core/fsrs.js';

export const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const pct = n => Math.round(n * 100);

/**
 * English gloss under a piece of Mongolian chrome.
 *
 * INSTRUMENT: "English sits under the Mongolian in mono grey at 10–11px."
 * Off by preference once the words stick — the interface stays Mongolian,
 * this is a crutch that can be removed.
 */
const gl = (en, on) => on ? `<div class="gl">${esc(en)}</div>` : '';

export function header(st, sub, en, gloss) {
  return `<div class="top">
    <div>
      <div class="mono">МОНГОЛ ХЭЛ · FSRS</div>
      <h1>${esc(sub || 'Өнөөдөр')}</h1>
      ${gl(en || 'today', gloss)}
      <div class="sub">${st.tracked} үг · ${st.due} давтах</div>
    </div>
    <div class="mono right">${new Date().toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'}).toUpperCase()}<br>
    RET ${pct(st.avgRetrievability)}%<br>ACC ${pct(st.accuracy)}%</div>
  </div>`;
}

export function progressRail(done, total) {
  const segs = Array.from({ length: total }, (_, i) =>
    `<i class="${i < done ? 'done' : i === done ? 'now' : ''}"></i>`).join('');
  return `<div class="sec"><div class="rail">${segs}</div>
    <div class="mono" style="margin-top:8px">${done} / ${total}</div></div>`;
}

export function statTriplet(st) {
  return `<div class="card"><div class="stats">
    <div><div class="mono">ДАВТАХ</div><div class="v">${st.due}</div></div>
    <div><div class="mono">ҮГ</div><div class="v">${st.tracked}</div></div>
    <div><div class="mono">ТОГТСОН</div><div class="v">${st.known}</div></div>
  </div></div>`;
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
  return `<div class="sec"><div class="card warn">
    <div class="wline">
      <div><div class="mn">Нөөц хуулбар аваарай</div>${gl('export a backup code', gloss)}</div>
      <div class="mono alert">${never ? 'NEVER' : age + 'D AGO'}</div>
    </div>
    <div class="note">Явц зөвхөн энэ төхөөрөмж дээр байна.
      ${gloss ? '<span class="gl inline-gl">progress lives only on this device</span>' : ''}
    </div>
  </div></div>`;
}

export function viewIntro(item, idx, total, gloss) {
  const w = item.word;
  return `<div class="sec">
    <div class="qhead"><span class="tag">Шинэ үг</span><span class="mono">NEW ${idx}/${total}</span></div>
    <div class="card">
      <div class="prompt">${esc(w.mn)}</div>
      <div class="subnote">${esc(w.en)}</div>
      <div class="mono" style="margin-top:14px">ҮГ #${w.id}</div>
    </div>
    <div class="btns"><button class="btn primary" data-act="next">Ойлголоо →${gl('got it', gloss)}</button></div>
  </div>`;
}

export function viewCard(item, ctx) {
  const { word } = item;
  const { revealed, previewIvls, r, dir, gloss } = ctx;
  const front = dir === 'mge' ? word.mn : word.en;
  const back  = dir === 'mge' ? word.en : word.mn;
  return `<div class="sec">
    <div class="qhead"><span class="tag">${dir === 'mge' ? 'MGL→ENG' : 'ENG→MGL'}</span>
      <span class="mono">CARD · ${item.isNew ? 'NEW' : 'REVIEW'}</span></div>
    <div class="card">
      <div class="prompt${dir === 'mge' ? '' : ' en'}">${esc(front)}</div>
      ${revealed ? `<div class="fb"><div class="ans">${esc(back)}</div></div>` : ''}
      ${!item.isNew ? retrievabilityMeter(r) : ''}
    </div>
    ${revealed
      ? gradeBar(previewIvls, undefined, gloss)
      : `<div class="btns"><button class="btn primary" data-act="reveal">Харах${gl('show answer', gloss)}</button></div>`}
  </div>`;
}

export function viewSentence(item, ctx) {
  const { fb, previewIvls, byId, gloss } = ctx;
  const s = item.sentence;
  const toMn = item.dir === 'egm';
  const prompt = toMn ? s.en : s.mn;
  return `<div class="sec">
    <div class="qhead"><span class="tag">${toMn ? 'ENG→MGL' : 'MGL→ENG'}</span>
      <span class="mono">i+${item.weak} · ${pct(item.comprehensible)}% KNOWN</span></div>
    <div class="card">
      <div class="prompt ${toMn ? 'en' : 'sm'}">${esc(prompt)}</div>
      ${s.note ? `<div class="subnote">${esc(s.note)}</div>` : ''}
      ${fb ? '' : `<textarea class="text" id="ansbox" rows="2" autocapitalize="off"
        autocorrect="off" spellcheck="false" placeholder="${toMn ? 'монголоор бич' : 'англиар бич'}"></textarea>`}
      ${fb ? `<div class="fb">
        <div class="verdict ${fb.ok ? 'ok' : 'no'}">${fb.ok ? 'ЗӨВ' : 'ЗӨРҮҮ'}${
          gloss ? `<span class="gl inline-gl">${fb.ok ? 'correct' : 'mismatch'}</span>` : ''}</div>
        <div class="ans diff">${fb.diff.map(t =>
          `<span class="${t.state === 'miss' ? 'miss' : 'hit'}"${t.state === 'near'
            ? ' style="opacity:.6"' : ''}>${esc(t.tok)}</span>`).join(' ')}</div>
        ${fb.given ? `<div class="yours">Таны хариу — ${esc(fb.given)}</div>` : ''}
        ${contextChips(s.ids, item.targetIds, byId)}
      </div>` : ''}
    </div>
    ${fb
      ? gradeBar(previewIvls, undefined, gloss)
      : `<div class="btns"><button class="btn primary" data-act="submit">Шалгах${gl('check', gloss)}</button></div>`}
  </div>`;
}

export function viewHome(st, diag, extra, ctx = {}) {
  const { gloss, exportAge } = ctx;
  const nothing = diag.dueCount + diag.newCount === 0;
  return header(st, 'Өнөөдөр', 'today', gloss) +
    backupNotice(exportAge === undefined ? null : exportAge, gloss) +
    `<div class="sec"><div class="h"><span class="mono">Явц</span><span class="mono">TELEMETRY</span></div>
    ${statTriplet(st)}</div>
    <div class="sec"><div class="h"><span class="mono">Хичээл</span><span class="mono">TODAY</span></div>
    <div class="card">
      <div class="wline"><div class="mn">Давтах</div><div class="en">due reviews</div><div class="mono">${diag.dueCount}</div></div>
      <div class="wline"><div class="mn">Шинэ үг</div><div class="en">new words</div><div class="mono">${diag.newCount}</div></div>
      <div class="wline"><div class="mn">Өгүүлбэр</div><div class="en">sentences</div><div class="mono">${diag.sentenceCount}</div></div>
      <div class="wline"><div class="mn">Ойлгомжтой</div><div class="en">comprehensible</div><div class="mono">${pct(diag.avgComprehensibility)}%</div></div>
    </div></div>
    <div class="btns"><button class="btn primary" data-act="start"${nothing ? ' disabled' : ''}>
      ${nothing ? 'Өнөөдөр давтах зүйл алга' : 'Эхлэх →'}${gl(nothing ? 'nothing due today' : 'start', gloss)}</button></div>` +
    (extra || '') +
    `<div class="foot"><span class="mono">INSTRUMENT v2</span><span class="mono">FSRS-6 · OFFLINE</span></div>`;
}

export function viewDone(session, st, gloss) {
  return header(st, 'Дууслаа', 'finished', gloss) +
    `<div class="sec"><div class="h"><span class="mono">Дүн</span><span class="mono">SESSION</span></div>
    ${statTriplet(st)}</div>
    <div class="btns"><button class="btn primary" data-act="home">Хаах${gl('close', gloss)}</button></div>`;
}
