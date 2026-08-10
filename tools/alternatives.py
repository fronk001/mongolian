"""
Generate the accepted-answer sets for sentences.json.

Once the app is live there is nobody to appeal to, so every answer that is
correct has to be written down in advance. This script produces `alt.en` and
`alt.mn` for each sentence from two sources:

  RULES  — mechanical alternations verified against "Modern Mongolian: A
           course book" (Sanders & Bat-Ireedui). Each rule cites its page.
  HAND   — phrasings and judgement calls that no rule can produce.

    py tools/alternatives.py            # rewrite src/data/sentences.json
    py tools/alternatives.py --dry      # print what would change

Everything written here is machine-generated and marked `altReviewed: false`
on each sentence until Luna or Sarnai confirms it — same convention as the
`reviewed: false` lexicon entries. The English is mine and is safe; the
Mongolian is rule-derived and is the part that needs a native eye.
"""
import json
import re
import sys
from pathlib import Path

SRC = Path("src/data")

# ---------------------------------------------------------------- lexicon

words = json.loads((SRC / "words.json").read_text(encoding="utf-8"))
BYID = {w["id"]: w for w in words}
ADJECTIVES = {
    "цэвэр", "бохир", "шинэ", "хуучин", "том", "жижиг", "урт", "богино",
    "дулаан", "хүйтэн", "хуурай", "нойтон", "зөөлөн", "хатуу", "сайн", "муу",
    "гоё", "сайхан", "өндөр", "нам", "нээлттэй", "хаалттай", "улаан", "цагаан",
    "хар", "ногоон", "шар", "цэнхэр", "хурдан", "удаан",
}


def strip_final(s):
    """Sentence text without its final punctuation, plus that punctuation."""
    m = re.match(r"^(.*?)([.!?]*)$", s.strip(), re.S)
    return m.group(1), m.group(2)


# ---------------------------------------------------------------- MN rules
# p18  "The accusative can be and often is omitted from the object noun.
#       Thus 'би кино үзнэ' and 'би киног үзнэ' are both legitimate."
# p18  "The 'байна' can also be omitted, so that 'би багш байна' and
#       'би багш' can both mean 'I am a teacher'."
# p74  "Миний аав их сайн хүн" OR "Аав минь их сайн хүн" — both correct.
# p97  -аарай/-ээрэй and -аач/-ээч are both polite request forms.
#
# NOT applied, deliberately (p18): inverting adjective and noun changes the
# meaning — "тэр хана ногоон" is "that wall is green", "ногоон хана" is "a
# green wall". Word order is never permuted by these rules.


def mn_drop_copula(mn, en):
    """«Шал цэвэр байна» -> «Шал цэвэр». Predicate adjectives only."""
    body, dot = strip_final(mn)
    if not body.endswith(" байна"):
        return None
    stem = body[: -len(" байна")]
    last = stem.split()[-1] if stem.split() else ""
    # Existentials ("there is X on Y") and progressives ("унтаж байна") need
    # байна to stand as sentences at all; only a bare adjective may drop it.
    if last not in ADJECTIVES:
        return None
    if re.match(r"^\s*there\b", en, re.I):
        return None
    return stem + dot


def mn_add_copula(mn, en):
    """«Толь цэвэр» -> «Толь цэвэр байна». Adding the copula is always safe."""
    body, dot = strip_final(mn)
    if body.endswith(" байна") or body.endswith("байхгүй"):
        return None
    last = body.split()[-1] if body.split() else ""
    if last not in ADJECTIVES:
        return None
    return body + " байна" + dot


ACC = ("ийг", "ыг", "г")


