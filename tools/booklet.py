"""
The weekly verb booklet for Fred and Luna's practice videos (docs/design/G-booklet.md).

    py tools/booklet.py check 1          # forms against the rules and the books, the copyright gate
    py tools/booklet.py sheet 1          # Luna's check sheet
    py tools/booklet.py apply 1 FILE     # merge the file her sheet gives back
    py tools/booklet.py pdf 1            # Fred's booklet and Luna's answer key
    py tools/booklet.py --selftest       # the form rules against forms the books print

A week is one file, content/booklet/week-NN.json. It is gitignored, like
content/drafts (docs/CONTENT.md rule 5), and deliberately not *in*
content/drafts: review-sheet.py --apply puts every approved draft there
straight into the app. The sheet and the PDFs go to the Google Drive folder
that syncs to Fred's iPad; --out DIR sends them somewhere else.

Every Mongolian line here was written by a script or by Claude, so none of it
is trusted until Luna has said yes. A yes is recorded with the exact text she
said it to. Editing a line afterwards makes it unchecked again, and while
anything is unchecked, every page of the booklet says it is a draft.
"""
import html
import importlib.util
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

WEEKS = Path("content/booklet")
OUT = Path("G:/My Drive/Learning/Languages/Mongolian/Booklet")
BOOKS = Path.home() / "Documents" / "mongolian-books"
FONTS = Path("C:/Windows/Fonts")

# key, grammar name, ending, meaning. The booklet always says the grammar
# name, never "now / did / will" (Fred, 25 Oct 2026).
FORMS = [
    ("cont", "Present continuous", "-ж/-ч байна", "I am doing it now"),
    ("past", "Past tense", "-сан", "I did it"),
    ("fut", "Future tense", "-на", "I will do it"),
    ("hab", "Habitual", "-даг", "I usually do it"),
    ("neg", "Negative (future)", "-хгүй", "I won't do it"),
]
NAME = {k: name for k, name, _, _ in FORMS}

# Instrument v3 (docs/INSTRUMENT.md). Red marks the ending, blue the English,
# as in Fred's own GoodNotes notebook. Gold is never type, so it is not here.
INK, MUTED, RED, BLUE = "#14161A", "#5A6068", "#C4272F", "#015197"
PAPER, RULE = "#F4F2ED", "#C9C6BE"


# --- The five forms by rule (G-booklet §2) -----------------------------------
#
# These rules propose a form; they do not decide it. A week file stores
# its forms explicitly. `check` compares them with the rules and with the
# books, and Luna has the last word on each one.

VOWELS = set("аэиоуөүяеёюы")
FREE = set("дтжзсшцчх")      # need a vowel beside them (Beg printed p36 [PDF 37], note 2)
CH = set("вгр")              # these take -ч, not -ж (Beg printed p36 [PDF 37], point 1) ...
J_ANYWAY = {"яв", "ир", "ор", "хар"}   # ... except яв-, ир- (Beg ibid.); орж, харж (Krylov 2018)
LINK = {"а": "а", "э": "э", "о": "о", "ө": "ө"}
PAST = {"а": "сан", "э": "сэн", "о": "сон", "ө": "сөн"}      # Beg printed p66 [PDF 67]
FUT = {"а": "на", "э": "нэ", "о": "но", "ө": "нө"}           # Beg printed p84 [PDF 85]
HAB = {"а": "даг", "э": "дэг", "о": "дог", "ө": "дөг"}       # MM printed p34 [PDF 46]


def harmony(stem):
    """Which of the four vowel classes the endings follow (Beg printed p84 table)."""
    for ch in stem:
        if ch in "оё":
            return "о"
        if ch == "ө":
            return "ө"
        if ch in "ауяыю":
            return "а"
        if ch in "эүе":
            return "э"
    return "э"      # only и: ир-, ид-, хий-


def stem_of(inf):
    """
    The stem of an infinitive in -х: уух → уу, идэх → ид, ярих → ярь.

    A guess only. Whether a vowel before -х belongs to the stem (ажилла-,
    тогло-) or not (уулз-, алх-), and fleeting vowels (тусал- from туслах),
    cannot be told from the spelling, so a week file stores each verb's stem
    as the books print it (300w, MM's vocabulary lists).
    """
    base = inf[:-1]
    if base[-1] == "й" or (base[-1] in VOWELS and base[-2] in VOWELS):
        return base                       # long vowel or diphthong stays
    stem = base[:-1]
    if base[-1] == "и" and stem[-1] not in "жчш" and stem[-1] not in VOWELS:
        stem += "ь"                       # ярих → ярь-
    return stem


