"""
Build a review sheet for Luna or Sarnai, and apply what comes back.

    py tools/review-sheet.py             # write tools/review.html
    py tools/review-sheet.py --apply luna-review.json

The sheet is one self-contained HTML file. It needs no server, no install and
no account: Fred sends it, she opens it by double-clicking, works through it in
a browser, and presses Дуусгах to get a file back. Progress is saved in the
browser as she goes, so it can be done over several sittings.

What it asks her, and what it deliberately does not:

  * **Mongolian alternatives** — the machine-derived phrasings in
    `sentences.json`. Each is grounded in a grammar rule, but a rule firing in
    a context where nobody would say it is exactly what a native speaker
    catches and a script cannot.
  * **Unreviewed lexicon entries** — machine-written glosses awaiting sign-off.
  * **Badge names** — machine-written Mongolian, unchecked.
  * **Not the English alternatives.** She is a Mongolian tutor; the English is
    the part that does not need her, and asking would quadruple the work for
    nothing.

The most valuable thing she can do is not approving what is there — it is the
"add your own" box under each sentence. A phrasing Fred would actually hear is
worth more than a rule-derived one that is merely legal.
"""
import json
import re
import sys
from pathlib import Path

SRC = Path("src/data")
OUT = Path("tools/review.html")

BADGE_RE = re.compile(
    r"\{\s*id:\s*'(?P<id>[^']+)',\s*mn:\s*'(?P<mn>[^']+)',\s*en:\s*'(?P<en>[^']+)'"
)


def load_badges():
    src = Path("src/core/goals.js").read_text(encoding="utf-8")
    return [m.groupdict() for m in BADGE_RE.finditer(src)]


def collect():
    sentences = json.loads((SRC / "sentences.json").read_text(encoding="utf-8"))
    words = json.loads((SRC / "words.json").read_text(encoding="utf-8"))

    items = [
        {"mn": s["mn"], "en": s["en"], "alts": (s.get("alt") or {}).get("mn") or []}
        for s in sentences if (s.get("alt") or {}).get("mn")
    ]
    lexicon = [
        {"id": w["id"], "mn": w["mn"], "en": w["en"],
         "drill": w.get("drill") is not False}
        for w in words if w.get("reviewed") is False
    ]
    return {"sentences": items, "lexicon": lexicon, "badges": load_badges()}


# --------------------------------------------------------------------- sheet

