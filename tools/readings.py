"""
Tag the baby paragraphs in src/data/readings.json with lexicon ids.

    py tools/readings.py            # write `words` per line and `ids` per passage
    py tools/readings.py --check    # report only; exit 1 if a token is untagged

Each line gets `words`: its tokens in order, each `[token as written, id or
null]`, so the reader can gloss a tapped word and the scheduler can measure
how much of a passage Fred already knows. A passage's `ids` are every word it
contains — the same rule as sentences.json, because a partial list makes the
coverage figure meaningless. Uses the matcher in coverage.py (phrases first).
This is the only tool that writes those two fields.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, "tools")
import coverage as C  # noqa: E402

DATA = Path("src/data")


def tag_line(mn, words):
    """[(token as written, entry or None)] in order, phrases consumed whole."""
    raw = mn.split()
    toks = [re.sub(rf"[^{C.CYR}]", "", w).lower() for w in raw]
    phrases = sorted(((w, w["mn"].lower().split()) for w in words if " " in w["mn"]),
                     key=lambda p: -len(p[1]))
    out, i = [], 0
    while i < len(toks):
        hit = None
        for w, parts in phrases:
            n = len(parts)
            if i + n <= len(toks) and all(
                    C.match_score(toks[i + k], {**w, "mn": parts[k]}) is not None for k in range(n)):
                hit = (w, n)
                break
        if hit:
            w, n = hit
            out.append((" ".join(raw[i:i + n]), w))
            i += n
            continue
        e = C.best_entry(toks[i], words) if toks[i] else None
        out.append((raw[i], e))
        i += 1
    return out


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    words = json.loads((DATA / "words.json").read_text(encoding="utf-8"))
    readings = json.loads((DATA / "readings.json").read_text(encoding="utf-8"))
    missing = 0
    for r in readings:
        ids = set()
        for line in r["lines"]:
            tagged = tag_line(line["mn"], words)
            line["words"] = [[t, e["id"] if e else None] for t, e in tagged]
            for t, e in tagged:
                if e:
                    ids.add(e["id"])
                else:
                    missing += 1
                    print(f"untagged in {r['id']}: {t}")
        r["ids"] = sorted(ids)
    if "--check" not in sys.argv:
        (DATA / "readings.json").write_text(
            json.dumps(readings, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"tagged {len(readings)} passages")
    return 1 if missing and "--check" in sys.argv else 0


if __name__ == "__main__":
    sys.exit(main())
