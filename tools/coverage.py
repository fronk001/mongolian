"""
Content coverage report for src/data.

Every sentence currently carries exactly one tagged word id, so the app's
"comprehensible" and "i+N" readouts are computed over one word out of ~3 and
mean almost nothing. This measures the real picture and produces the worklist
needed to fix it.

    py tools/coverage.py                 # summary
    py tools/coverage.py --unmatched     # tokens with no word entry, by frequency
    py tools/coverage.py --propose       # proposed tags per sentence, as TSV
    py tools/coverage.py --selftest      # the matcher against tools/matcher-gold.tsv (CI)

--propose writes a review file. Nothing is applied to words.json or
sentences.json: the stem matcher below is a heuristic on an agglutinative
language, and every proposal needs a human (Luna or Sarnai) to confirm before
it becomes study material.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

DATA = Path("src/data")
CYR = r"Ѐ-ӿ᠀-᢯"


def tokens(mn: str) -> list[str]:
    return [t for t in (re.sub(rf"[^{CYR}]", "", w).lower() for w in mn.split()) if t]


# Endings, split by part of speech: a verb lemma takes only verb endings and a
# nominal lemma only nominal ones. One shared list once read хэлний ("of the
# language") as a form of хэлэх ("to say"). Not a complete grammar — enough to
# tell an inflection from a coincidence. Additions carry their source page.
NOUN_SUFFIXES = [
    # case
    "ийнх", "ыгаа", "ийгээ", "аасаа", "ээсээ", "оосоо", "өөсөө",
    "аар", "ээр", "оор", "өөр", "аас", "ээс", "оос", "өөс",
    "тай", "тэй", "той", "төй", "ийг", "ыг", "ийн", "ын", "ний", "ны",
    "гийн", "гийг", "гүй", "н", "ан", "эн", "он", "өн",
    "даа", "дээ", "доо", "дөө", "нд", "ад", "эд", "од", "өд", "д", "т", "г",
    "анд", "энд", "онд", "өнд", "ганд", "гэнд", "руу", "рүү",
    # plural
    "ууд", "үүд", "нууд", "нүүд", "нар", "нэр",
    # possessive / reflexive
    "маа", "мээ", "аа", "ээ", "оо", "өө",
]
VERB_SUFFIXES = [
    "дагаа", "дэгээ", "даг", "дэг", "дог", "дөг",
    "аач", "ээч", "ооч", "өөч", "ач", "эч", "оч", "өч",
    "лаа", "лээ", "лоо", "лөө",
    "сан", "сэн", "сон", "сөн", "на", "нэ", "но", "нө",
    "аад", "ээд", "оод", "өөд", "гаач", "гээч", "гооч", "гөөч",
    "аарай", "ээрэй", "оорой", "өөрэй", "аарэй", "уулаа", "үүлээ",
    "ж", "ч", "х", "я", "ё", "е", "ъя", "ъё",
    # imperfective participle -гаа4 (байгаа), MM index of inflexions p178 [190]
    "гаа", "гээ", "гоо", "гөө",
    "аа", "ээ", "оо", "өө",
]
SUFFIXES = sorted(set(NOUN_SUFFIXES) | set(VERB_SUFFIXES), key=len, reverse=True)
VOWELS = "аэиоөуүы"


def is_verb(w) -> bool:
    """Verbs are stored as infinitives in -х with an English gloss "to ..."."""
    return w["mn"].endswith("х") and w.get("en", "").startswith("to ")


def match_score(tok: str, w):
    """
    How well `tok` reads as a form of lexicon entry `w`, or None.

    Mongolian is agglutinative: suffixes attach to a mostly stable stem
    (хаалга -> хаалгыг, өрөө -> өрөөнд). A bare prefix test is not enough — it
    pairs өндөр (tall) with өндөг (egg), будаа (rice) with будах (to paint) —
    so the leftover after the stem must be a listed ending for that part of
    speech, and the token may not be shorter than the stem.

    Scores rank candidates: an exact headword (or a listed irregular form)
    beats any inflection; then the longer matched stem; then a plain stem over
    a fleeting-vowel or dropped-vowel one.
    """
    mn = w["mn"].lower()
    if tok == mn or tok in (w.get("forms") or []):
        return (1000, 3, len(mn))
    # Particles, interjections and lemmas of two letters or fewer match only
    # exactly or through `forms`: за is no stem of зах (market), ер (ninety)
    # none of ердөө, ач (grandchild) none of ачаа (load).
    if w.get("infl") == "none" or len(mn) <= 2:
        return None
    endings = VERB_SUFFIXES if is_verb(w) else NOUN_SUFFIXES

    # (stem, dropped vowel or None, why it dropped, kind rank)
    stems = {(mn, None, None, 2)}
    if mn.endswith("х"):
        stems.add((mn[:-1], None, None, 2))
    for s, _, _, _ in list(stems):
        if len(s) < 3:
            continue
        # A trailing vowel drops before a suffix: хаалга -> хаалгыг.
        if s[-1] in VOWELS:
            stems.add((s[:-1], s[-1], "final", 0))
            # -и becomes -ь in the imperative: тавих -> тавь, ярих -> ярь.
            if s[-1] == "и":
                stems.add((s[:-1] + "ь", None, None, 1))
        # Fleeting vowel: the vowel of a final -VC syllable drops before a
        # suffix (буйдан -> буйдныг, ургамал -> ургамлыг) — but never a long
        # vowel or diphthong: дээр is not a form of дэр, тоос not of тос.
        elif s[-2] in VOWELS and s[-3] not in VOWELS:
            stems.add((s[:-2] + s[-1], s[-2], "fleeting", 1))

    best = None
    for stem, dropped, why, rank in stems:
        if len(stem) < 2 or len(tok) < len(stem) or not tok.startswith(stem):
            continue
        rest = tok[len(stem):]
        # A dropped *final* vowel simply put back is a different word:
        # будах/буда -> буд + аа = будаа (rice), no form of "to paint". A
        # fleeting vowel is exempt — хувцас -> хувцсаа really is "my clothes".
        if why == "final" and dropped and rest[:1] == dropped:
            continue
        # The whole infinitive takes case endings as a verbal noun:
        # будахыг, тарихыг ("to paint", "to plant" as an object).
        allowed = NOUN_SUFFIXES if (is_verb(w) and stem == mn) else endings
        ok = rest == "" or rest in allowed
        # A stem-final vowel merges with a suffix opening on the same vowel:
        # цэвэрлэ + ээч -> цэвэрлээч, leaving only "эч". Never for a single
        # leftover letter: буда + "а" is not будах, будаа is rice.
        if not ok and len(rest) >= 2 and stem[-1] in VOWELS and (stem[-1] + rest) in endings:
            ok = True
        if ok:
            score = (len(stem), rank, len(mn))
            if best is None or score > best:
                best = score
    return best


def stem_match(tok: str, mn: str) -> bool:
    """Whether `tok` is a form of the headword `mn` (a bare word, no entry fields)."""
    return match_score(tok, {"mn": mn}) is not None


def load():
    words = json.loads((DATA / "words.json").read_text(encoding="utf-8"))
    sents = json.loads((DATA / "sentences.json").read_text(encoding="utf-8"))
    return words, sents


def analyse(words, sents):
    """
    Match a sentence's tokens against the lexicon.

    words.json mixes single words with multi-word entries ("тоос сорогч",
    "угаалгын машин", "оройн хоол"). Those have to be matched as phrases
    against a token span, or their parts get reported as missing vocabulary
    and someone adds a duplicate "машин" alongside "угаалгын машин".
    Longest phrase wins, and its tokens are consumed.
    """
    phrases = sorted(
        ((w, w["mn"].lower().split()) for w in words if " " in w["mn"]),
        key=lambda p: -len(p[1]),
    )
    singles = [w for w in words if " " not in w["mn"]]

    rows = []
    for s in sents:
        toks = tokens(s["mn"])
        matched, unmatched = [], []
        i = 0
        while i < len(toks):
            hit = None
            for w, parts in phrases:
                n = len(parts)
                if i + n <= len(toks) and all(
                    match_score(toks[i + k], {**w, "mn": parts[k]}) is not None for k in range(n)
                ):
                    hit = (w, n)
                    break
            if hit:
                w, n = hit
                matched.append((" ".join(toks[i:i + n]), w))
                i += n
                continue
            scored = [(match_score(toks[i], w), w) for w in singles]
            scored = [(s, w) for s, w in scored if s is not None]
            if scored:
                # exact headword first, then the longest matched stem
                matched.append((toks[i], max(scored, key=lambda x: x[0])[1]))
            else:
                unmatched.append(toks[i])
            i += 1
        rows.append({"s": s, "toks": toks, "matched": matched, "unmatched": unmatched})
    return rows


def best_entry(tok: str, words):
    scored = [(match_score(tok, w), w) for w in words if " " not in w["mn"]]
    scored = [(s, w) for s, w in scored if s is not None]
    return max(scored, key=lambda x: x[0])[1] if scored else None


def selftest(words) -> int:
    """Every known collision, pinned: a mis-tag teaches the wrong word."""
    fails = 0
    for line in Path("tools/matcher-gold.tsv").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        tok, want = line.split("	")[:2]
        got = best_entry(tok, words)
        got = got["mn"] if got else "-"
        if got != want:
            fails += 1
            print(f"FAIL {tok}: expected {want}, got {got}")
    print("matcher self-test: " + ("pass" if not fails else f"{fails} failed"))
    return 1 if fails else 0


def main() -> int:
    words, sents = load()
    if "--selftest" in sys.argv:
        return selftest(words)
    rows = analyse(words, sents)

    if "--unmatched" in sys.argv:
        c = Counter(t for r in rows for t in r["unmatched"])
        ex = {}
        for r in rows:
            for t in r["unmatched"]:
                ex.setdefault(t, r["s"]["mn"])
        print(f"{len(c)} token types have no entry in words.json\n")
        print(f"{'count':>5}  {'token':<16}  example")
        for tok, n in c.most_common():
            print(f"{n:>5}  {tok:<16}  {ex[tok]}")
        return 0

    if "--apply-tags" in sys.argv:
        # `ids` becomes every word the sentence actually contains, not just the
        # one it was written to teach. Comprehensibility is computed over this
        # list, so a partial list makes the readout meaningless; the scheduler
        # already derives what a sentence *teaches* from what is due or new.
        out, changed, partial = [], 0, 0
        for r in rows:
            ids = sorted({w["id"] for _, w in r["matched"]})
            s = dict(r["s"])
            # Tags set by hand while a question to Luna is open (ROADMAP 2c):
            # the matcher must not overwrite them until she has answered.
            if s.get("heldTags"):
                out.append(s)
                continue
            if ids != s["ids"]:
                changed += 1
            s["ids"] = ids
            if r["unmatched"]:
                # Honest marker: this sentence contains vocabulary the lexicon
                # does not know, so its comprehensibility is an overestimate.
                s["partial"] = True
                partial += 1
            else:
                s.pop("partial", None)
            out.append(s)
        Path(DATA / "sentences.json").write_text(
            json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"retagged {changed} of {len(out)} sentences")
        print(f"{partial} marked partial (still contain unknown tokens)")
        return 0

    if "--propose" in sys.argv:
        out = Path("tools/proposed-tags.tsv")
        lines = ["mn\ten\tcurrent_ids\tproposed_ids\tproposed_words\tuntagged_tokens"]
        for r in rows:
            ids = sorted({w["id"] for _, w in r["matched"]})
            names = " ".join(w["mn"] for _, w in r["matched"])
            lines.append("\t".join([
                r["s"]["mn"], r["s"]["en"],
                ",".join(map(str, r["s"]["ids"])),
                ",".join(map(str, ids)),
                names,
                " ".join(r["unmatched"]),
            ]))
        out.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"wrote {out} — {len(rows)} rows for review")
        print("nothing was applied to words.json or sentences.json")
        return 0

    tot_tok = sum(len(r["toks"]) for r in rows)
    tot_match = sum(len(r["matched"]) for r in rows)
    cur_tags = sum(len(r["s"]["ids"]) for r in rows)
    prop_tags = sum(len({w["id"] for _, w in r["matched"]}) for r in rows)
    untyped = len({t for r in rows for t in r["unmatched"]})

    print(f"words                     {len(words)}")
    print(f"sentences                 {len(sents)}")
    print(f"tokens                    {tot_tok}")
    print()
    print(f"tags now                  {cur_tags:>4}  ({cur_tags / len(sents):.2f} per sentence)")
    print(f"tags after stem matching  {prop_tags:>4}  ({prop_tags / len(sents):.2f} per sentence)")
    print(f"tokens covered            {tot_match:>4} / {tot_tok}  ({100 * tot_match / tot_tok:.0f}%)")
    print(f"token types with no entry {untyped:>4}")
    print()
    # A sentence is only fully measurable when every token maps to a word.
    full = sum(1 for r in rows if not r["unmatched"])
    print(f"sentences fully covered   {full:>4} / {len(sents)}  ({100 * full / len(sents):.0f}%)")
    print("  -> only these can yield a true comprehensibility figure today")
    print()
    dist = Counter(len(r["unmatched"]) for r in rows)
    print("untagged tokens per sentence:")
    for k in sorted(dist):
        print(f"  {k}: {dist[k]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