def mn_drop_accusative(mn, ids):
    """
    «Хаалгыг хаагаач» -> «Хаалга хаагаач» (p18).

    The bare form is looked up among the words the sentence declares, never
    derived by chopping the suffix off: хаалга + -ыг fuses to хаалгыг, so
    removing "ыг" mechanically yields «хаалг», which is not a word. Requiring
    the stem to match a real lexicon entry makes the rule fail safe — хуудсыг
    and ургамлыг simply produce no alternative rather than a broken one.
    """
    body, dot = strip_final(mn)
    toks = body.split()
    for i, t in enumerate(toks):
        low = t.lower()
        if not low.endswith(ACC):
            continue
        # Mongolian is verb-final, so an accusative object is never the last
        # token. Without this, «угаадаг» looked like an inflected noun.
        if i == len(toks) - 1:
            continue
        for wid in ids:
            w = BYID.get(wid)
            if not w:
                continue
            bare = w["mn"]
            # Verbs are stored as infinitives in -х. «угаадаг» starts with
            # «угаа» and ends in -г, so it matched «угаах» and was rewritten
            # to the infinitive. Verbal nouns under хүсэх («будахыг») keep
            # their accusative too, so the same guard covers both.
            if bare.endswith("х"):
                continue
            if len(bare) < 2 or low == bare.lower() or len(low) <= len(bare):
                continue
            if not low.startswith(bare[:-1].lower()):
                continue
            form = bare[0].upper() + bare[1:] if t[0].isupper() else bare
            return " ".join(toks[:i] + [form] + toks[i + 1:]) + dot
    return None


IMP = [("аач", "аарай"), ("ээч", "ээрэй"), ("ооч", "оорой"), ("өөч", "өөрэй")]


def mn_imperative_variant(mn):
    """«хаагаач» -> «хаагаарай» (p97). Vowel harmony carries over unchanged."""
    body, dot = strip_final(mn)
    toks = body.split()
    if not toks:
        return None
    last = toks[-1]
    for a, b in IMP:
        if last.endswith(a):
            return " ".join(toks[:-1] + [last[: -len(a)] + b]) + dot
    return None


def mn_possessive_swap(mn):
    """«Хашаа минь жижиг» -> «Миний хашаа жижиг» (p74)."""
    body, dot = strip_final(mn)
    toks = body.split()
    for particle, adj in (("минь", "Миний"), ("чинь", "Чиний")):
        if particle in toks:
            i = toks.index(particle)
            if i == 0:
                continue
            noun = toks[i - 1]
            rest = toks[: i - 1] + toks[i + 1:]
            out = [adj, noun.lower()] + [t for t in rest]
            # the old first word loses its capital only if it moved
            return " ".join(out) + dot
    return None


MN_RULES = [
    ("copula dropped (p18)", lambda mn, en, ids: mn_drop_copula(mn, en)),
    ("copula added (p18)", lambda mn, en, ids: mn_add_copula(mn, en)),
    ("accusative dropped (p18)", lambda mn, en, ids: mn_drop_accusative(mn, ids)),
    ("polite imperative -аарай (p97)", lambda mn, en, ids: mn_imperative_variant(mn)),
    ("possessive adjective (p74)", lambda mn, en, ids: mn_possessive_swap(mn)),
]

# ---------------------------------------------------------------- EN rules

CONTRACTIONS = [
    ("there is", "there's"), ("it is", "it's"), ("i am", "i'm"),
    ("do not", "don't"), ("does not", "doesn't"), ("is not", "isn't"),
    ("are not", "aren't"), ("cannot", "can't"), ("let us", "let's"),
    ("what is", "what's"), ("where is", "where's"), ("who is", "who's"),
    ("i will", "i'll"), ("i have", "i've"),
]


def _sub_keep_case(pattern, repl, text):
    """
    re.sub with re.I lowercases the replacement; put the capitals back.

    Grading normalises case anyway, but these strings are read by a human
    reviewing the file, and "Today i'll do laundry" looks like a mistake.
    """
    out = re.sub(re.escape(pattern), repl, text, flags=re.I, count=1)
    if text[:1].isupper() and out[:1].islower():
        out = out[0].upper() + out[1:]
    return re.sub(r"\bi\b(?=$|[\s',.!?])", "I", out)