def expected(inf, stem=None):
    """{form: "stem|ending"} for an infinitive. Multi-word verbs inflect their last word."""
    head, _, verb = inf.rpartition(" ")
    head = head + " " if head else ""
    s = stem or stem_of(verb)
    h = harmony(s)
    last = s[-1]
    two = len(s) > 1 and last not in VOWELS and last not in "йь" and s[-2] not in VOWELS and s[-2] != "й"

    if last in VOWELS or last == "й":
        cont = (s, "ж байна")
    elif last == "ь":
        cont = (s[:-1], "иж байна") if s[-2] in FREE else (s, "ж байна")
    elif last in "жчш":
        cont = (s, "иж байна")
    elif last in CH:
        cont = (s, "ж байна" if s in J_ANYWAY else "ч байна")
    elif last in FREE:
        cont = (s, LINK[h] + "ж байна")
    else:
        cont = (s, "ж байна")

    if last in VOWELS or last == "й":
        fut = (s, FUT[h])
    elif last == "ь":
        fut = (s[:-1], "и" + FUT[h])      # ярь- → ярина
    elif two:
        fut = (s, ("и" if last in "жчш" else LINK[h]) + FUT[h])   # уншина, уулзана
    else:
        fut = (s, FUT[h])

    common = 0
    while common < min(len(s), len(verb)) and s[common] == verb[common]:
        common += 1
    forms = {"cont": cont, "past": (s, PAST[h]), "fut": fut, "hab": (s, HAB[h]),
             "neg": (verb[:common], verb[common:] + "гүй")}
    return {k: head + a + "|" + b for k, (a, b) in forms.items()}


# Forms the books print, each with where. --selftest asserts the rules
# reproduce every one; a new rule that breaks one of these is wrong.
PRINTED = [
    ("уулзах", "cont", "уулзаж байна", "Beg printed p36 [PDF 37]"),
    ("бодох", "cont", "бодож байна", "Beg printed p36 [PDF 37]"),
    ("унших", "cont", "уншиж байна", "Beg printed p36 [PDF 37]"),
    ("бичих", "cont", "бичиж байна", "Beg printed p36 [PDF 37]"),
    ("авах", "cont", "авч байна", "Beg printed p36 [PDF 37]"),
    ("сурах", "cont", "сурч байна", "Beg printed p36 [PDF 37]"),
    ("өгөх", "cont", "өгч байна", "Beg printed p36 [PDF 37]"),
    ("явах", "cont", "явж байна", "Beg printed p36 [PDF 37]"),
    ("ирэх", "cont", "ирж байна", "Beg printed p36 [PDF 37]"),
    ("уух", "cont", "ууж байна", "Beg printed p35 [PDF 36]"),
    ("хийх", "cont", "хийж байна", "Beg printed p35 [PDF 36]"),
    ("ярих", "cont", "ярьж байна", "Krylov 2018 (ярьж)"),
    ("гарах", "cont", "гарч байна", "Krylov 2018 (гарч)"),
    ("орох", "cont", "орж байна", "Krylov 2018 (орж)"),
    ("харах", "cont", "харж байна", "Krylov 2018 (харж)"),
    ("явах", "past", "явсан", "Beg printed p66 [PDF 67]"),
    ("хэлэх", "past", "хэлсэн", "Beg printed p66 [PDF 67]"),
    ("орох", "past", "орсон", "Beg printed p66 [PDF 67]"),
    ("өлсөх", "past", "өлссөн", "Beg printed p66 [PDF 67]"),
    ("уух", "past", "уусан", "Beg printed p65 [PDF 66]"),
    ("нээх", "past", "нээсэн", "Beg printed p65 [PDF 66]"),
    ("үзэх", "past", "үзсэн", "Beg printed p65 [PDF 66]"),
    ("өгөх", "past", "өгсөн", "Beg printed p65 [PDF 66]"),
    ("ажиллах", "past", "ажилласан", "Beg printed p65 [PDF 66]"),
    ("асуух", "fut", "асууна", "Beg printed p84 [PDF 85]"),
    ("хэлэх", "fut", "хэлнэ", "Beg printed p84 [PDF 85]"),
    ("орох", "fut", "орно", "Beg printed p84 [PDF 85]"),
    ("өгөх", "fut", "өгнө", "Beg printed p84 [PDF 85]"),
    ("ажиллах", "fut", "ажиллана", "Beg printed p84 [PDF 85]"),
    ("сурах", "fut", "сурна", "MM printed p4 [PDF 16]"),
    ("үзэх", "fut", "үзнэ", "MM printed p4 [PDF 16]"),
    ("унших", "fut", "уншина", "MM printed p5 [PDF 17]"),
    ("өгөх", "hab", "өгдөг", "MM printed p34 [PDF 46]"),
    ("авах", "hab", "авдаг", "MM printed p35 [PDF 47]"),
    ("суух", "hab", "суудаг", "MM printed p35 [PDF 47]"),
    ("үзэх", "hab", "үздэг", "MM printed p35 [PDF 47]"),
    ("хийх", "hab", "хийдэг", "MM printed p35 [PDF 47]"),
    ("унших", "hab", "уншдаг", "MM printed p34 [PDF 46]"),
    ("сурах", "hab", "сурдаг", "MM printed p34 [PDF 46]"),
    ("явах", "neg", "явахгүй", "Beg printed p84 [PDF 85]"),
    ("ирэх", "neg", "ирэхгүй", "Beg printed p84 [PDF 85]"),
    ("хүлээх", "neg", "хүлээхгүй", "Beg printed p84 [PDF 85]"),
    ("орох", "neg", "орохгүй", "Beg printed p84 [PDF 85]"),
    ("өгөх", "neg", "өгөхгүй", "Beg printed p84 [PDF 85]"),
    ("ажиллах", "neg", "ажиллахгүй", "Beg printed p84 [PDF 85]"),
]


