/** Controller: session flow, event wiring, persistence. */
import { makeFSRS, dayKey, daysBetween } from '../core/fsrs.js';
import { load, save, stats, encodeCode, importCode, exportAge } from '../core/progress.js';
import { buildSession, applyGrade } from '../core/scheduler.js';
import { gradeText, diffTokens } from '../core/grade.js';
import * as V from './views.js';

const el = document.getElementById('app');
let WORDS = [], SENTENCES = [], BYID = {};
let P = load();
let S = { screen: 'home', session: null, i: 0, revealed: false, fb: null, tools: false, msg: '' };

const fsrs = () => makeFSRS(undefined, P.desiredRetention);

function current() { return S.session?.items[S.i]; }

function elapsedFor(id) {
  const it = P.items[id];
  return it ? Math.max(0, daysBetween(it.last || dayKey(), dayKey())) : 0;
}
function retrievabilityFor(id) {
  const it = P.items[id];
  return it ? fsrs().retrievability(elapsedFor(id), it.s) : 0;
}
function previewFor(id) {
  return fsrs().preview(P.items[id], elapsedFor(id));
}

function todaySession() {
  return buildSession(P, WORDS, SENTENCES);
}

function render() {
  const st = stats(P, { words: WORDS });
  const gloss = P.gloss !== false;
  if (S.screen === 'home') {
    const s = todaySession();
    el.innerHTML = V.viewHome(st, s.diagnostics, toolsPanel(),
      { gloss, exportAge: exportAge(P) });
  } else if (S.screen === 'done') {
    el.innerHTML = V.viewDone(S.session, st, gloss);
  } else {
    const item = current();
    if (!item) { finish(); return; }
    const total = S.session.items.length;
    let body;
    if (item.kind === 'intro') {
      body = V.viewIntro(item, S.i + 1, total, gloss);
    } else if (item.kind === 'card') {
      body = V.viewCard(item, {
        revealed: S.revealed,
        previewIvls: previewFor(item.word.id),
        r: retrievabilityFor(item.word.id),
        dir: item.isNew ? 'mge' : (S.i % 2 ? 'egm' : 'mge'),
        gloss
      });
    } else {
      body = V.viewSentence(item, {
        fb: S.fb,
        previewIvls: previewFor(item.targetIds[0]),
        byId: BYID,
        gloss
      });
    }
    el.innerHTML = V.header(st, 'Хичээл', 'lesson', gloss) + V.progressRail(S.i, total) + body;
  }
  window.scrollTo(0, 0);
  const box = document.getElementById('ansbox');
  if (box && !('ontouchstart' in window)) box.focus();
}

function toolsPanel() {
  const gloss = P.gloss !== false;
  const g = en => gloss ? `<div class="gl">${V.esc(en)}</div>` : '';
  if (!S.tools) return `<div class="btns" style="margin-top:20px">
    <button class="btn ghost" data-act="tools">Хадгалалт ▾${g('backup')}</button></div>`;

  const age = exportAge(P);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  return `<div class="sec" style="margin-top:20px">
    <div class="h"><span class="mono">Хадгалалт</span><span class="mono">BACKUP CODE</span></div>
    <div class="card">
      <div class="wline">
        <div><div class="mn">Сүүлд хадгалсан</div>${g('last export')}</div>
        <div class="mono${age === null || age >= 14 ? ' alert' : ''}">${
          age === null ? 'NEVER' : age === 0 ? 'TODAY' : age + 'D AGO'}</div>
      </div>
      <div class="mono" style="margin-top:16px">EXPORT</div>
      <textarea class="code" id="outcode" readonly>${V.esc(encodeCode(P))}</textarea>
      <div class="inline" style="margin-top:8px">
        <button class="btn secondary" data-act="copy">Хуулах${g('copy')}</button>
        ${canShare ? `<button class="btn secondary" data-act="share">Илгээх${g('share')}</button>` : ''}
      </div>
      <div class="mono" style="margin-top:16px">IMPORT</div>
      <textarea class="code" id="incode" placeholder="paste code (v1 or v2)"></textarea>
      ${S.msg ? `<div class="mono" style="margin-top:8px;color:${S.msg[0] === '!' ? 'var(--alert)' : 'var(--signal)'}">${V.esc(S.msg.replace(/^!/, ''))}</div>` : ''}
      <div class="inline" style="margin-top:12px">
        <button class="btn secondary" data-act="import">Оруулах${g('import')}</button>
        <button class="btn ghost" data-act="tools">Хаах${g('close')}</button>
      </div>
      <div class="wline" style="margin-top:16px">
        <div><div class="mn">Англи орчуулга</div>${g('english gloss')}</div>
        <button class="btn ghost slim" data-act="gloss">${gloss ? 'Асаалттай' : 'Унтраалттай'}</button>
      </div>
    </div></div>`;
}