def en_contractions(en):
    """
    Both spellings of a contraction are the same answer.

    Applied to base forms only, never to another rule's output: chaining
    turned "There isn't any salt" into "There is not any salt" and then into
    "there'sn't any salt", which would have been accepted as correct.
    """
    out = []
    low = en.lower()
    for full, short in CONTRACTIONS:
        if full in low:
            out.append(_sub_keep_case(full, short, en))
        if short in low:
            out.append(_sub_keep_case(short, full, en))
    return [o for o in out if "'" not in o.replace("'s", "").replace("'t", "")
            .replace("'m", "").replace("'ll", "").replace("'ve", "").replace("'re", "")
            and "sn't" not in o]




# ---------------------------------------------------------------- HAND
# Phrasings and judgement calls no rule produces. Keyed by the canonical
# Mongolian so reordering sentences.json cannot silently misalign them.

HAND = {
"Хаалгыг хаагаач.": {
    "en": ["Close the door, please.", "Please shut the door.", "Shut the door, please.", "Close the door."],
    "mn": ["Хаалгаа хаагаач."]},
"Шал цэвэр байна.": {"en": ["The floor's clean.", "The floor is tidy."]},
"Хана дээр зураг байна.": {
    "en": ["There is a painting on the wall.", "A picture is on the wall.", "There's a picture hanging on the wall."]},
"Тааз дээр чийдэн байна.": {"en": ["There is a light on the ceiling.", "A lamp is on the ceiling."]},
"Шат шинэ.": {"en": ["The stairs are new.", "The staircase is new.", "The stair is new."]},
"Хашаа минь жижиг.": {"en": ["My yard is little.", "My fence is small."]},
"Ширээ том.": {"en": ["The table's big.", "The table is large."]},
"Хаалга нээлттэй байна.": {"en": ["The door's open.", "The door is unlocked."]},
"Энэ сандал шинэ.": {"en": ["This is a new chair."]},
"Орон минь дулаан.": {"en": ["My bed's warm."]},
"Муур буйдан дээр унтаж байна.": {
    "en": ["The cat is sleeping on the couch.", "The cat sleeps on the sofa.", "The cat's asleep on the sofa."]},
"Шүүгээг нээгээч.": {"en": ["Open the cabinet, please.", "Please open the closet.", "Open the cupboard, please."],
    "mn": ["Шүүгээгээ нээгээч."]},
"Толь цэвэр.": {"en": ["The mirror's clean."]},
"Дэр минь хаана байна?": {"en": ["Where's my pillow?", "Where is my cushion?"]},
"Хөнжил дулаан.": {"en": ["The blanket's warm.", "The quilt is warm."]},
"Сандал өгөөч.": {"en": ["Give me the chair, please.", "Pass me the chair.", "Please pass the chair."]},
"Тааз өндөр.": {"en": ["The ceiling's high.", "The ceiling is tall."]},
"Хивсийг цэвэрлээч.": {"en": ["Clean the carpet, please.", "Please clean the rug.", "Clean the rug."]},
"Энэ зураг гоё.": {"en": ["This picture is nice.", "This painting is beautiful.", "This is a beautiful picture."]},
"Чийдэн жижиг.": {"en": ["The lamp's small.", "The light is small."]},
"Би зуух дээр хоол хийдэг.": {"en": ["I make food on the stove.", "I use the stove to cook.", "I cook on the cooker."]},
"Хөргөгчийг нээгээч.": {"en": ["Please open the fridge.", "Open the refrigerator, please.", "Open the fridge."]},
"Угаалгын машин шинэ.": {"en": ["The washer is new.", "The washing machine's new."]},
"Тоос сорогч хаана байна?": {"en": ["Where's the vacuum cleaner?", "Where is the vacuum?", "Where is the hoover?"]},
"Хивс бохир.": {"en": ["The rug is dirty.", "The carpet's dirty."]},
"Муур орон дээр унтдаг.": {"en": ["The cat sleeps in the bed.", "Cats sleep on the bed."]},
"Энэ шат жижиг.": {"en": ["This staircase is small.", "These stairs are small."]},
"Муур хашаанд байна.": {"en": ["The cat's in the yard.", "The cat is in the garden."]},
"Муур шал дээр байна.": {"en": ["The cat's on the floor."]},
"Энэ дэр зөөлөн.": {"en": ["This cushion is soft.", "This pillow's soft."]},
"Түлхүүр минь хаана байна?": {"en": ["Where's my key?", "Where are my keys?"]},
"Цахилгаан байхгүй.": {"en": ["There's no electricity.", "There is no power.", "The power is out.", "There is no electricity."]},
"Өрөө дулаан.": {"en": ["The room's warm."]},
"Гэрэл сайн.": {"en": ["The light's good.", "The lighting is good."]},
"Ширээ дээр хайрцаг байна.": {"en": ["There's a box on the table.", "A box is on the table."]},
"Уут минь шинэ.": {"en": ["My bag's new.", "My sack is new."]},
"Түлхүүр өгөөч.": {"en": ["Give me the key, please.", "Pass me the key.", "Please give me the keys."]},
"Шүүгээ том.": {"en": ["The closet is big.", "The cupboard is big.", "The cabinet's big."]},
"Өрөөнд чийдэн байна.": {"en": ["There's a lamp in the room.", "There is a light in the room."]},
"Цоож шинэ.": {"en": ["The lock's new."]},
"Хонх шинэ.": {"en": ["The bell is new.", "The doorbell's new."]},
"Тагт дээр цэцэг байна.": {
    "en": ["There is a flower on the balcony.", "There's a flower on the balcony.", "There are flowers on the balcony."]},
"Өрөөг цэвэрлээч.": {"en": ["Clean the room, please.", "Please tidy the room.", "Clean the room."]},
"Үүнийг угаагаач.": {"en": ["Wash this, please.", "Please wash it.", "Wash this."]},
"Би оройн хоолны дараа аяга угаадаг.": {
    "en": ["I wash the dishes after dinner.", "I do the washing up after dinner.", "After dinner I do the dishes."]},
"Шал арчаач.": {"en": ["Mop the floor, please.", "Please wipe the floor.", "Wipe the floor.", "Mop the floor."]},
"Цоож хаана байна?": {"en": ["Where's the lock?"]},
"Уут чинь хаана байна?": {"en": ["Where's your bag?", "Where is your bag?"]},
"Зочны өрөөнд зураг байна.": {
    "en": ["There's a picture in the living room.", "There is a painting in the living room."]},
# сорогч / сороогоч / соордог spell this verb three ways across the corpus —
# CLAUDE.md flags it as needing a native speaker. No variants invented here.
"Тоос сороогоч.": {"en": ["Please hoover.", "Vacuum, please.", "Please do the vacuuming."]},
"Ширээний тоос арчаач.": {"en": ["Please wipe the table.", "Dust the table, please.", "Dust the table."]},
"Өнөөдөр би хувцас угаана.": {
    "en": ["I will do the laundry today.", "Today I am doing laundry.", "I'm doing laundry today.", "Today I will wash clothes."]},
"Би хувцсаа индүүддэг.": {"en": ["I iron my clothes.", "I do the ironing."]},
"Өнөө орой би хоол хийнэ.": {
    "en": ["I will cook tonight.", "I am cooking this evening.", "Tonight I will cook.", "I'll cook this evening."]},
"Хогоо хаягаач.": {"en": ["Take out the trash, please.", "Please take out the rubbish.", "Take out the rubbish."]},
"Ор засаач.": {"en": ["Make the bed, please.", "Please make your bed.", "Make the bed."]},
"Би долоо хоног бүр тоос соордог.": {"en": ["I vacuum weekly.", "Every week I vacuum.", "I hoover every week."]},
"Хөргөгч шинэ.": {"en": ["The fridge is new.", "The refrigerator's new."]},
"Хөнжил минь дулаан.": {"en": ["My blanket's warm.", "My quilt is warm."]},
"Тоос сорогч шинэ.": {"en": ["The vacuum is new.", "The hoover is new."]},
"Би өдөр бүр угаадаг.": {"en": ["I wash daily.", "Every day I wash."]},
"Цонхыг цэвэрлээч.": {"en": ["Clean the window, please.", "Please clean the windows.", "Clean the window."]},
"Би хаалгыг засна.": {"en": ["I will repair the door.", "I'll fix the door.", "I am going to fix the door."]},
"Би хана будахыг хүсэж байна.": {"en": ["I would like to paint the wall.", "I want to paint the walls."]},
"Өрөө минь эмх цэгцтэй.": {"en": ["My room is organized.", "My room's tidy.", "My room is neat."]},
"Гал тогоо эмх замбараагүй байна.": {
    "en": ["The kitchen's messy.", "The kitchen is a mess.", "The kitchen is untidy."]},
"Шал бохир.": {"en": ["The floor's dirty."]},
"Өрөө цэвэр.": {"en": ["The room's clean.", "The room is tidy."]},
"Би бямба гарагт цонх цэвэрлэдэг.": {
    "en": ["I clean the window on Saturday.", "On Saturdays I clean the windows.", "I clean windows on Saturday."]},
"Хувцас минь хуурай.": {"en": ["My clothes are dry.", "My clothing is dry."]},
"Шал нойтон.": {"en": ["The floor's wet."]},
"Хоол сайн.": {"en": ["The meal is good.", "The food's good.", "The food is nice."]},
"Би өглөө өглөөний хоол иддэг.": {
    "en": ["I have breakfast in the morning.", "In the morning I eat breakfast.", "I eat breakfast in the mornings."]},
"Үдийн хоол сайн.": {"en": ["The lunch is good.", "Lunch is nice."]},
"Оройн хоол долоон цагт.": {
    "en": ["Dinner is at seven o'clock.", "Dinner is at 7.", "Dinner's at seven.", "Supper is at seven."]},
"Би мах дуртай.": {"en": ["I love meat.", "I am fond of meat.", "I like meat."]},
"Шал хуурай.": {"en": ["The floor's dry."]},
"Ээж минь сайхан хоол хийдэг.": {
    "en": ["My mother cooks nicely.", "My mum cooks well.", "My mother is a good cook.", "My mother makes lovely food."]},
"Би өглөө хог хаядаг.": {
    "en": ["I take out the rubbish in the morning.", "In the morning I take out the trash."]},
"Хонх хаана байна?": {"en": ["Where's the bell?", "Where is the doorbell?"]},
"Манай буйдан шинэ.": {"en": ["Our couch is new.", "Our sofa's new."]},
"Би ням гарагт шал арчдаг.": {
    "en": ["I wipe the floor on Sunday.", "On Sundays I mop the floor.", "I mop floors on Sunday."]},
"Би загас дуртай.": {"en": ["I love fish.", "I am fond of fish.", "I like fish."]},
"Хүнсний ногоо аваач.": {
    "en": ["Buy vegetables, please.", "Please get vegetables.", "Please buy some vegetables.", "Buy some vegetables."]},
"Энэ жимс сайн.": {"en": ["This fruit's good.", "This fruit is nice."]},
"Ширээ дээр будаа байна.": {
    "en": ["There is rice on the table.", "There's rice on the table.", "The rice is on the table."]},
"Энэ талх сайн.": {"en": ["This bread's good.", "This bread is nice."]},
"Би өглөө өндөг иддэг.": {"en": ["I eat an egg in the morning.", "In the morning I eat eggs."]},
"Сүү сайн.": {"en": ["The milk's good.", "Milk is good."]},
"Энэ загас сайн.": {"en": ["This fish's good.", "This fish is nice."]},
"Өрөөнд гэрэл байхгүй.": {
    "en": ["There's no light in the room.", "There is no light in this room.", "The room has no light."]},
"Хивс нойтон.": {"en": ["The rug is wet.", "The carpet's wet."]},
"Ээж оройн хоол хийдэг.": {
    "en": ["Mother makes dinner.", "My mother cooks dinner.", "Mum cooks dinner.", "Mother cooks supper."]},
"Аав хаалга будаж байна.": {
    "en": ["Father paints the door.", "Dad is painting the door.", "My father is painting the door."]},
"Та цай уух уу?": {
    "en": ["Do you want tea?", "Would you like some tea?", "Will you have tea?", "Would you like tea?"]},
"Би өглөө кофе уудаг.": {"en": ["In the morning I drink coffee.", "I have coffee in the morning."]},
"Давс байхгүй.": {"en": ["There's no salt.", "We have no salt.", "There isn't any salt."]},
"Би чихэр дуртай.": {"en": ["I love sugar.", "I like sweets.", "I like candy.", "I am fond of sugar."]},
"Тос байхгүй.": {"en": ["There's no butter.", "There is no oil.", "There isn't any butter."]},
"Хутга хаана байна?": {"en": ["Where's the knife?"]},
"Хоолыг тавиур дээр тавь.": {
    "en": ["Put the food on the shelf.", "Put the meal on the plate.", "Place the food on the plate."]},
"Энэ цай сайн.": {"en": ["This tea's good.", "This tea is nice."]},
"Цахилгаан одоо байна.": {
    "en": ["The power is on now.", "The electricity is on now.", "There is electricity now.", "The power is back."]},
"Тос өгөөч.": {"en": ["Give me the oil, please.", "Please pass the butter.", "Pass me the oil."]},
"Энэ аяга жижиг.": {"en": ["This cup is small.", "This bowl's small."]},
"Муур минь жижиг.": {"en": ["My cat's small.", "My cat is little."]},
"Зулзага муур жижиг.": {"en": ["The kitten's small.", "The kitten is little."]},
"Чи тэжээвэр амьтантай юу?": {
    "en": ["Have you got a pet?", "Do you have pets?", "Do you own a pet?"]},
"Энэ шинэ тоглоом.": {"en": ["This toy is new.", "This is a new game.", "It's a new toy."]},
"Хамтдаа тоглоё.": {"en": ["Let's play together.", "Shall we play together?", "Let us play together."]},
"Муур буйдныг хумхиж байна.": {
    "en": ["The cat is scratching the sofa.", "The cat scratches the couch.", "The cat is scratching the couch."],
    "mn": ["Муур буйдан хумхиж байна."]},
"Энэ аяга шинэ.": {"en": ["This bowl is new.", "This cup's new."]},
"Би талх хүсэж байна.": {"en": ["I would like bread.", "I want some bread.", "I'd like some bread."]},
"Энэ сүүл жижиг.": {"en": ["This tail's small.", "This tail is short."]},
"Сарвуу жижиг.": {"en": ["The paw's small.", "The paws are small."]},
"Би өглөө мууранд хоол өгдөг.": {
    "en": ["I feed my cat in the morning.", "In the morning I feed the cat.", "I give the cat food in the morning."]},
"Муурыг эмнэлэгт аваач.": {
    "en": ["Take the cat to the clinic.", "Please take the cat to the vet.", "Bring the cat to the vet."]},
"Энэ ном сайн.": {"en": ["This book's good.", "This is a good book."]},
"Үүнийг уншаач.": {"en": ["Read this, please.", "Please read it.", "Read this."]},
"Хуудсыг нээгээч.": {"en": ["Open the page, please.", "Please turn to the page.", "Open the page."]},
"Муурын сүүл урт.": {"en": ["The cat's tail is long.", "The cat has a long tail."]},
"Муур унтаж байна.": {"en": ["The cat sleeps.", "The cat's asleep.", "The cat is asleep."]},
"Энэ тавиур цэвэр.": {"en": ["This shelf is clean.", "This plate's clean."]},
"Энэ юу гэдэг зүйл вэ?": {
    "en": ["What is this called?", "What's this thing?", "What is this item?", "What's this called?"]},
"Уут минь бохир.": {"en": ["My bag's dirty."]},
"Энэ түүх сайн.": {"en": ["This story's good.", "This history is good.", "This is a good story."]},
"Зохиолч хэн бэ?": {"en": ["Who's the author?", "Who is the writer?", "Who wrote it?"]},
"Номын санд явъя.": {
    "en": ["Let us go to the library.", "Shall we go to the library?", "Let's go to the library."]},
"Энд номын дэлгүүр байна.": {
    "en": ["There's a bookstore here.", "There is a bookshop here.", "Here is a bookstore."]},
"Үгийг бичээч.": {"en": ["Write the word, please.", "Please write down the word.", "Write the word."],
    "mn": ["Үг бичээч."]},
"Энэ үг шинэ.": {"en": ["This word's new.", "This is a new word."]},
"Өгүүлбэр хийгээч.": {
    "en": ["Make a sentence, please.", "Please make a sentence.", "Please build a sentence."]},
"Надад түүх ярь.": {
    "en": ["Tell me a story.", "Tell me a story, please.", "Please tell me a story."]},
"Эмнэлэг хаана байна?": {"en": ["Where's the vet?", "Where is the clinic?", "Where's the clinic?"]},
"Энэ хутга шинэ.": {"en": ["This knife's new.", "This is a new knife."]},
"Манай цэцэрлэг гоё.": {"en": ["Our garden is nice.", "Our garden's beautiful."]},
"Би цэцэгт дуртай.": {"en": ["I like flowers.", "I am fond of flowers.", "I love flowers."]},
"Ургамлыг усалаач.": {"en": ["Water the plant, please.", "Please water the plants.", "Water the plant."]},
"Байшингийн ойролцоо мод байна.": {
    "en": ["There's a tree near the house.", "There is a tree by the house.", "A tree is near the house."]},
"Энэ навч жижиг.": {"en": ["This leaf's small.", "This leaf is little."]},
"Үрийг тариач.": {"en": ["Plant the seed, please.", "Please sow the seed.", "Plant the seed.", "Sow the seed."]},
"Хөрс нойтон байна.": {"en": ["The earth is wet.", "The soil's wet.", "The ground is wet."]},
"Цэцэрлэгт цэцэг байна.": {
    "en": ["There is a flower in the garden.", "There's a flower in the garden.", "There are flowers in the garden."]},
"Би орой бүр уншдаг.": {"en": ["Every evening I read.", "I read each evening."]},
"Би шинэ хөнжил хүсэж байна.": {
    "en": ["I would like a new blanket.", "I'd like a new blanket.", "I want a new quilt."]},
"Цэцэг усалаач.": {"en": ["Water the flowers, please.", "Please water the flower.", "Water the flowers."]},
"Би мод тарихыг хүсэж байна.": {
    "en": ["I would like to plant a tree.", "I want to plant trees.", "I'd like to plant a tree."]},
"Мод ургаж байна.": {"en": ["The tree grows.", "The tree is growing."]},
"Өвсөн дээр бүү алх.": {
    "en": ["Do not walk on the grass.", "Don't step on the grass.", "Keep off the grass."],
    "mn": ["Өвсөн дээр битгий алх."]},
"Манай зүлэг том.": {"en": ["Our lawn's big.", "Our lawn is large."]},
"Энэ хоол сайн.": {"en": ["This meal is good.", "This food's good.", "This food is nice."]},
"Энэ муу өдөр.": {"en": ["This is a bad day.", "It's a bad day.", "This day is bad."]},
"Би өглөө бүр ургамал усалдаг.": {
    "en": ["Every morning I water the plants.", "I water the plant every morning."]},
"Манай байшин том.": {"en": ["Our house is big.", "My house is large.", "Our house is large."]},
"Би шинэ уут авлаа.": {
    "en": ["I bought a new bag.", "I got a new bag.", "I have bought a new bag.", "I took a new bag."]},
"Энэ ном хуучин.": {"en": ["This book's old.", "This is an old book."]},
"Тэр зураг гоё.": {"en": ["That picture is nice.", "That painting is beautiful.", "That's a beautiful picture."]},
"Сайхан өдөр өнгөрүүлээрэй.": {
    "en": ["Have a nice day.", "Have a good day.", "Have a lovely day.", "Enjoy your day."]},
"Энэ том ном.": {"en": ["This book is big.", "It's a big book.", "This is a large book."]},
"Энэ жижиг хайрцаг.": {"en": ["This box is small.", "It's a small box.", "This is a little box."]},
"Хүүхдүүд тоглох дуртай.": {
    "en": ["Children like to play.", "Kids love to play.", "Children love playing.", "Children like playing."]},
"Муурын сарвуу зөөлөн.": {
    "en": ["The cat's paw is soft.", "Cat paws are soft.", "The paws of the cat are soft."]},
"Дараагийн хуудсыг унш.": {
    "en": ["Read the next page.", "Please read the next page.", "Turn to the next page."],
    "mn": ["Дараагийн хуудас унш."]},
}