SHEET = r"""<!doctype html>
<meta charset="utf-8">
<title>Монгол хэл — хянан засварлах хуудас</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{
--paper:#F4F2ED;--panel:#fff;--ink:#14161A;--muted:#5A6068;
--red:#C4272F;--blue:#015197;--gold:#F9CF02;
--rule:rgba(20,22,26,.13);--rule2:rgba(20,22,26,.07);
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{background:var(--paper);color:var(--ink);font-weight:400;line-height:1.5;
font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
padding:0 0 110px;-webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:22px 18px}
h1{font-size:23px;font-weight:700;letter-spacing:-.02em}
h2{font-size:17px;font-weight:700;margin-top:36px;padding-bottom:8px;border-bottom:2px solid var(--ink)}
.en{color:var(--muted);font-size:13.5px}
.intro{background:var(--panel);border:1px solid var(--rule);border-left:4px solid var(--gold);
border-radius:4px;padding:15px 16px;margin-top:16px}
.intro p{margin-top:9px;font-size:14.5px}
.intro p:first-child{margin-top:0}
.item{background:var(--panel);border:1px solid var(--rule);border-left:3px solid var(--rule);
border-radius:4px;padding:14px 15px;margin-top:12px}
.item.done{border-left-color:var(--blue)}
.q{font-size:19px;font-weight:600;letter-spacing:-.01em}
.q .gloss{display:block;font-size:13.5px;font-weight:400;color:var(--muted);margin-top:3px}
.alt{border-top:1px solid var(--rule2);margin-top:12px;padding-top:12px}
.alt .txt{font-size:18px;font-weight:500}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px;align-items:center}
button.pick{font:inherit;font-size:14px;font-weight:600;padding:8px 14px;border-radius:4px;
border:1px solid var(--rule);background:var(--panel);color:var(--ink);cursor:pointer;text-align:center}
button.pick small{display:block;font-size:11px;font-weight:400;color:var(--muted);margin-top:1px}
button.pick[aria-pressed="true"].yes{background:var(--blue);border-color:var(--blue);color:#fff}
button.pick[aria-pressed="true"].no{background:var(--red);border-color:var(--red);color:#fff}
button.pick[aria-pressed="true"].idk{background:var(--ink);border-color:var(--ink);color:#fff}
button.pick[aria-pressed="true"] small{color:rgba(255,255,255,.8)}
input.free{font:inherit;font-size:16px;width:100%;padding:10px 12px;border:1px solid var(--rule);
border-radius:4px;background:#FAF9F6;color:var(--ink);margin-top:8px}
input.free:focus{outline:none;border-color:var(--blue)}
.addlab{font-size:13px;color:var(--muted);margin-top:14px;padding-top:12px;border-top:1px dashed var(--rule)}
.tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
border:1px solid var(--rule);border-radius:3px;padding:2px 7px;color:var(--muted);margin-left:8px}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--panel);border-top:1px solid var(--rule);
padding:11px 18px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;
box-shadow:0 -1px 6px rgba(20,22,26,.06)}
.bar .count{font-size:14px;font-weight:700}
.bar .track{flex:1;max-width:240px;height:6px;background:var(--rule);border-radius:3px;overflow:hidden}
.bar .track i{display:block;height:100%;background:var(--blue);width:0;transition:width .2s}
button.finish{font:inherit;font-size:15px;font-weight:700;padding:11px 20px;border:0;border-radius:4px;
background:var(--red);color:#fff;cursor:pointer}
button.ghost{font:inherit;font-size:13px;padding:9px 13px;border:1px solid var(--rule);
border-radius:4px;background:var(--panel);color:var(--muted);cursor:pointer}
.saved{font-size:12.5px;color:var(--muted)}
@media print{.bar{display:none}}
</style>

<div class="wrap">
<h1>Монгол хэл — хянан засварлах</h1>
<div class="en">Mongolian study app — review sheet</div>

<div class="intro">
  <p><b>Юу хийх вэ?</b> Доор компьютерийн зохиосон монгол хувилбарууд байна.
     Тус бүрд нь <b>Зөв</b>, <b>Буруу</b> эсвэл <b>Мэдэхгүй</b> гэж хариулна уу.</p>
  <p class="en"><b>What to do.</b> Below are Mongolian phrasings a script generated from grammar
     rules. For each one, mark whether a Mongolian speaker would really say it:
     <b>Зөв</b> (correct), <b>Буруу</b> (wrong), or <b>Мэдэхгүй</b> (not sure).</p>
  <p class="en"><b>The most useful box is the last one.</b> Under each sentence there is a field to
     add a phrasing of your own. A sentence Fred would actually hear is worth more than a
     rule-derived one that is merely grammatical — please add them freely.</p>
  <p class="en"><b>You can stop any time.</b> Your answers are saved in this browser, so you can
     close the page and come back later. When you are finished, press <b>Дуусгах</b> at the
     bottom and send Fred the file it produces. Nothing is uploaded anywhere.</p>
</div>

<h2>1. Өгүүлбэрийн хувилбар <span class="en">— sentence alternatives</span></h2>
<div id="sentences"></div>

<h2>2. Шинэ үг <span class="en">— new dictionary entries</span></h2>
<div class="en" style="margin-top:8px">Is the English meaning right for this Mongolian word?
  If not, mark it wrong and write the correct meaning.</div>
<div id="lexicon"></div>

<h2>3. Тэмдэгийн нэр <span class="en">— badge names</span></h2>
<div class="en" style="margin-top:8px">Short labels shown when Fred reaches a milestone.
  The English says what each is meant to mean.</div>
<div id="badges"></div>
</div>

<div class="bar">
  <span class="count"><span id="n">0</span> / <span id="tot">__TOTAL__</span></span>
  <span class="track"><i id="fill"></i></span>
  <span class="saved" id="saved"></span>
  <button class="ghost" id="clear">Арилгах</button>
  <button class="finish" id="finish">Дуусгах — файл авах</button>
</div>

<script>
const DATA = __DATA__;
const TOTAL = __TOTAL__;
const KEY = 'mng_review_v1';

let state = { alts:{}, added:{}, lexicon:{}, badges:{} };
try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
for (const k of ['alts','added','lexicon','badges']) state[k] = state[k] || {};

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const PICKS = [['yes','Зөв','correct'],['no','Буруу','wrong'],['idk','Мэдэхгүй','not sure']];

function picker(group, key, current) {
  return '<div class="row">' + PICKS.map(([v, mn, en]) =>
    `<button class="pick ${v}" data-group="${esc(group)}" data-key="${esc(key)}" data-v="${v}"
      aria-pressed="${current === v}">${mn}<small>${en}</small></button>`).join('') + '</div>';
}

function render() {
  document.getElementById('sentences').innerHTML = DATA.sentences.map((s, i) => {
    const v = state.alts[s.mn] || {};
    const done = s.alts.every(a => v[a]);
    return `<div class="item ${done ? 'done' : ''}" data-s="${i}">
      <div class="q">${esc(s.mn)}<span class="gloss">${esc(s.en)}</span></div>
      ${s.alts.map(a => `<div class="alt">
        <div class="txt">${esc(a)}</div>
        ${picker('alts::' + s.mn, a, v[a])}
      </div>`).join('')}
      <div class="addlab">Өөр хувилбар нэмэх — add another phrasing you would use</div>
      <input class="free" data-add="${esc(s.mn)}" placeholder="…"
        value="${esc((state.added[s.mn] || []).join(' / '))}">
    </div>`;
  }).join('');

  document.getElementById('lexicon').innerHTML = DATA.lexicon.map(w => {
    const v = state.lexicon[w.id] || {};
    return `<div class="item ${v.verdict ? 'done' : ''}">
      <div class="q">${esc(w.mn)}<span class="gloss">${esc(w.en)}${
        w.drill ? '' : ' — grammar word, never drilled'}</span></div>
      ${picker('lexicon', String(w.id), v.verdict)}
      <input class="free" data-lex="${w.id}" placeholder="Зөв утга — correct meaning (if wrong)"
        value="${esc(v.en || '')}">
    </div>`;
  }).join('');

  document.getElementById('badges').innerHTML = DATA.badges.map(b => {
    const v = state.badges[b.id] || {};
    return `<div class="item ${v.verdict ? 'done' : ''}">
      <div class="q">${esc(b.mn)}<span class="gloss">means: ${esc(b.en)}</span></div>
      ${picker('badges', b.id, v.verdict)}
      <input class="free" data-badge="${esc(b.id)}" placeholder="Илүү сайн нэр — a better name"
        value="${esc(v.text || '')}">
    </div>`;
  }).join('');

  progress();
}

/**
 * Repaint one picker and its card, rather than the whole page.
 *
 * Rebuilding all 180 cards on every click threw away focus and scroll
 * position on each of 196 decisions, and detached any field being typed into.
 */
function repaint(row, chosen, item) {
  row.querySelectorAll('button.pick').forEach(x =>
    x.setAttribute('aria-pressed', String(x.dataset.v === chosen)));
  if (!item) return;
  const picks = item.querySelectorAll('.row');
  const done = [...picks].every(p =>
    [...p.querySelectorAll('button.pick')].some(x => x.getAttribute('aria-pressed') === 'true'));
  item.classList.toggle('done', done);
}

function progress() {
  let n = 0;
  for (const s of DATA.sentences) {
    const v = state.alts[s.mn] || {};
    n += s.alts.filter(a => v[a]).length;
  }
  n += Object.values(state.lexicon).filter(x => x.verdict).length;
  n += Object.values(state.badges).filter(x => x.verdict).length;
  document.getElementById('n').textContent = n;
  document.getElementById('fill').style.width = (100 * n / TOTAL) + '%';
  return n;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  const el = document.getElementById('saved');
  el.textContent = 'хадгалсан · saved';
  clearTimeout(save.t);
  save.t = setTimeout(() => { el.textContent = ''; }, 1600);
}

document.addEventListener('click', e => {
  const b = e.target.closest('button.pick');
  if (!b) return;
  const [group, sentence] = b.dataset.group.split('::');
  const key = b.dataset.key, v = b.dataset.v;
  let chosen = v;

  if (group === 'alts') {
    const bucket = state.alts[sentence] = state.alts[sentence] || {};
    if (bucket[key] === v) { delete bucket[key]; chosen = undefined; }
    else bucket[key] = v;
  } else {
    const store = group === 'lexicon' ? state.lexicon : state.badges;
    const cur = store[key] = store[key] || {};
    if (cur.verdict === v) { delete cur.verdict; chosen = undefined; }
    else cur.verdict = v;
  }

  repaint(b.parentElement, chosen, b.closest('.item'));
  save();
  progress();
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.add !== undefined) {
    const parts = t.value.split('/').map(x => x.trim()).filter(Boolean);
    if (parts.length) state.added[t.dataset.add] = parts;
    else delete state.added[t.dataset.add];
  } else if (t.dataset.lex !== undefined) {
    const cur = state.lexicon[t.dataset.lex] || {};
    cur.en = t.value;
    state.lexicon[t.dataset.lex] = cur;
  } else if (t.dataset.badge !== undefined) {
    const cur = state.badges[t.dataset.badge] || {};
    cur.text = t.value;
    state.badges[t.dataset.badge] = cur;
  } else return;
  save();
  progress();
});

document.getElementById('clear').addEventListener('click', () => {
  if (!confirm('Бүх хариултыг арилгах уу? — clear every answer?')) return;
  state = { alts:{}, added:{}, lexicon:{}, badges:{} };
  localStorage.removeItem(KEY);
  render();
});

document.getElementById('finish').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mongolian-review.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});

render();
</script>
"""


