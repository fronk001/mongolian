# Content policy

How Mongolian gets into the app. The app is public (GitHub Pages) and the
textbooks it follows are commercial, so this is both a copyright rule and a
quality rule.

## The books

| Code | Book | Printed page = |
|---|---|---|
| Beg | *Beginner Mongolian Part 1*, Nomiin Ger Mongolian Language School | PDF page − 1 |
| Surv | *Survival Book 023* | PDF page − 2 |
| MM | Gaunt & Bayarmandakh, *Modern Mongolian: A course book* (Routledge 2004) | PDF page − 12 |
| PC | Peace Corps *Mongolian Language Lessons* | PDF page |

Their extracted text lives in `C:\Users\frede\Documents\mongolian-books\`,
**outside the repo**, with `research\*.json` inventories of every reading
text, exercise type and grammar sequence. It is never committed.

The tutor's *Booklet, words 90–200* was written for Fred and is the source of
the original 164 sentences; it is not one of "the books" below.

## Rules

1. **Nothing is copied.** No sentence, dialogue, passage or exercise from a
   book enters `src/` or any committed file. The app follows the books'
   *syllabus, topics, grammar order and exercise formats*, and writes its own
   sentences.
2. **Cite the page.** Content modelled on a book names the format or grammar
   point it borrows, by printed page with the PDF page in brackets:
   `MM p182 [PDF 194]`. Words carry it in `src`; rules in `alternatives.py`
   carry it in a comment.
3. **Glosses are looked up, never recalled.** A word's English comes from a
   book's glossary or lesson list (MM printed 181–220 is the cleanest), and
   `src` says which.
4. **The gate runs before a commit.** `py tools/overlap.py` checks every
   Mongolian line in `src/data` and `content/drafts` against the books and
   blocks any 5-word run shared with a book, and any whole sentence of 4+
   words that appears in one. Three-word sentences («Энэ ном сайн») recur in
   every beginner book by coincidence and are nobody's expression. Set phrases
   a learner must know verbatim are allowed in `tools/overlap-allow.tsv`, each
   with its reason. `--selftest` runs in CI; the full check needs the books
   and runs locally.
5. **Drafts stay out of the repo.** New sentences and passages are written in
   `content/drafts/` (gitignored) and enter `src/data` only after Luna or
   Sarnai has said yes on a review sheet and the gate is clear.
6. **What may go live before review** (plan decision 17): single words read
   off the books' own lists, and rule tables, flagged `reviewed: false`.
   Personal words (голланд, хадам), sentences, passages, grammar topics,
   alternative orders and generated answers wait for a native speaker.
7. **Ids are never reused** (`content/ids.json`). A rejected word is deleted
   and its id stays spent; a corrected spelling or gloss keeps its id.
8. **Real names**: first names only (Фред, Сарнай) in published content.