def build():
    sentences = json.loads((SRC / "sentences.json").read_text(encoding="utf-8"))
    stats = {"en": 0, "mn": 0, "sentences": 0, "rules": {}}

    for s in sentences:
        mn, en, ids = s["mn"], s["en"], s.get("ids", [])
        hand = HAND.get(mn, {})

        en_alts, mn_alts = [], []

        def add(bucket, value, rule=None):
            if not value:
                return
            v = value.strip()
            canon = mn if bucket is mn_alts else en
            seen = {canon.lower()} | {x.lower() for x in bucket}
            if v.lower() in seen:
                return
            bucket.append(v)
            if rule:
                stats["rules"][rule] = stats["rules"].get(rule, 0) + 1

        for v in hand.get("en", []):
            add(en_alts, v)
        for v in hand.get("mn", []):
            add(mn_alts, v)

        for name, fn in MN_RULES:
            add(mn_alts, fn(mn, en, ids), name)

        # Contractions run over the canonical form and the hand-written
        # phrasings, but never over each other's output.
        #
        # Automatic synonym swapping used to run here, substituting the other
        # half of a slashed gloss. It is gone: a second gloss is not valid in
        # every context, and the swap produced "The cat is in the fence" for
        # «Муур хашаанд байна» and "Please tell me a history" for «Надад түүх
        # ярь». Accepting a wrong answer teaches the wrong answer, which is a
        # worse failure than missing a right one. Where the second gloss does
        # fit, it is written into HAND against that specific sentence.
        for base in [en] + list(en_alts):
            for v in en_contractions(base):
                add(en_alts, v, "contraction")

        if en_alts or mn_alts:
            s["alt"] = {}
            if en_alts:
                s["alt"]["en"] = en_alts
            if mn_alts:
                s["alt"]["mn"] = mn_alts
            s["altReviewed"] = False
            stats["sentences"] += 1
            stats["en"] += len(en_alts)
            stats["mn"] += len(mn_alts)
        else:
            s.pop("alt", None)
            s.pop("altReviewed", None)

    return sentences, stats


def main():
    sentences, stats = build()
    print(f"{stats['sentences']}/{len(sentences)} sentences carry alternatives")
    print(f"  english forms added: {stats['en']}")
    print(f"  mongolian forms added: {stats['mn']}")
    for k, v in sorted(stats["rules"].items(), key=lambda x: -x[1]):
        print(f"    {v:4}  {k}")

    if "--dry" in sys.argv:
        for s in sentences[:8]:
            print(json.dumps(s, ensure_ascii=False, indent=1))
        return

    out = json.dumps(sentences, ensure_ascii=False, indent=1) + "\n"
    (SRC / "sentences.json").write_text(out, encoding="utf-8")
    print(f"wrote {SRC / 'sentences.json'}")


if __name__ == "__main__":
    main()
