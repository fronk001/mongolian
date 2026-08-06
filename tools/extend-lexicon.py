"""
Add the vocabulary and grammar that the sentence corpus already uses but
words.json never declared.

    py tools/extend-lexicon.py --dry-run
    py tools/extend-lexicon.py

Every gloss below was read off the corpus's own aligned English, not recalled
from memory: each Mongolian sentence in sentences.json ships with its English
translation, so the meaning of an unlisted token is recoverable from the pairs
it appears in. They are still machine-written, so every new entry carries
reviewed:false until Luna or Sarnai signs it off, and --sheet exports them for
that review.

drill:false marks closed-class grammar — copulas, pronouns, postpositions,
question particles. Those count toward comprehensibility and i+1 but are never
queued as flashcards, so the scheduler does not spend three weeks teaching
"байна" as an isolated card. Open-class vocabulary keeps drill:true: өрөө
(room) and хувцас (clothes) are words Fred should actually be taught, and they
extend the content runway the roadmap says is the binding constraint.
"""
import json
import sys
from pathlib import Path

DATA = Path("src/data/words.json")

# (mongolian, english, drill)
GRAMMAR = [
    ("байна", "is / are", False),
    ("байхгүй", "there is no / is not", False),
    ("би", "I", False),
    ("чи", "you (informal)", False),
    ("та", "you (polite)", False),
    ("энэ", "this", False),
    ("тэр", "that", False),
    ("үүнийг", "this (object form)", False),
    ("надад", "to me", False),
    ("минь", "my", False),
    ("чинь", "your", False),
    ("манай", "our", False),
    ("дээр", "on / above", False),
    ("дараа", "after", False),
    ("дараагийн", "next", False),
    ("ойролцоо", "near", False),
    ("энд", "here", False),
    ("хаана", "where", False),
    ("хэн", "who", False),
    ("юу", "what", False),
    ("вэ", "question particle", False),
    ("бэ", "question particle", False),
    ("уу", "yes/no question particle", False),
    ("бүр", "every", False),
    ("бүү", "do not (prohibitive)", False),
    ("одоо", "now", False),
    ("өнөөдөр", "today", False),
    ("өнөө", "this (of time)", False),
    ("хамтдаа", "together", False),
    ("гэдэг", "called / that is", False),
]

VOCABULARY = [
    # rooms and the house
    ("өрөө", "room", True),
    ("зочны өрөө", "living room", True),
    ("гал тогоо", "kitchen", True),
    ("байшин", "house", True),
    ("цонх", "window", True),
    # time
    ("өдөр", "day", True),
    ("өглөө", "morning", True),
    ("орой", "evening", True),
    ("гараг", "day of the week", True),
    ("бямба", "Saturday", True),
    ("ням", "Sunday", True),
    ("цаг", "hour / time", True),
    ("долоо", "seven", True),
    ("хоног", "day (24 hours)", True),
    # people
    ("ээж", "mother", True),
    ("аав", "father", True),
    ("хүүхэд", "child", True),
    # things
    ("тоос", "dust", True),
    ("хувцас", "clothes", True),
    ("хог", "rubbish / trash", True),
    # qualities
    ("зөөлөн", "soft", True),
    ("урт", "long", True),
    ("өндөр", "tall / high", True),
    ("хурдан", "fast", True),
    ("нээлттэй", "open", True),
    ("дуртай", "to like / fond of", True),
    # verbs the corpus uses outside the existing phrase entries
    ("унтах", "to sleep", True),
    ("идэх", "to eat", True),
    ("уух", "to drink", True),
    ("нээх", "to open", True),
    ("хаах", "to close", True),
    ("өгөх", "to give", True),
    ("авах", "to take / to buy", True),
    ("хаях", "to throw away", True),
    ("сорох", "to vacuum / to suck", True),
    ("арчих", "to wipe", True),
    ("хийх", "to do / to make", True),
    ("явах", "to go", True),
    ("тавих", "to put", True),
    ("ярих", "to tell / to speak", True),
    ("алхах", "to walk", True),
    ("хүсэх", "to want", True),
    ("өнгөрүүлэх", "to spend (time)", True),
]

# Things a machine should not decide. Surfaced in the review sheet.
FLAGS = [
    ("сороогоч", "sentences.json spells the vacuum verb two ways: "
                 "'Тоос сорогч хаана байна?' vs 'Тоос сороогоч.' — one is "
                 "likely a typo. Sarnai to confirm which."),
    ("уу", "'уу' is both the yes/no question particle and a form of уух "
           "(to drink). 'Та цай уух уу?' contains both. The matcher cannot "
           "tell them apart and will prefer уух."),
]


def main() -> int:
    dry = "--dry-run" in sys.argv
    words = json.loads(DATA.read_text(encoding="utf-8"))
    have = {w["mn"].lower() for w in words}
    next_id = max(w["id"] for w in words) + 1

    added, skipped = [], []
    for mn, en, drill in GRAMMAR + VOCABULARY:
        if mn.lower() in have:
            skipped.append(mn)
            continue
        entry = {"id": next_id, "mn": mn, "en": en, "reviewed": False}
        if not drill:
            entry["drill"] = False
        added.append(entry)
        have.add(mn.lower())
        next_id += 1

    if "--sheet" in sys.argv:
        # Read what is actually in words.json awaiting sign-off, so the sheet
        # is correct whether or not the entries have been applied yet.
        pending = [w for w in words if w.get("reviewed") is False] or added
        out = Path("tools/lexicon-review.tsv")
        lines = ["id\tmn\ten\tdrill\treviewed\tnote"]
        flags = dict(FLAGS)
        for e in pending:
            lines.append("\t".join([
                str(e["id"]), e["mn"], e["en"],
                "no" if e.get("drill") is False else "yes",
                "NO — needs sign-off", flags.get(e["mn"], ""),
            ]))
        for mn, note in FLAGS:
            if mn not in {e["mn"] for e in pending}:
                lines.append("\t".join(["-", mn, "", "", "", note]))
        out.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"wrote {out} — {len(pending)} entries for Luna/Sarnai to confirm")
        return 0

    print(f"{len(added)} new entries, {len(skipped)} already present")
    print(f"  grammar (drill:false): {sum(1 for e in added if e.get('drill') is False)}")
    print(f"  vocabulary            : {sum(1 for e in added if e.get('drill') is not False)}")
    if skipped:
        print(f"  skipped as duplicates : {', '.join(skipped)}")
    if dry:
        print("\n--dry-run: words.json not written")
        return 0

    DATA.write_text(
        json.dumps(words + added, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"\nwrote {DATA} — {len(words)} -> {len(words) + len(added)} entries")
    print("every new entry is reviewed:false until confirmed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
