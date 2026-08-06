"""
Content coverage report for src/data.

Every sentence currently carries exactly one tagged word id, so the app's
"comprehensible" and "i+N" readouts are computed over one word out of ~3 and
mean almost nothing. This measures the real picture and produces the worklist
needed to fix it.

    py tools/coverage.py                 # summary
    py tools/coverage.py --unmatched     # tokens with no word entry, by frequency
    py tools/coverage.py --propose       # proposed tags per sentence, as TSV

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


# Case, plural and verb endings, longest first. Not a complete grammar — just
# enough to tell an inflection from a coincidence. Seeds ROADMAP item 4.
SUFFIXES = [
    # case
    "ийнх", "ыгаа", "ийгээ", "аасаа", "ээсээ", "оосоо", "өөсөө",
    "аар", "ээр", "оор", "өөр", "аас", "ээс", "оос", "өөс",
    "тай", "тэй", "той", "төй", "ийг", "ыг", "ийн", "ын", "ний", "ны",
    "гийн", "гийг", "гүй", "н", "ан", "эн", "он", "өн",
    "даа", "дээ", "доо", "дөө", "нд", "ад", "эд", "од", "өд", "д", "т", "г",
    "анд", "энд", "онд", "өнд", "ганд", "гэнд", "руу", "рүү",
    # plural
    "ууд", "үүд", "нууд", "нүүд", "нар", "нэр",
    # verb
    "дагаа", "дэгээ", "даг", "дэг", "дог", "дөг",
    "аач", "ээч", "ооч", "өөч", "ач", "эч", "оч", "өч",
    "лаа", "лээ", "лоо", "лөө",
    "сан", "сэн", "сон", "сөн", "на", "нэ", "но", "нө",
    "аад", "ээд", "оод", "өөд", "гаач", "гээч", "гооч", "гөөч",
    "аарай", "ээрэй", "оорой", "өөрэй", "аарэй", "уулаа", "үүлээ",
    "ж", "ч", "х", "я", "ё", "е", "ъя", "ъё",
    # possessive / reflexive
    "маа", "мээ", "аа", "ээ", "оо", "өө",
]


def stem_match(tok: str, mn: str) -> bool:
    """
    Mongolian is agglutinative: suffixes attach to a mostly-stable stem, so an
    inflected token usually starts with its dictionary form (хаалга ->
    хаалгыг, өрөө -> өрөөнд).

    A bare prefix test is not enough. It pairs өндөр (tall) with өндөг (egg),
    будаа (rice) with будах (to paint) and сүү (milk) with сүүл (tail) — all
    of which would teach the wrong gloss. So the leftover after the shared
    stem must actually look like an ending, and the token may not be shorter
    than the dictionary form.
    """
    mn = mn.lower()
    if tok == mn:
        return True

    VOWELS = "аэиоөуүы"
    # Verbs are listed in the -х infinitive; the stem is what precedes it.
    # (stem, dropped vowel or None, why it dropped)
    stems = {(mn, None, None)}
    if mn.endswith("х"):
        stems.add((mn[:-1], None, None))
    for s, _, _ in list(stems):
        if len(s) < 3:
            continue
        # A trailing vowel drops before a suffix: хаалга -> хаалгыг.
        if s[-1] in VOWELS:
            stems.add((s[:-1], s[-1], "final"))
            # -и becomes -ь in the imperative: тавих -> тавь, ярих -> ярь.
            if s[-1] == "и":
                stems.add((s[:-1] + "ь", None, None))
        # Fleeting vowel: the vowel of a final -VC syllable drops before a
        # suffix. буйдан -> буйдныг, хуудас -> хувцсаа, ургамал -> ургамлыг.
        elif s[-2] in VOWELS:
            stems.add((s[:-2] + s[-1], s[-2], "fleeting"))

    for stem, dropped, why in stems:
        # 2 is the floor, not 3: үг (word) is a real entry and үг + ийг must
        # still resolve. Short stems are safe because the leftover must be a
        # listed ending.
        if len(stem) < 2 or len(tok) < len(stem) or not tok.startswith(stem):
            continue
        rest = tok[len(stem):]
        # If a dropped *final* vowel is simply put back, this is not an
        # inflection but a different word: будах/буда -> буд + аа = будаа
        # (rice), which is no form of "to paint". A fleeting vowel is exempt —
        # хувцас -> хувцс + аа = хувцсаа really is "my clothes".
        if why == "final" and dropped and rest[:1] == dropped:
            continue
        if rest == "" or rest in SUFFIXES:
            return True
        # A stem-final vowel merges with a suffix that opens on the same
        # vowel: цэвэрлэ + ээч -> цэвэрлээч, so only "эч" is left over.
        # Only for multi-character leftovers: allowing a single one turns
        # буда + "а" into a form of будах, when будаа is rice. A missed tag
        # just lands on the review worklist; a wrong tag teaches a wrong word.
        if len(rest) >= 2 and stem[-1] in VOWELS and (stem[-1] + rest) in SUFFIXES:
            return True
    return False


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
                    stem_match(toks[i + k], parts[k]) for k in range(n)
                ):
                    hit = (w, n)
                    break
            if hit:
                w, n = hit
                matched.append((" ".join(toks[i:i + n]), w))
                i += n
                continue
            hits = [w for w in singles if stem_match(toks[i], w["mn"])]
            if hits:
                # longest dictionary form wins, so 'хаалга' beats a short word
                # that happens to share a prefix
                matched.append((toks[i], max(hits, key=lambda w: len(w["mn"]))))
            else:
                unmatched.append(toks[i])
            i += 1
        rows.append({"s": s, "toks": toks, "matched": matched, "unmatched": unmatched})
    return rows


def main() -> int:
    words, sents = load()
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