def build_sheet():
    data = collect()
    total = (sum(len(s["alts"]) for s in data["sentences"])
             + len(data["lexicon"]) + len(data["badges"]))
    html = (SHEET
            .replace("__DATA__", json.dumps(data, ensure_ascii=False))
            .replace("__TOTAL__", str(total)))
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT}  ({OUT.stat().st_size // 1024} KB, opens by double-click)")
    print(f"  {sum(len(s['alts']) for s in data['sentences'])} mongolian alternatives"
          f" across {len(data['sentences'])} sentences")
    print(f"  {len(data['lexicon'])} lexicon entries")
    print(f"  {len(data['badges'])} badge names")
    print(f"  {total} decisions in total")


# --------------------------------------------------------------------- apply

def tidy(s):
    """Her free-text answers arrive without closing punctuation."""
    s = s.strip()
    return s if not s or s[-1] in ".!?" else s + "."


def apply(path):
    review = json.loads(Path(path).read_text(encoding="utf-8"))
    sentences = json.loads((SRC / "sentences.json").read_text(encoding="utf-8"))
    words = json.loads((SRC / "words.json").read_text(encoding="utf-8"))

    alts = review.get("alts") or {}
    added = review.get("added") or {}
    removed = kept = new = settled = 0
    promoted = []

    for s in sentences:
        block = (s.get("alt") or {}).get("mn") or []
        verdicts = alts.get(s["mn"], {})
        extra = [tidy(v) for v in (added.get(s["mn"]) or []) if v and v.strip()]
        if not block and not extra:
            continue

        # Every generated variant rejected, and one written in its place: the
        # rejections all point at something in the canonical itself, so her
        # phrasing replaces it rather than joining it. Keeping the old form as
        # an accepted answer would teach exactly the wording she rejected.
        all_wrong = block and all(verdicts.get(a) == "no" for a in block)
        if all_wrong and extra:
            promoted.append((s["mn"], extra[0]))
            s["mn"] = extra[0]
            removed += len(block)
            s.pop("alt", None)
            s["altReviewed"] = True
            # The replacement carries vocabulary `ids` does not declare, so
            # comprehensibility over it is no longer exact until retagged.
            s["partial"] = True
            settled += 1
            continue

        keep = []
        for a in block:
            if verdicts.get(a) == "no":
                removed += 1
            else:
                keep.append(a)
                if verdicts.get(a) == "yes":
                    kept += 1
        for e in extra:
            if e != s["mn"] and e not in keep:
                keep.append(e)
                new += 1

        if keep:
            s.setdefault("alt", {})["mn"] = keep
        elif s.get("alt"):
            s["alt"].pop("mn", None)
            if not s["alt"]:
                s.pop("alt", None)

        # Only call a sentence reviewed once every alternative on it was ruled
        # on — a half-finished pass must not read as signed off.
        if block and all(verdicts.get(a) in ("yes", "no") for a in block):
            s["altReviewed"] = True
            settled += 1

    lex = review.get("lexicon") or {}
    signed = corrected = noted = 0
    for w in words:
        v = lex.get(str(w["id"])) or lex.get(w["id"])
        if not v:
            continue
        text = (v.get("en") or "").strip()
        verdict = v.get("verdict")
        if text and verdict == "no":
            # Marked wrong and rewritten: that is a correction.
            if text != w["en"]:
                w["en"] = text
                corrected += 1
        elif text:
            # Approved *and* annotated. This is a usage note, not a new gloss —
            # overwriting «my» with "endearing word often used for one's
            # beloved people" would replace the meaning with a comment on it.
            w["note"] = text
            noted += 1
        if verdict == "yes" or (verdict == "no" and text):
            w["reviewed"] = True
            signed += 1

    (SRC / "sentences.json").write_text(
        json.dumps(sentences, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (SRC / "words.json").write_text(
        json.dumps(words, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"sentences: {kept} confirmed, {removed} removed, {new} added by hand, "
          f"{settled} sentences now altReviewed")
    print(f"lexicon:   {signed} signed off, {corrected} glosses corrected, {noted} notes kept")

    if promoted:
        print("\ncanonical replaced — every variant was rejected and she wrote one:")
        for old, newmn in promoted:
            print(f"  {old}\n    -> {newmn}")
        print("\n  These are marked partial:true. The vocabulary they introduce is not"
              "\n  in words.json yet, so they need a retag and a second look before"
              "\n  comprehensibility over them is exact again.")

    badges = {k: (v.get("text") or "").strip()
              for k, v in (review.get("badges") or {}).items()
              if isinstance(v, dict) and (v.get("text") or "").strip()}
    if badges:
        print("\nbadge names to change by hand in src/core/goals.js:")
        for k, v in badges.items():
            print(f"  {k}: {v}")
    print("\nre-run `py tools/coverage.py` and `tools/test.html` after applying.")


def main():
    if "--apply" in sys.argv:
        i = sys.argv.index("--apply")
        if i + 1 >= len(sys.argv):
            sys.exit("usage: py tools/review-sheet.py --apply <file.json>")
        apply(sys.argv[i + 1])
    else:
        build_sheet()


if __name__ == "__main__":
    main()
