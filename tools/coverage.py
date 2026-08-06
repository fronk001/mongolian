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
    "даа", "дээ", "доо", "дөө", "нд", "ад", "эд", "од", "өд", "д", "т", "г",
    # verb
    "дагаа", "дэгээ", "даг", "дэг", "дог", "дөг",
    "аач", "ээч", "ооч", "өөч", "лаа", "лээ", "лоо", "лөө",
    "сан", "сэн", "сон", "сөн", "на", "нэ", "но", "нө",
    "ж", "ч", "х", "я", "ё", "е", "ъя",
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
    if len(tok) < len(mn):
        return False

    VOWELS = "аэиоөуүы"
    # Verbs are listed in the -х infinitive; the stem is what precedes it.
    # (stem, vowel it dropped or None)
    stems = {(mn, None)}
    if mn.endswith("х"):
        stems.add((mn[:-1], None))
    for s, _ in list(stems):
        # A trailing vowel drops before a suffix: хаалга -> хаалгыг.
        if len(s) > 3 and s[-1] in VOWELS:
            stems.add((s[:-1], s[-1]))
        # Fleeting vowel in a final -Vн syllable: буйдан -> буйдныг.
        if len(s) > 3 and s[-1] == "н" and s[-2] in VOWELS:
            stems.add((s[:-2] + "н", s[-2]))

    for stem, dropped in stems:
        if len(stem) < 3 or not tok.startswith(stem):
            continue
        rest = tok[len(stem):]
        # If the "suffix" just puts the dropped vowel back, this is not an
        # inflection — it is a different word. будах/буда -> буд + аа = будаа
        # (rice), which is not a form of "to paint".
        if dropped and rest[:1] == dropped:
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
    rows = []
    for s in sents:
        toks = tokens(s["mn"])
        matched, unmatched = [], []
        for t in toks:
            hits = [w for w in words if stem_match(t, w["mn"])]
            if hits:
                # longest dictionary form wins: prefers 'хаалга' over a short
                # word that happens to share a prefix
                matched.append((t, max(hits, key=lambda w: len(w["mn"]))))
            else:
                unmatched.append(t)
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