/** Record that a code actually left the device. Only called on success. */
function markExported() {
  P.lastExport = dayKey();
  save(P);
}

async function copyCode() {
  const code = encodeCode(P);
  try {
    await navigator.clipboard.writeText(code);
  } catch (e) {
    // Safari refuses clipboard writes outside a trusted gesture in some
    // versions; fall back to selecting the field so the OS menu can copy.
    const box = document.getElementById('outcode');
    if (!box) return false;
    box.removeAttribute('readonly');
    box.select(); box.setSelectionRange(0, code.length);
    const ok = document.execCommand && document.execCommand('copy');
    box.setAttribute('readonly', '');
    if (!ok) return false;
  }
  return true;
}

function advance() {
  S.revealed = false; S.fb = null;
  S.i++;
  if (S.i >= S.session.items.length) finish(); else render();
}

function finish() {
  P.lastDate = dayKey();
  const st = stats(P, { words: WORDS });
  P.history = (P.history || []).concat([{ date: dayKey(), tracked: st.tracked, due: st.due }]);
  save(P);
  S.screen = 'done';
  render();
}

function grade(g) {
  const item = current();
  const ids = item.kind === 'sentence' ? item.targetIds : [item.word.id];
  ids.forEach(id => applyGrade(P, id, g));
  save(P);
  advance();
}

document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
  if (!t || t.disabled) return;
  const act = t.getAttribute('data-act');
  if (act === 'start') { S.session = todaySession(); S.i = 0; S.screen = 'run'; S.revealed = false; S.fb = null; render(); }
  else if (act === 'home') { S.screen = 'home'; S.session = null; render(); }
  else if (act === 'reveal') { S.revealed = true; render(); }
  else if (act === 'next') advance();
  else if (act === 'grade') grade(parseInt(t.getAttribute('data-g'), 10));
  else if (act === 'submit') {
    const item = current();
    const s = item.sentence;
    const target = item.dir === 'egm' ? s.mn : s.en;
    const box = document.getElementById('ansbox');
    const given = box ? box.value : '';
    const g = gradeText(given, target, Math.max(0, P.strictness - 0.15));
    S.fb = { ok: g.ok, close: g.close, given, diff: diffTokens(given, target) };
    render();
  }
  else if (act === 'tools') { S.tools = !S.tools; S.msg = ''; render(); }
  else if (act === 'gloss') { P.gloss = !(P.gloss !== false); save(P); render(); }
  else if (act === 'copy') {
    copyCode().then(ok => {
      if (ok) markExported();
      S.msg = ok ? 'Хуулсан' : '!Хуулж чадсангүй';
      render();
    });
  }
  else if (act === 'share') {
    // iOS share sheet: the only one-tap route off the device, and it never
    // touches the network — the OS hands the text to whatever app is picked.
    navigator.share({ title: 'Монгол хэл — нөөц код', text: encodeCode(P) })
      .then(() => { markExported(); S.msg = 'Илгээсэн'; render(); })
      .catch(err => {
        // Dismissing the sheet is not a failure, and must not claim a backup.
        if (err && err.name === 'AbortError') return;
        S.msg = '!Илгээж чадсангүй';
        render();
      });
  }
  else if (act === 'import') {
    const box = document.getElementById('incode');
    const next = importCode(box ? box.value : '');
    if (next) { P = next; save(P); S.msg = 'Амжилттай' + (next.migratedFrom ? ' (v1 → v2)' : ''); }
    else S.msg = '!Код буруу байна';
    render();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const sub = document.querySelector('[data-act="submit"]');
    const rev = document.querySelector('[data-act="reveal"]');
    const nxt = document.querySelector('[data-act="next"]');
    if (sub) { e.preventDefault(); sub.click(); }
    else if (rev) { e.preventDefault(); rev.click(); }
    else if (nxt) { e.preventDefault(); nxt.click(); }
  }
  if (/^[1-4]$/.test(e.key)) {
    const g = document.querySelector(`[data-act="grade"][data-g="${e.key}"]`);
    if (g) g.click();
  }
});

/** Ask the browser to exempt our storage from eviction. */
async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (e) { /* non-fatal */ }
}

async function boot() {
  const [w, s] = await Promise.all([
    fetch('./data/words.json').then(r => r.json()),
    fetch('./data/sentences.json').then(r => r.json())
  ]);
  WORDS = w; SENTENCES = s;
  BYID = Object.fromEntries(WORDS.map(x => [x.id, x]));
  requestPersistence();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  render();
}
boot();