# Stems the spelling does not give away, as 300w prints them.
STEMS = {"ажиллах": "ажилла"}     # 300w #283 [PDF 10]


def selftest():
    bad = 0
    for inf, form, want, src in PRINTED:
        got = expected(inf, STEMS.get(inf))[form].replace("|", "")
        if got != want:
            print(f"  FAIL {inf} {NAME[form]}: rule gives {got}, {src} prints {want}")
            bad += 1
    print(f"{len(PRINTED) - bad}/{len(PRINTED)} printed forms reproduced")
    return 1 if bad else 0


# --- A week file -------------------------------------------------------------

def week_path(n):
    return WEEKS / f"week-{int(n):02d}.json"


def load(n):
    return json.loads(week_path(n).read_text(encoding="utf-8"))


def save(n, week):
    week_path(n).write_text(json.dumps(week, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def verb(week, name):
    return next(v for v in week["verbs"] if v["mn"] == name)


def sentence(week, ref):
    """ "уух.cont" → that verb's sentence {mn, en}, plus the verb and form."""
    name, form = ref.split(".")
    v = verb(week, name)
    return v["sentences"][form], v, form


def items(week):
    """Everything Luna is asked about, as (id, section, mn, en): id is stable, mn is what she rules on."""
    out = []
    for v in week["verbs"]:
        for k, *_ in FORMS:
            out.append((f"f:{v['mn']}:{k}", "forms", v["forms"][k].replace("|", ""),
                        f"{v['mn']} ({v['en']}) · {NAME[k]}"))
    for v in week["verbs"]:
        for k, *_ in FORMS:
            s = v["sentences"][k]
            out.append((f"s:{v['mn']}:{k}", "sentences", s["mn"], f"{s['en']} · {NAME[k]}"))
    for i, q in enumerate(week["friday"], 1):
        out.append((f"q:{i}", "questions", q["mn"], q["en"]))
    for i, d in enumerate(week["dialogue"], 1):
        out.append((f"d:{i}", "dialogue", d["mn"], f"{d['who']}: {d['en']}"))
    for i, w in enumerate(week["words"] + week["time"], 1):
        out.append((f"w:{w['mn']}", "words", f"{w['mn']} = {w['en']}", ""))
    return out


def pending(week):
    return [i for i in items(week) if week["signed"].get(i[0]) != i[2]]


# --- check -------------------------------------------------------------------

def book_words():
    """Every word in the book texts and Krylov's list, for "does a book print this form?"."""
    words = set()
    for f in list(BOOKS.glob("*.txt")) + list((BOOKS / "research").glob("krylov*.txt")):
        words.update(re.findall(r"[а-яөүё]+", f.read_text(encoding="utf-8").lower()))
    return words


def gate():
    """The copyright gate from tools/overlap.py, as review-sheet.py loads it."""
    sys.path.insert(0, "tools")
    import overlap
    texts = [q.read_text(encoding="utf-8") for q in sorted(overlap.DEFAULT_BOOKS.glob("*.txt"))
             if not any(s in q.name for s in overlap.SKIP)]
    if not texts:
        sys.exit(f"no book text in {overlap.DEFAULT_BOOKS}: the copyright gate cannot run")
    grams, whole = overlap.index(texts)
    allow = overlap.load_allow()
    return lambda line: overlap.check(line, grams, whole, allow)


def check(n):
    week = load(n)
    problems = 0
    printed = book_words()

    print(f"Week {week['week']}: {week['theme']}\n\nForms (rule / books):")
    for v in week["verbs"]:
        rule = expected(v["mn"], v.get("stem"))
        cells = []
        for k, *_ in FORMS:
            have = v["forms"][k]
            word = have.replace("|", "").split()[-2 if k == "cont" else -1]
            mark = ("" if have == rule[k] else " RULE≠" + rule[k].replace("|", "")) + \
                   ("" if word in printed else " (no book prints it)")
            if have != rule[k]:
                problems += 1
            cells.append(have.replace("|", "") + mark)
        print(f"  {v['mn']:8s} " + " · ".join(cells))

    print("\nSentences carry their form:")
    missing = 0
    for v in week["verbs"]:
        for k, *_ in FORMS:
            form = v["forms"][k].replace("|", "")
            if form not in v["sentences"][k]["mn"]:
                print(f"  MISSING {form!r} in {v['sentences'][k]['mn']}")
                missing += 1
    for ref in week["tuesday"] + week["wednesday"] + [q["model"] for q in week["friday"]] + \
            [t["from"] for t in week["thursday"]] + [r for t in week["thursday"] for r, _ in t["to"]]:
        sentence(week, ref)      # raises on a bad reference
    problems += missing
    print(("  all present; " if not missing else "  ") + "every exercise points at a real sentence")

    blocked = gate()
    lines = [s["mn"] for v in week["verbs"] for s in v["sentences"].values()] + \
            [q["mn"] for q in week["friday"]] + [d["mn"] for d in week["dialogue"]]
    print(f"\nCopyright gate over {len(lines)} lines:")
    for line in lines:
        why = blocked(line)
        if why:
            print(f"  BLOCKED, rewrite: {line} — {why}")
            problems += 1
    print("  clear" if not any(blocked(x) for x in lines) else "")

    left = pending(week)
    print(f"\nLuna has checked {len(items(week)) - len(left)} of {len(items(week))} items"
          + (f"; {len(week['rejected'])} marked wrong" if week["rejected"] else ""))
    return 1 if problems else 0


# --- Luna's sheet ------------------------------------------------------------

SECTIONS = [
    ("forms", "Үйл үгийн хэлбэр", "verb forms",
     "Each verb in five grammar forms. Is the spelling right?"),
    ("sentences", "Өгүүлбэр", "sentences to learn by heart",
     "Five sentences for each verb. Fred will learn these by heart, so a mistake here is a mistake he memorises. "
     "Would you say it like this, and does the English match?"),
    ("questions", "Асуулт", "questions you ask him on camera", "Natural, and does the English match?"),
    ("dialogue", "Яриа", "the scenario you act out together", "Each line as you would really say it."),
    ("words", "Шинэ үг", "new words and time words", "Is the meaning right?"),
]

PAGE = r"""<!doctype html>
<meta charset="utf-8">
<title>Монгол хэл — долоо хоног __N__</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
__STYLE__
<div class="wrap">
<h1>Монгол хэл — долоо хоног __N__</h1>
<div class="en">Verb booklet, week __N__: __THEME__ — check sheet for Luna</div>
<div class="intro">
  <p><b>Юу хийх вэ?</b> Доор компьютерийн зохиосон монгол хувилбарууд байна.
     Тус бүрд нь <b>Зөв</b>, <b>Буруу</b> эсвэл <b>Мэдэхгүй</b> гэж хариулна уу.</p>
  <p class="en"><b>What to do.</b> This is next week's booklet for Fred. Every line was written by a
     computer. For each one, mark <b>Зөв</b> (correct), <b>Буруу</b> (wrong) or <b>Мэдэхгүй</b> (not sure).
     If it is wrong, write it the way you would say it in the box underneath: that version goes
     straight into his booklet.</p>
  <p class="en"><b>You can stop any time.</b> Your answers are saved in this browser. When you are
     finished, press <b>Дуусгах</b> at the bottom and send Fred the file it gives you.
     Nothing is uploaded anywhere.</p>
</div>
<div id="all"></div>
</div>
<div class="bar">
  <span class="count"><span id="n">0</span> / <span id="tot">__TOTAL__</span></span>
  <span class="track"><i id="fill"></i></span>
  <button class="ghost" id="clear">Арилгах</button>
  <button class="finish" id="finish">Дуусгах — файл авах</button>
</div>
<script>
const DATA = __DATA__;
const KEY = 'mng_booklet_w' + DATA.week;
let state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const PICKS = [['yes','Зөв','correct'],['no','Буруу','wrong'],['idk','Мэдэхгүй','not sure']];
function picker(id, cur) {
  return '<div class="row">' + PICKS.map(([v, mn, en]) =>
    `<button class="pick ${v}" data-id="${esc(id)}" data-v="${v}" aria-pressed="${cur === v}">${mn}<small>${en}</small></button>`).join('') + '</div>';
}
function render() {
  document.getElementById('all').innerHTML = DATA.sections.map(s => !s.items.length ? '' :
    `<h2>${esc(s.mn)} <span class="en">— ${esc(s.en)}</span></h2>
     <div class="en" style="margin-top:8px">${esc(s.note)}</div>` +
    s.items.map(it => { const v = state[it.id] || {};
      return `<div class="item ${v.verdict ? 'done' : ''}">
        <div class="q">${esc(it.mn)}${it.en ? `<span class="gloss">${esc(it.en)}</span>` : ''}</div>
        ${picker(it.id, v.verdict)}
        <input class="free" data-id="${esc(it.id)}" placeholder="Зөв хувилбар — the right version (if wrong)" value="${esc(v.text || '')}">
      </div>`; }).join('')).join('');
  tally();
}
function tally() {
  const n = Object.values(state).filter(x => x.verdict).length;
  document.getElementById('n').textContent = n;
  document.getElementById('fill').style.width = (100 * n / DATA.total) + '%';
}
function keep() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
document.addEventListener('click', e => {
  const b = e.target.closest('button.pick'); if (!b) return;
  const cur = state[b.dataset.id] || {};
  cur.verdict = cur.verdict === b.dataset.v ? undefined : b.dataset.v;
  state[b.dataset.id] = cur; keep(); render();
});
document.addEventListener('input', e => {
  if (!e.target.matches('input.free')) return;
  const cur = state[e.target.dataset.id] || {}; cur.text = e.target.value;
  state[e.target.dataset.id] = cur; keep();
});
document.getElementById('clear').onclick = () => {
  if (confirm('Бүх хариултыг арилгах уу? — clear every answer?')) { state = {}; keep(); render(); }
};
document.getElementById('finish').onclick = () => {
  const blob = new Blob([JSON.stringify({ week: DATA.week, items: state, at: new Date().toISOString() }, null, 1)],
    { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `luna-booklet-${String(DATA.week).padStart(2, '0')}.json`; a.click();
};
render();
</script>
"""


def review_style():
    """The <style> of Luna's usual review sheet, so this one looks and works the same."""
    spec = importlib.util.spec_from_file_location("review_sheet", "tools/review-sheet.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return re.search(r"<style>.*?</style>", mod.SHEET, re.S).group(0)


def sheet(n, out):
    week = load(n)
    printed = book_words()
    todo = []
    for iid, sec, text, en in pending(week):
        if sec == "forms" and text.split()[0] not in printed:
            en += " · no textbook prints this form"
        todo.append((iid, sec, text, en))
    data = {"week": week["week"], "total": len(todo), "sections": [
        {"mn": mn, "en": en, "note": note,
         "items": [{"id": i, "mn": t, "en": e} for i, sec, t, e in todo if sec == key]}
        for key, mn, en, note in SECTIONS]}
    page = (PAGE.replace("__STYLE__", review_style()).replace("__N__", str(week["week"]))
            .replace("__THEME__", html.escape(week["theme"])).replace("__TOTAL__", str(len(todo)))
            .replace("__DATA__", json.dumps(data, ensure_ascii=False)))
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"Week {week['week']:02d} - check sheet for Luna.html"
    path.write_text(page, encoding="utf-8")
    print(f"{path}  ({len(todo)} items to check)")


# --- apply -------------------------------------------------------------------

def tidy(s):
    return re.sub(r"\s+", " ", s).strip()


def apply(n, file):
    week = load(n)
    review = json.loads(Path(file).read_text(encoding="utf-8"))
    current = {i: t for i, _, t, _ in items(week)}
    ok = fixed = wrong = 0
    for iid, v in (review.get("items") or {}).items():
        if iid not in current:
            print(f"  skipped {iid}: no longer in the week")
            continue
        text = tidy(v.get("text") or "")
        if v.get("verdict") == "yes":
            week["signed"][iid] = current[iid]
            week["rejected"].pop(iid, None)
            ok += 1
        elif v.get("verdict") == "no" and text and not iid.startswith("w:"):
            week["signed"][iid] = set_text(week, iid, text)
            week["rejected"].pop(iid, None)
            fixed += 1
        elif v.get("verdict") == "no":
            # A word's correction may be the spelling or the meaning: a person decides which.
            week["rejected"][iid] = {"was": current[iid], "note": text}
            wrong += 1
    save(n, week)
    print(f"{ok} confirmed, {fixed} rewritten in Luna's words, {wrong} marked wrong")
    for iid, r in week["rejected"].items():
        print(f"  wrong: {r['was']}" + (f" — she wrote: {r['note']}" if r["note"] else ""))
    print("Run `check` next: a corrected form no longer matches the sentences that use it.")


def set_text(week, iid, text):
    kind, *rest = iid.split(":")
    if kind == "f":
        v = verb(week, rest[0])
        old = v["forms"][rest[1]].split("|")[0]
        v["forms"][rest[1]] = (old + "|" + text[len(old):]) if text.startswith(old) else "|" + text
    elif kind == "s":
        verb(week, rest[0])["sentences"][rest[1]]["mn"] = text
    elif kind == "q":
        week["friday"][int(rest[0]) - 1]["mn"] = text
    elif kind == "d":
        week["dialogue"][int(rest[0]) - 1]["mn"] = text
    return text


# --- PDF ---------------------------------------------------------------------

def pdf(n, out):
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (Flowable, KeepTogether, PageBreak, Paragraph,
                                    SimpleDocTemplate, Spacer, Table, TableStyle)

    week = load(n)
    draft = bool(pending(week))
    pdfmetrics.registerFont(TTFont("UI", str(FONTS / "segoeui.ttf")))
    pdfmetrics.registerFont(TTFont("UI-Semi", str(FONTS / "seguisb.ttf")))
    pdfmetrics.registerFontFamily("UI", normal="UI", bold="UI-Semi", italic="UI", boldItalic="UI-Semi")

    W, H = A4
    M = 18 * mm
    body = W - 2 * M
    ink, muted, red, blue, paper, rule = map(HexColor, (INK, MUTED, RED, BLUE, PAPER, RULE))

    def style(size=11.5, color=ink, lead=None, **kw):
        return ParagraphStyle("s", fontName="UI", fontSize=size, leading=lead or size * 1.45,
                              textColor=color, **kw)
    P, SMALL, LABEL = style(), style(9.5, muted), style(8.5, muted)
    TITLE, KICK = style(19, lead=24, spaceAfter=4), style(9, red, spaceAfter=2)
    BIG = style(13, lead=19)

    e = html.escape

    def en(text, size=9.5):
        return f'<font color="{BLUE}" size="{size}">{e(text)}</font>'

    def paint(line, form):
        """The sentence with the verb's ending in red."""
        stem, end = form.split("|")
        whole = stem + end
        i = line.find(whole)
        if i < 0:
            return e(line)
        return e(line[:i]) + e(stem) + f'<font color="{RED}">{e(end)}</font>' + e(line[i + len(whole):])

    class Line(Flowable):
        """A dashed line to write on, with an optional label at the left."""
        def __init__(self, label="", height=30, indent=0):
            super().__init__()
            self.label, self.height, self.indent = label, height, indent

        def wrap(self, aw, ah):
            self.width = aw
            return aw, self.height

        def draw(self):
            c = self.canv
            if self.label:
                c.setFont("UI", 8.5)
                c.setFillColor(muted)
                c.drawString(0, 6, self.label)
            c.setStrokeColor(rule)
            c.setLineWidth(0.6)
            c.setDash(2, 2)
            c.line(self.indent, 3, self.width, 3)

    class Boxes(Flowable):
        """Tick boxes, e.g. one per time said aloud."""
        def __init__(self, label, n=3):
            super().__init__()
            self.label, self.n = label, n

        def wrap(self, aw, ah):
            return aw, 16

        def draw(self):
            c = self.canv
            c.setFont("UI", 9)
            c.setFillColor(muted)
            c.drawString(0, 4, self.label)
            x = c.stringWidth(self.label, "UI", 9) + 8
            c.setStrokeColor(muted)
            c.setLineWidth(0.7)
            for i in range(self.n):
                c.rect(x + i * 16, 2, 10, 10)

    def header(kicker, title, note=None):
        out = [Paragraph(e(kicker), KICK), Paragraph(e(title), TITLE)]
        if note:
            out.append(Paragraph(note, SMALL))
        out.append(Spacer(1, 10))
        return out

    def page_furniture(c, doc, label):
        c.saveState()
        c.setFont("UI", 8)
        c.setFillColor(muted)
        c.drawString(M, H - 11 * mm, f"Mongolian verbs · Week {week['week']} · {week['theme']}")
        c.drawRightString(W - M, 10 * mm, f"{label} · page {doc.page}")
        c.drawString(M, 10 * mm, "Endings in red · English in blue")
        if draft:
            c.setFillColor(red)
            c.drawRightString(W - M, H - 11 * mm, "DRAFT: Luna has not checked this yet")
        c.restoreState()

    def build(path, story, label):
        doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=M, rightMargin=M,
                                topMargin=17 * mm, bottomMargin=17 * mm,
                                title=f"Mongolian verbs, week {week['week']}: {label}", author="Фред & Луна")
        doc.build(story, onFirstPage=lambda c, d: page_furniture(c, d, label),
                  onLaterPages=lambda c, d: page_furniture(c, d, label))
        print(path)

    def boxed(rows):
        t = Table(rows, colWidths=[body / 2 - 4, body / 2 - 4], hAlign="LEFT")
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), paper), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                               ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                               ("LINEAFTER", (0, 0), (0, -1), 6, HexColor("#FFFFFF"))]))
        return t

    def word_list(title, ws):
        return [Paragraph(e(title), LABEL)] + [Paragraph(f"{e(w['mn'])}  {en(w['en'], 9)}", style(10.5))
                                              for w in ws]

    s = []

    # Page 1 — the verbs
    s += header(f"Week {week['week']} · {week['theme']}", "This week's five verbs, in five grammar forms",
                "Each verb below in its five grammar forms. The stem stays the same; only the ending in red changes.")
    head = [Paragraph("Verb", LABEL)] + [Paragraph(f"<b>{e(nm)}</b><br/>{e(end)}", style(8.5, muted, 11))
                                         for _, nm, end, _ in FORMS]
    rows = [head]
    for v in week["verbs"]:
        rows.append([Paragraph(f"<b>{e(v['mn'])}</b><br/>{en(v['en'], 8.5)}", style(11, lead=14))] +
                    [Paragraph(paint(v["forms"][k].replace("|", ""), v["forms"][k]), style(11, lead=14))
                     for k, *_ in FORMS])
    rows.append([Paragraph("Meaning", LABEL)] + [Paragraph(en(mean, 8.5), style(8.5, lead=11))
                                                for *_, mean in FORMS])
    vw = 74
    t = Table(rows, colWidths=[vw] + [(body - vw) / 5] * 5, hAlign="LEFT")
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, rule), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("BACKGROUND", (0, 0), (-1, 0), paper), ("TOPPADDING", (0, 0), (-1, -1), 6),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 7), ("LEFTPADDING", (0, 0), (-1, -1), 4)]))
    s += [t, Spacer(1, 14),
          boxed([[word_list("New words", week["words"]), word_list("Time words (every week)", week["time"])]]),
          PageBreak()]

    # Page 2 — learn by heart
    s += header("Learn by heart", "Five sentences for each verb, one per grammar form",
                "The same everyday sentence, changed only by the time word and the verb ending. "
                "Learn all five for each verb.")
    for v in week["verbs"]:
        rows = [[Paragraph(e(nm), LABEL),
                 Paragraph(paint(v["sentences"][k]["mn"], v["forms"][k]) + "<br/>" + en(v["sentences"][k]["en"]),
                           style(12, lead=16))] for k, nm, *_ in FORMS]
        t = Table(rows, colWidths=[100, body - 100], hAlign="LEFT")
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 3),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 4), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
        s.append(KeepTogether([Paragraph(f"<b>{e(v['mn'])}</b> · {en(v['en'], 11)}", BIG), t, Spacer(1, 10)]))
    s.append(PageBreak())

    # Monday — copy and say
    s += header("Monday · Copy and say", "Write out each verb's five sentences",
                "Take one verb at a time. Copy its five sentences from the \"Learn by heart\" page onto the lines, "
                "one sentence per line, in the order of the grammar forms. Then cover that page and say all "
                "five aloud three times. Tick a box each time.")
    for v in week["verbs"]:
        block = [Paragraph(f"<b>{e(v['mn'])}</b> · {en(v['en'], 11)}", BIG), Boxes("Said aloud:")]
        block += [Line(nm, 30, 100) for _, nm, *_ in FORMS]
        s.append(KeepTogether(block + [Spacer(1, 12)]))
    s.append(PageBreak())

    # Tuesday — fill in the form
    s += header("Tuesday · Fill in the form", "Write the verb in the grammar form given",
                "Each sentence is missing its verb. The brackets say which verb and which grammar form.")
    blank = '<font color="#9CA2A9">' + "_" * 22 + "</font>"
    for i, ref in enumerate(week["tuesday"], 1):
        sen, v, k = sentence(week, ref)
        gap = e(sen["mn"]).replace(e(v["forms"][k].replace("|", "")), blank, 1)
        s.append(Paragraph(f"{i}.&nbsp; {gap} &nbsp;<font color='{MUTED}' size='9.5'>({e(v['mn'])} · "
                           f"{e(NAME[k])})</font>", style(12, lead=34)))
    s.append(PageBreak())

    # Wednesday — English to Mongolian
    s += header("Wednesday · English to Mongolian", "Translate", "Write each sentence in Mongolian.")
    for i, ref in enumerate(week["wednesday"], 1):
        sen, _, _ = sentence(week, ref)
        s.append(KeepTogether([Paragraph(f"{i}.&nbsp; {en(sen['en'], 11.5)}", P), Line(height=30), Spacer(1, 6)]))
    s.append(PageBreak())

    # Thursday — change the grammar form
    s += header("Thursday · Change the grammar form", "Rewrite the sentence in the form asked",
                "Use the words given after \"with\". Everything else in the sentence can stay.")
    for i, item in enumerate(week["thursday"], 1):
        sen, v, k = sentence(week, item["from"])
        block = [Paragraph(f"{i}.&nbsp; {paint(sen['mn'], v['forms'][k])} &nbsp;"
                           f"<font color='{MUTED}' size='9.5'>({e(NAME[k])})</font>", style(12, lead=17))]
        for ref, words in item["to"]:
            _, _, tk = sentence(week, ref)
            block += [Paragraph(f"→ {e(NAME[tk])}, with {e(words)}", style(9.5, muted, spaceBefore=6)),
                      Line(height=26)]
        s.append(KeepTogether(block + [Spacer(1, 12)]))
    s.append(PageBreak())

    # Friday — about you
    s += header("Friday · About you", "Luna asks these on camera",
                "Answer each one in a full sentence about yourself, in the same grammar form as the question.")
    for i, q in enumerate(week["friday"], 1):
        s.append(KeepTogether([Paragraph(f"{i}.&nbsp; {e(q['mn'])}<br/>{en(q['en'])}", style(12, lead=17)),
                               Line(height=30), Spacer(1, 8)]))
    s += [Spacer(1, 6), Boxes("Then read Фред's lines in the scenario aloud twice:", 2), PageBreak()]

    # Scenario
    s += header(f"Scenario · {week['scenario']}", "Act it out together",
                "First with the page, then from memory. Then swap roles.")
    rows = [[Paragraph(f"<b>{e(d['who'])}</b>", P), Paragraph(e(d["mn"]), style(12, lead=16)),
             Paragraph(en(d["en"]), style(9.5, lead=14))] for d in week["dialogue"]]
    t = Table(rows, colWidths=[48, body * 0.52, body - 48 - body * 0.52], hAlign="LEFT")
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, rule), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    s += [t, PageBreak()]

    # On camera
    s += header("On camera · Running order", "About 12 minutes")
    for title, mins, text in [
        ("1. Homework check", "about 5 min",
         "Fred reads his Tuesday to Friday answers aloud. Luna checks them against her answer key "
         "and corrects the pronunciation."),
        ("2. Sentences from memory", "about 3 min",
         "Luna names a verb. Fred says its five sentences, present continuous to negative, without the page."),
        ("3. Scenario", "about 4 min", "Once reading, once from memory, then swap roles.")]:
        s += [Paragraph(f"<b>{e(title)}</b> &nbsp;<font color='{MUTED}' size='9.5'>{e(mins)}</font>", BIG),
              Paragraph(e(text), style(10.5, muted, spaceAfter=12))]
    s += [Spacer(1, 6), Boxes("All five verbs' sentences from memory", 1),
          Boxes("Scenario without the page", 1), Spacer(1, 10),
          Line("One thing to fix next week:", 30, 140)]
    build(out / f"Week {week['week']:02d} - {week['theme']}.pdf", s, "Fred's booklet")

    # Luna's answer key
    s = header(f"Week {week['week']} · {week['theme']}", "Answer key",
               "Luna's copy, for the homework check on camera. Fred's own booklet has no answers in it.")
    s.append(Paragraph("<b>Tuesday · Fill in the form</b>", BIG))
    for i, ref in enumerate(week["tuesday"], 1):
        _, v, k = sentence(week, ref)
        f = v["forms"][k]
        s.append(Paragraph(f"{i}.&nbsp; {paint(f.replace('|', ''), f)} &nbsp;"
                           f"<font color='{MUTED}' size='9'>{e(NAME[k])}</font>", P))
    s += [Spacer(1, 10), Paragraph("<b>Wednesday · English to Mongolian</b>", BIG)]
    for i, ref in enumerate(week["wednesday"], 1):
        sen, v, k = sentence(week, ref)
        s.append(Paragraph(f"{i}.&nbsp; {paint(sen['mn'], v['forms'][k])}", P))
    s += [Spacer(1, 10), Paragraph("<b>Thursday · Change the grammar form</b>", BIG)]
    for i, item in enumerate(week["thursday"], 1):
        for j, (ref, _) in enumerate(item["to"]):
            sen, v, k = sentence(week, ref)
            s.append(Paragraph(f"{str(i) + '.' if j == 0 else '&nbsp;' * 4}&nbsp; {paint(sen['mn'], v['forms'][k])}"
                               f" &nbsp;<font color='{MUTED}' size='9'>{e(NAME[k])}</font>", P))
    friday = [Spacer(1, 10), Paragraph("<b>Friday · About you</b>", BIG),
              Paragraph("His own answers, so anything true and correct is right. A model answer for each:", SMALL)]
    for i, q in enumerate(week["friday"], 1):
        sen, v, k = sentence(week, q["model"])
        friday.append(Paragraph(f"{i}.&nbsp; {paint(sen['mn'], v['forms'][k])}", P))
    s.append(KeepTogether(friday))
    build(out / f"Week {week['week']:02d} - answer key.pdf", s, "Luna's answer key")


# --- CLI ---------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    out = OUT
    if "--out" in args:
        i = args.index("--out")
        out = Path(args[i + 1])
        del args[i:i + 2]
    if args[:1] == ["--selftest"]:
        return selftest()
    if len(args) >= 2 and args[0] in ("check", "sheet", "pdf", "apply"):
        cmd, n = args[0], int(args[1])
        if cmd == "check":
            return check(n)
        if cmd == "sheet":
            return sheet(n, out)
        if cmd == "pdf":
            out.mkdir(parents=True, exist_ok=True)
            return pdf(n, out)
        if cmd == "apply" and len(args) == 3:
            return apply(n, args[2])
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main() or 0)
