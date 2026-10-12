"""
Copyright gate: no textbook text enters the app.

The app is published on GitHub Pages and the textbooks are commercial, so
every Mongolian line the app ships is original writing that follows the
books' syllabus, topics and exercise formats — never their sentences. This
checks that, before anything modelled on a book is committed. See
docs/CONTENT.md.

A line is blocked when
  * it shares any run of 5 consecutive words with a book, or
  * the whole line (4 words or more) appears in a book as a sentence.
Three-word sentences («Энэ ном сайн», "this book is good") recur in every
beginner book by coincidence; they are not anyone's expression, and a
beginner course cannot be written without them. Single letters (suffix
tables in grammar notes) are not words.
Short set phrases a learner must know verbatim (greetings, "what is your
name?") are allowed by `tools/overlap-allow.tsv`, each with its reason.

    py tools/overlap.py                     # src/data + content/drafts
    py tools/overlap.py FILE.json ...       # specific files
    py tools/overlap.py --books DIR         # default: ~/Documents/mongolian-books
    py tools/overlap.py --selftest          # no books needed (CI)

The book text lives outside the repo (never committed); the selftest runs on
built-in samples, so CI can check the checker without it.
"""
import json
import re
import sys
from pathlib import Path

N = 5
DEFAULT_BOOKS = Path.home() / "Documents" / "mongolian-books"
# The tutor's booklet is the source of the app's own sentences, written for
# Fred, and the word lists are lists: neither is a book to keep text out of.
SKIP = ("Booklet", "COMMON")
CYR = re.compile(r"[а-яёөү]+")
# A suffix written as notation (-тай, -ыг) is grammar, not text.
WORD = re.compile(r"(?<![-а-яёөү])[а-яёөү]{2,}")


def words(text: str) -> list[str]:
    return WORD.findall(text.lower())


def sentences(text: str):
    for s in re.split(r"[.!?\n]+", text):
        w = words(s)
        if w:
            yield w


def index(texts):
    grams, whole = set(), set()
    for text in texts:
        w = words(text)
        grams.update(tuple(w[i:i + N]) for i in range(len(w) - N + 1))
        whole.update(tuple(s) for s in sentences(text) if len(s) >= 4)
    return grams, whole


def check(line: str, grams, whole, allow=frozenset()):
    """The reason `line` is blocked, or None."""
    w = words(line)
    if " ".join(w) in allow:
        return None
    if len(w) >= 4 and tuple(w) in whole:
        return "whole sentence appears in a book"
    for i in range(len(w) - N + 1):
        if tuple(w[i:i + N]) in grams:
            return "shares 5 words with a book: " + " ".join(w[i:i + N])
    return None


def mongolian_lines(obj):
    """Every Mongolian string in a content file, wherever it sits."""
    if isinstance(obj, str):
        if CYR.search(obj.lower()):
            yield obj
    elif isinstance(obj, list):
        for x in obj:
            yield from mongolian_lines(x)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k not in ("src", "en", "note", "id", "sid"):
                yield from mongolian_lines(v)


def load_allow() -> frozenset:
    p = Path("tools/overlap-allow.tsv")
    if not p.exists():
        return frozenset()
    out = set()
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.startswith("#"):
            out.add(" ".join(words(line.split("\t")[0])))
    return frozenset(out)


def selftest() -> int:
    book = "Миний нэр Дорж. Би их сургуульд сурдаг оюутан. Манай гэр бүл таван хүнтэй.\nСайн байна уу?"
    grams, whole = index([book])
    allow = frozenset({"сайн байна уу"})
    cases = [
        ("Би их сургуульд сурдаг оюутан.", True),       # whole sentence
        ("Тэр хэлэв: би их сургуульд сурдаг оюутан.", True),  # 5-word run
        ("Миний нэр Фред.", False),                     # 3 words, not the book's sentence
        ("Миний нэр Дорж.", False),                     # a 3-word sentence is nobody's expression
        ("Манай гэр бүл дөрвөн хүнтэй.", False),         # 4 shared words only
        ("Сайн байна уу?", False),                      # allowed set phrase
    ]
    fails = 0
    for line, blocked in cases:
        got = check(line, grams, whole, allow) is not None
        if got != blocked:
            fails += 1
            print(f"FAIL {line}: expected {'blocked' if blocked else 'clear'}")
    print("overlap self-test: " + ("pass" if not fails else f"{fails} failed"))
    return 1 if fails else 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if "--selftest" in args:
        return selftest()
    books = DEFAULT_BOOKS
    if "--books" in args:
        i = args.index("--books")
        books = Path(args[i + 1])
        del args[i:i + 2]
    texts = [p.read_text(encoding="utf-8") for p in sorted(books.glob("*.txt"))
             if not any(s in p.name for s in SKIP)]
    if not texts:
        print(f"no book text found in {books} — nothing to check against")
        return 1
    grams, whole = index(texts)
    allow = load_allow()
    files = [Path(a) for a in args] or (
        [Path("src/data") / f for f in ("sentences.json", "grammar.json", "readings.json")]
        + sorted(Path("content/drafts").glob("*.json")) if Path("content/drafts").exists() else
        [Path("src/data") / f for f in ("sentences.json", "grammar.json", "readings.json")])
    blocked = 0
    for f in files:
        if not f.exists():
            continue
        for line in mongolian_lines(json.loads(f.read_text(encoding="utf-8"))):
            why = check(line, grams, whole, allow)
            if why:
                blocked += 1
                print(f"BLOCKED {f.name}: {line}  — {why}")
    print(f"checked against {len(texts)} books: " + ("clear" if not blocked else f"{blocked} blocked"))
    return 1 if blocked else 0


if __name__ == "__main__":
    sys.exit(main())
