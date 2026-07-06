"""
Anime personajlar bazasi - har bir animedan BARCHA muhim personajlar.
Har bir personaj uchun to'liq tavsif: ismi, ko'rinishi, kiyimi, xarakteri.
"""

import random
import datetime

ANIME_DATABASE = {
    "One Piece": {
        "description": "Dengiz qaroqchilari sarguzashti",
        "characters": [
            {
                "name": "Monkey D. Luffy",
                "description": "Young man with messy black hair, scar under left eye, wearing red open vest, blue shorts, straw hat around neck, cheerful wide grin, muscular lean body, sandals",
                "personality": "cheerful, determined, goofy smile"
            },
            {
                "name": "Roronoa Zoro",
                "description": "Muscular man with short green hair, three gold earrings on left ear, scar across left eye (closed), green haramaki sash, open dark green robe, three katana swords at hip, serious intimidating look",
                "personality": "serious, stoic, fierce warrior"
            },
            {
                "name": "Nami",
                "description": "Beautiful young woman with long orange wavy hair, brown eyes, wearing blue and white striped bikini top, low-rise jeans, tangerine tattoo on left shoulder, confident smirk",
                "personality": "confident, clever, beautiful"
            },
            {
                "name": "Sanji",
                "description": "Tall slim man with blond hair covering left eye, curly eyebrow, wearing black double-breasted suit, blue shirt, black tie, cigarette in mouth, suave gentleman look",
                "personality": "suave, romantic, cool gentleman"
            },
            {
                "name": "Nico Robin",
                "description": "Tall elegant woman with long black hair, blue eyes, olive skin, wearing purple leather jacket, sunglasses on head, long legs, calm mysterious beauty",
                "personality": "calm, mysterious, elegant"
            },
            {
                "name": "Tony Tony Chopper",
                "description": "Small cute boy with brown fluffy hair, blue nose, wearing pink top hat with white X, red shorts, innocent wide eyes, adorable childlike appearance",
                "personality": "cute, shy, innocent"
            },
            {
                "name": "Franky",
                "description": "Very large muscular man with bright blue flat-top hair, metal nose, sunglasses, open Hawaiian shirt showing cyborg chest, speedo, massive forearms, confident pose",
                "personality": "loud, confident, flamboyant"
            },
            {
                "name": "Brook",
                "description": "Extremely tall thin man with black afro hair, gentleman in black suit with top hat, cane sword, soul king rockstar vibe, pale skin, deep set eyes, wide smile",
                "personality": "gentleman, musical, humorous"
            },
            {
                "name": "Usopp",
                "description": "Slim young man with long curly black hair, very long nose, tan skin, wearing brown overalls, green headband, goggles on forehead, sniper goggles, carrying slingshot",
                "personality": "cowardly but brave, creative"
            },
            {
                "name": "Jinbe",
                "description": "Massive broad man with blue skin tone, large build like a sumo wrestler, wearing traditional Japanese kimono, kind wise eyes, strong jaw",
                "personality": "wise, honorable, calm strength"
            },
            {
                "name": "Shanks",
                "description": "Handsome man with red hair, three scars over left eye, wearing black cape over white shirt, missing left arm, confident charming smile, straw hat",
                "personality": "charismatic, powerful, relaxed"
            },
            {
                "name": "Portgas D. Ace",
                "description": "Muscular young man with wavy black hair, freckles on both cheeks, shirtless with orange cowboy hat, red bead necklace, ASCE tattoo on left arm, flame tattoo on back, confident grin",
                "personality": "hot-headed, loyal, confident"
            },
            {
                "name": "Trafalgar D. Law",
                "description": "Slim man with dark skin, short black hair, goatee, tattoos on hands and fingers spelling DEATH, wearing yellow hoodie with black spots, white fur hat with brown spots, nodachi sword, cool calm expression",
                "personality": "cool, calculating, mysterious"
            },
            {
                "name": "Boa Hancock",
                "description": "Extremely beautiful tall woman with long straight black hair, blue eyes, wearing revealing red qipao dress with gold snake patterns, golden earrings, arrogant regal beauty",
                "personality": "arrogant, regal, stunning beauty"
            },
            {
                "name": "Dracule Mihawk",
                "description": "Tall man with sharp facial features, short black hair, pointed beard, yellow hawk-like eyes, wearing long black coat with red interior, large cross pendant, wide-brimmed hat with feather, carrying massive black sword",
                "personality": "stern, elegant, supreme swordsman"
            },
            {
                "name": "Crocodile",
                "description": "Tall imposing man with slicked-back black hair, scar across face, wearing long dark fur-lined coat, golden hook on left hand, cigar in mouth, sinister confident smirk",
                "personality": "cunning, ruthless, sophisticated villain"
            },
            {
                "name": "Donquixote Doflamingo",
                "description": "Very tall man with short blond hair, wearing pink feathered coat, orange-tinted sunglasses, wide menacing grin, purple shirt, white pants, flamingo-like flamboyance",
                "personality": "maniacal, flamboyant, terrifying"
            },
            {
                "name": "Sabo",
                "description": "Handsome young man with wavy blond hair, scar on left eye, wearing blue top hat with goggles, long blue coat, black boots, pipe weapon, gentle noble smile",
                "personality": "noble, caring, revolutionary"
            },
            {
                "name": "Whitebeard (Edward Newgate)",
                "description": "Gigantic muscular old man with white crescent-shaped mustache, bandana, scars across massive chest, wearing white captain coat draped over shoulders, bisento polearm",
                "personality": "fatherly, powerful, legendary"
            },
            {
                "name": "Kaido",
                "description": "Enormous muscular man with long wild blue hair, massive horns on head, dragon scale tattoo on left arm, wearing purple open coat, spiked kanabo club, fierce drunk expression",
                "personality": "brutal, overwhelming, indestructible"
            },
            {
                "name": "Big Mom (Charlotte Linlin)",
                "description": "Enormous woman with curly pink hair, large round body, wearing pink dress with napoleon hat (bicorne), crazy wide eyes, huge smile",
                "personality": "terrifying, unpredictable, gluttonous"
            },
            {
                "name": "Yamato",
                "description": "Tall beautiful woman with long white hair with teal-green highlights, red horns, wearing white sleeveless shirt with diamond patterns, hakama pants, carrying large kanabo club",
                "personality": "fierce, free-spirited, warrior princess"
            },
            {
                "name": "Blackbeard (Marshall D. Teach)",
                "description": "Large round man with missing teeth, messy black beard, dark skin, wearing black captain coat, bandana, three pistols, sinister laugh expression",
                "personality": "cunning, dangerous, ambitious"
            },
            {
                "name": "Aokiji (Kuzan)",
                "description": "Very tall slim man with curly black hair, sleeping mask on forehead, wearing white navy suit with blue undershirt, laid-back lazy expression",
                "personality": "lazy, laid-back, ice cold justice"
            },
            {
                "name": "Akainu (Sakazuki)",
                "description": "Large muscular man with short dark hair, serious stern face, wearing red suit under white navy justice coat, magma tattoo patterns, intimidating presence",
                "personality": "ruthless, absolute justice"
            },
            {
                "name": "Kizaru (Borsalino)",
                "description": "Tall man with curly dark hair, yellow-tinted sunglasses, wearing yellow striped suit under white navy coat, relaxed goofy expression despite power",
                "personality": "relaxed, sarcastic, deceptively powerful"
            },
            {
                "name": "Perona",
                "description": "Cute gothic young woman with long pink curly pigtails, wearing gothic lolita dress with crown, red boots, parasol, cute pouty expression with hollow eyes",
                "personality": "gothic, cute, spoiled princess"
            },
            {
                "name": "Vivi (Nefertari Vivi)",
                "description": "Beautiful young woman with long light blue hair, wearing white and blue Arabian princess outfit, golden accessories, gentle kind smile",
                "personality": "kind, determined, princess"
            },
            {
                "name": "Smoker",
                "description": "Muscular man with short white-grey hair, two cigars in mouth, open white jacket showing muscular chest, wearing jeans, jitte weapon on back, tough gruff expression",
                "personality": "tough, honorable, determined"
            },
            {
                "name": "Tashigi",
                "description": "Young woman with short dark blue hair, glasses, wearing marine uniform with sword at hip, clumsy but determined look",
                "personality": "clumsy, determined, justice-seeking"
            },
        ]
    },

    "Naruto": {
        "description": "Ninja olami sarguzashti",
        "characters": [
            {
                "name": "Naruto Uzumaki",
                "description": "Young man with spiky blond hair, blue eyes, three whisker marks on each cheek, wearing orange and black jacket with red spiral on back, leaf headband, confident foxy grin",
                "personality": "energetic, determined, never gives up"
            },
            {
                "name": "Sasuke Uchiha",
                "description": "Handsome young man with spiky dark blue-black hair, dark eyes (one with purple rinnegan), wearing dark blue high-collar shirt, white open shirt, katana sword, cool brooding look",
                "personality": "cool, brooding, intense"
            },
            {
                "name": "Sakura Haruno",
                "description": "Beautiful young woman with short pink hair, green eyes, red qipao top, black shorts, black gloves, diamond seal on forehead, confident strong expression",
                "personality": "strong, intelligent, fierce"
            },
            {
                "name": "Kakashi Hatake",
                "description": "Tall man with spiky silver-white hair leaning to one side, face mask covering lower face, leaf headband covering left eye, wearing dark blue ninja outfit with green vest, reading a book, lazy cool expression",
                "personality": "laid-back, genius, mysterious"
            },
            {
                "name": "Itachi Uchiha",
                "description": "Handsome young man with long black hair in ponytail, tear trough lines under eyes, wearing black cloak with red clouds (Akatsuki), red sharingan eyes, calm peaceful expression",
                "personality": "calm, tragic, self-sacrificing genius"
            },
            {
                "name": "Hinata Hyuga",
                "description": "Beautiful shy woman with long dark blue-purple hair, pale lavender eyes (no pupils), wearing lavender and cream hoodie jacket, gentle soft blush on cheeks",
                "personality": "shy, gentle, quietly strong"
            },
            {
                "name": "Gaara",
                "description": "Young man with messy red hair, no eyebrows, dark circles around teal eyes, kanji 'love' tattoo on forehead, wearing dark red coat with gourd of sand on back, calm intense stare",
                "personality": "calm, reformed, protective leader"
            },
            {
                "name": "Rock Lee",
                "description": "Young man with bowl-cut shiny black hair, extremely thick round eyebrows, wearing green spandex bodysuit, orange leg warmers, enthusiastic passionate expression with thumbs up",
                "personality": "passionate, hardworking, youthful spirit"
            },
            {
                "name": "Neji Hyuga",
                "description": "Handsome young man with very long brown hair, pale lavender eyes, wearing white traditional Hyuga robes, leaf headband on forehead, composed genius expression",
                "personality": "composed, genius, proud"
            },
            {
                "name": "Jiraiya",
                "description": "Tall large man with long spiky white hair in ponytail, red face paint lines down from eyes, wearing green short shirt kimono over mesh armor, wooden sandals, scroll on back, jovial grin",
                "personality": "perverted, wise, legendary mentor"
            },
            {
                "name": "Tsunade",
                "description": "Beautiful busty woman with long blonde hair in two low pigtails, diamond seal on forehead, wearing grey sleeveless top under green haori jacket, confident powerful expression",
                "personality": "strong, gambling-loving, legendary healer"
            },
            {
                "name": "Orochimaru",
                "description": "Pale androgynous person with long straight black hair, snake-like golden eyes with purple eye markings, pale white skin, wearing white robe with purple rope belt, sinister smile",
                "personality": "sinister, brilliant, snake-like"
            },
            {
                "name": "Minato Namikaze",
                "description": "Handsome young man with spiky blond hair like Naruto, blue eyes, wearing white coat with red flame pattern at bottom over standard ninja outfit, leaf headband, warm gentle smile",
                "personality": "kind, genius, yellow flash"
            },
            {
                "name": "Madara Uchiha",
                "description": "Tall imposing man with long spiky black hair reaching waist, wearing red samurai armor over black outfit, sharingan eyes, arrogant powerful smirk, battle-scarred",
                "personality": "arrogant, legendary, god-like power"
            },
            {
                "name": "Pain (Nagato)",
                "description": "Man with spiky orange hair, multiple piercings all over face and ears (rinnegan purple eyes), wearing black Akatsuki cloak with red clouds, cold emotionless godlike expression",
                "personality": "godlike, philosophical, tragic"
            },
            {
                "name": "Shikamaru Nara",
                "description": "Slim young man with black hair tied in spiky ponytail, lazy narrow eyes, wearing standard ninja outfit with green vest, earrings, bored lazy expression with genius mind",
                "personality": "lazy genius, strategic mastermind"
            },
            {
                "name": "Ino Yamanaka",
                "description": "Beautiful young woman with long platinum blonde hair in high ponytail, blue-green eyes, wearing purple crop top, purple skirt, confident flirty expression",
                "personality": "confident, fashionable, mind reader"
            },
            {
                "name": "Tenten",
                "description": "Young woman with brown hair in two buns, wearing white Chinese-style sleeveless blouse, dark green pants, scroll summoner, weapons expert, determined focused look",
                "personality": "weapon master, determined, tomboy"
            },
            {
                "name": "Temari",
                "description": "Tall beautiful woman with dirty blonde hair in four spiky ponytails, wearing dark purple dress with mesh armor, large battle fan on back, fierce confident expression",
                "personality": "fierce, no-nonsense, wind warrior"
            },
            {
                "name": "Kankuro",
                "description": "Young man with brown hair, purple face paint in kabuki style, wearing all black outfit with cat-ear hood, carrying puppet scrolls on back",
                "personality": "theatrical, puppet master"
            },
            {
                "name": "Might Guy",
                "description": "Muscular man with bowl-cut shiny black hair, thick eyebrows like Lee, wearing green spandex bodysuit, red forehead protector as belt, extremely enthusiastic thumbs-up nice-guy pose",
                "personality": "passionate, youth-obsessed, powerful"
            },
            {
                "name": "Kushina Uzumaki",
                "description": "Beautiful woman with very long straight red hair reaching legs, violet eyes, wearing green dress, hair clip, warm fierce motherly smile",
                "personality": "fiery, loving, hot-blooded habanero"
            },
            {
                "name": "Obito Uchiha",
                "description": "Man with short spiky black hair, scarred right side of face, one sharingan eye, wearing orange spiral mask (half off), black outfit, conflicted tortured expression",
                "personality": "tragic, conflicted, once idealistic"
            },
            {
                "name": "Konan",
                "description": "Beautiful stoic woman with short blue hair with paper flower origami accessory, amber eyes, wearing Akatsuki black cloak with red clouds, paper wings, serene sad beauty",
                "personality": "serene, loyal, paper angel"
            },
            {
                "name": "Deidara",
                "description": "Young man with long blond hair tied in half ponytail, left eye covered by hair scope, wearing Akatsuki cloak, mouths on palms of hands, manic artistic grin",
                "personality": "explosive artist, manic, art is explosion"
            },
            {
                "name": "Sasori",
                "description": "Young looking man with messy red hair, brown eyes, youthful face (puppet body), wearing Akatsuki cloak, calm emotionless expression like a doll",
                "personality": "patient, puppet master, eternal art"
            },
            {
                "name": "Hidan",
                "description": "Man with slicked-back silver-grey hair, purple eyes, wearing open Akatsuki cloak showing chest, Jashin pendant necklace, triple-bladed scythe, psychotic religious grin",
                "personality": "psychotic, immortal, religious fanatic"
            },
            {
                "name": "Kakuzu",
                "description": "Tall large man with dark skin, green eyes with red sclera, wearing mask covering lower face and head, Akatsuki cloak, stitches visible on skin, menacing presence",
                "personality": "greedy, ancient, stitched monster"
            },
            {
                "name": "Kisame Hoshigaki",
                "description": "Very tall muscular man with blue-grey skin, shark-like features with gill marks, small white eyes, blue hair, wearing Akatsuki cloak, massive bandaged sword Samehada, shark-like grin",
                "personality": "shark-like, brutal, loyal partner"
            },
            {
                "name": "Kabuto Yakushi",
                "description": "Young man with silver-white hair tied in ponytail, round glasses, wearing purple outfit, snake-like features later, calculating smile",
                "personality": "calculating, deceptive, medical genius"
            },
        ]
    },

    "Demon Slayer (Kimetsu no Yaiba)": {
        "description": "Demon o'ldiruvchilar tarixi",
        "characters": [
            {
                "name": "Tanjiro Kamado",
                "description": "Kind-looking young man with burgundy-red hair with black tips, scar/mark on forehead, wearing green-black checkered haori over black demon slayer uniform, hanafuda earrings, carrying black nichirin sword, gentle determined eyes",
                "personality": "kind, determined, empathetic"
            },
            {
                "name": "Nezuko Kamado",
                "description": "Beautiful young girl with long black hair with orange tips, pink eyes, bamboo muzzle in mouth, wearing pink kimono with hemp leaf pattern, small and petite, innocent protective look",
                "personality": "protective, sweet, silent strength"
            },
            {
                "name": "Zenitsu Agatsuma",
                "description": "Young man with short yellow-blonde hair, scared nervous expression, wearing orange-yellow gradient haori over demon slayer uniform, always anxious trembling look but handsome when serious",
                "personality": "cowardly, but lightning-fast when asleep"
            },
            {
                "name": "Inosuke Hashibira",
                "description": "Muscular shirtless young man with wild feminine face (surprisingly pretty), blue hair, wearing boar head mask (off to side), no shirt showing abs, fur-lined pants, dual serrated nichirin swords",
                "personality": "wild, aggressive, boar-headed warrior"
            },
            {
                "name": "Giyu Tomioka",
                "description": "Handsome stoic young man with messy black hair tied in low ponytail, dark blue eyes, wearing half-red half-geometic pattern haori split down middle over demon slayer uniform, emotionless calm face",
                "personality": "stoic, loner, water pillar"
            },
            {
                "name": "Shinobu Kocho",
                "description": "Petite beautiful woman with dark purple hair in butterfly bun, violet eyes, wearing butterfly-wing patterned haori over demon slayer uniform, always smiling gently but dangerously",
                "personality": "always smiling, poisonous, insect pillar"
            },
            {
                "name": "Kyojuro Rengoku",
                "description": "Tall muscular man with wild flame-like yellow-red hair swept back, golden eyes with red irises, wearing flame-patterned haori over uniform, massive enthusiastic grin, burning passionate eyes",
                "personality": "passionate, honorable, flame pillar, UMAI!"
            },
            {
                "name": "Tengen Uzui",
                "description": "Very tall extremely muscular and flashy man with white hair, jeweled headband, red eye makeup, wearing flashy outfit with gem accessories, dual cleavers with chains, dazzling confident pose",
                "personality": "flamboyant, flashy, sound pillar"
            },
            {
                "name": "Muichiro Tokito",
                "description": "Young androgynous boy with long black-to-turquoise ombre hair, blank foggy turquoise eyes, wearing mist-like haori, absent-minded dreamy expression",
                "personality": "absent-minded, prodigy, mist pillar"
            },
            {
                "name": "Mitsuri Kanroji",
                "description": "Beautiful curvy woman with long pink-to-green gradient hair in braids, green eyes, wearing very open chest demon slayer uniform with thigh-high socks, blushing lovey expression",
                "personality": "love-struck, strong, love pillar"
            },
            {
                "name": "Obanai Iguro",
                "description": "Slim man with short black hair, heterochromia eyes (one yellow one turquoise), bandages covering lower face, white snake Kaburamaru around neck, wearing striped haori, intense possessive stare",
                "personality": "strict, devoted, serpent pillar"
            },
            {
                "name": "Sanemi Shinazugawa",
                "description": "Muscular angry man with spiky white hair, pale purple eyes, deep scars all over face and body, wearing green haori, perpetually angry aggressive expression, blood-scarred",
                "personality": "aggressive, hot-tempered, wind pillar"
            },
            {
                "name": "Gyomei Himejima",
                "description": "Enormous extremely tall muscular man with short black hair, blind white eyes, always crying, wearing stone bead necklace, carrying chain flail with spiked ball and axe, gentle giant crying expression",
                "personality": "gentle giant, crying, stone pillar"
            },
            {
                "name": "Muzan Kibutsuji",
                "description": "Extremely handsome elegant man with curly black hair, pale skin, red eyes with cat-like slits, wearing white fedora hat, white suit with black shirt, Michael Jackson-like appearance, cold cruel elegance",
                "personality": "cruel, elegant, demon king"
            },
            {
                "name": "Akaza",
                "description": "Muscular man with pink hair and blue line tattoos covering entire body in snowflake patterns, golden eyes, wearing no shirt showing martial artist physique, intense fighting spirit expression",
                "personality": "battle-obsessed, honorable demon"
            },
            {
                "name": "Kokushibo",
                "description": "Tall samurai-like man with long black-red hair, six eyes (three pairs), wearing traditional dark samurai clothing, carrying flesh katana, ancient terrifying presence",
                "personality": "ancient samurai demon, upper moon one"
            },
            {
                "name": "Doma",
                "description": "Handsome man with rainbow-colored eyes, platinum blond hair with rainbow tips, wearing golden lotus-patterned kimono, holding golden fans, perpetual fake friendly smile",
                "personality": "psychopathic, emotionless behind smile"
            },
            {
                "name": "Tamayo",
                "description": "Elegant beautiful woman with dark purple hair in traditional updo, gentle violet eyes, wearing traditional purple kimono, kind wise doctor expression",
                "personality": "kind, wise, demon doctor ally"
            },
            {
                "name": "Kanao Tsuyuri",
                "description": "Beautiful quiet girl with dark purple hair in side ponytail with butterfly ribbon, large purple eyes, wearing demon slayer uniform with pink cape, quiet expressionless but softening",
                "personality": "quiet, observant, growing emotions"
            },
            {
                "name": "Genya Shinazugawa",
                "description": "Tall young man with mohawk-style black hair, scar on face, fierce looking but insecure, wearing demon slayer uniform, carrying shotgun and sword",
                "personality": "rough exterior, soft inside, determined"
            },
        ]
    },

    "Attack on Titan (Shingeki no Kyojin)": {
        "description": "Titanlar hujumi",
        "characters": [
            {
                "name": "Eren Yeager",
                "description": "Young man with long dark brown hair tied in man-bun, intense green eyes, wearing brown Survey Corps military jacket with straps and 3D maneuver gear, determined fierce expression",
                "personality": "fierce, freedom-obsessed, conflicted"
            },
            {
                "name": "Mikasa Ackerman",
                "description": "Beautiful athletic woman with short black hair (later long), dark eyes, red scarf around neck, wearing Survey Corps uniform with blades, stoic protective expression, Asian features",
                "personality": "stoic, deadly, protective"
            },
            {
                "name": "Armin Arlert",
                "description": "Young man with medium blond bob-style hair, large blue eyes, wearing Survey Corps uniform, intelligent thoughtful expression, slightly feminine features",
                "personality": "intelligent, strategic, brave thinker"
            },
            {
                "name": "Levi Ackerman",
                "description": "Short but extremely fit man with undercut black hair, sharp narrow grey eyes, wearing Survey Corps captain uniform very cleanly, cravat around neck, cold intimidating expression despite small stature",
                "personality": "cold, humanity's strongest, clean freak"
            },
            {
                "name": "Erwin Smith",
                "description": "Tall handsome blond man with thick eyebrows, blue eyes, wearing Survey Corps commander uniform with green cape, missing right arm, charismatic commanding presence",
                "personality": "charismatic commander, willing to sacrifice"
            },
            {
                "name": "Hange Zoe",
                "description": "Energetic person with brown hair in messy ponytail, wearing glasses (later eyepatch), Survey Corps uniform, manic excited scientist expression",
                "personality": "eccentric scientist, titan-obsessed"
            },
            {
                "name": "Annie Leonhart",
                "description": "Beautiful stern young woman with blonde hair tied in small bun, blue eyes, wearing Military Police white uniform, cold emotionless expression, martial arts fighter stance",
                "personality": "cold, skilled fighter, female titan"
            },
            {
                "name": "Reiner Braun",
                "description": "Very muscular tall blond man with short hair, golden eyes, wearing military uniform, PTSD exhausted expression mixed with determination, armored build",
                "personality": "conflicted, burdened, armored titan"
            },
            {
                "name": "Bertholdt Hoover",
                "description": "Very tall slim young man with short dark hair, nervous sweating expression, wearing military uniform, anxious gentle eyes",
                "personality": "nervous, gentle, colossal titan"
            },
            {
                "name": "Historia Reiss (Krista)",
                "description": "Petite beautiful young woman with long blonde hair, bright blue eyes, wearing royal white dress or military uniform, sweet angelic appearance that hides inner strength",
                "personality": "angelic, secretly strong-willed queen"
            },
            {
                "name": "Ymir",
                "description": "Tall woman with dark brown hair in ponytail, freckles across face, wearing military uniform, sarcastic tough expression, tan skin",
                "personality": "sarcastic, protective, freckled warrior"
            },
            {
                "name": "Jean Kirstein",
                "description": "Young man with two-toned light brown hair (undercut), narrow amber eyes, wearing Survey Corps uniform, sarcastic handsome expression",
                "personality": "sarcastic, leadership qualities, horse face jokes"
            },
            {
                "name": "Connie Springer",
                "description": "Short young man with shaved head (buzz cut), light grey hair, wearing military uniform, goofy cheerful expression",
                "personality": "cheerful, loyal, simple-minded"
            },
            {
                "name": "Sasha Blouse",
                "description": "Young woman with brown hair in ponytail, reddish-brown eyes, wearing military uniform, often eating or thinking about food, warm country girl smile",
                "personality": "food-loving, brave, country girl"
            },
            {
                "name": "Zeke Yeager",
                "description": "Tall man with blond hair, beard, round glasses, wearing Marleyan military coat, carrying baseball, calculating calm expression with hidden agenda",
                "personality": "calculating, philosophical, beast titan"
            },
            {
                "name": "Kenny Ackerman",
                "description": "Tall older man with long face, thin mustache, wearing cowboy-style hat, long dark coat, carrying dual anti-personnel guns, menacing western outlaw look",
                "personality": "ruthless, western outlaw style"
            },
            {
                "name": "Pieck Finger",
                "description": "Young woman with long messy black hair, tired droopy dark eyes, wearing Marleyan uniform, exhausted but intelligent expression, often seen crawling",
                "personality": "tired-looking, highly intelligent"
            },
            {
                "name": "Gabi Braun",
                "description": "Young girl with brown hair in pigtails, determined fierce brown eyes, wearing Marleyan warrior candidate uniform, aggressive passionate expression",
                "personality": "fierce, determined, young warrior"
            },
            {
                "name": "Falco Grice",
                "description": "Young boy with short blond hair, kind blue eyes, wearing Marleyan candidate uniform, gentle caring expression",
                "personality": "kind, protective, gentle"
            },
            {
                "name": "Porco Galliard",
                "description": "Young man with blond undercut hair, sharp features, wearing Marleyan uniform, aggressive competitive expression",
                "personality": "aggressive, competitive, jaw titan"
            },
        ]
    },

    "Jujutsu Kaisen": {
        "description": "Sehrgarlar jangi",
        "characters": [
            {
                "name": "Yuji Itadori",
                "description": "Athletic young man with short pink-brown undercut hair, brown eyes, wearing black Jujutsu High uniform jacket, red hoodie underneath, bright cheerful smile but fierce in battle",
                "personality": "cheerful, athletic, kind-hearted fighter"
            },
            {
                "name": "Satoru Gojo",
                "description": "Tall handsome man with white spiky hair, striking bright blue Six Eyes (usually hidden behind black blindfold or dark round sunglasses), wearing all-black outfit, cocky confident smirk, most powerful sorcerer",
                "personality": "cocky, overpowered, playful sensei"
            },
            {
                "name": "Megumi Fushiguro",
                "description": "Handsome young man with spiky dark blue-black hair, dark green eyes, wearing black Jujutsu uniform, serious stoic expression, hands often in shadow summoning pose",
                "personality": "serious, stoic, shadow technique user"
            },
            {
                "name": "Nobara Kugisaki",
                "description": "Confident beautiful young woman with short orange-brown bob hair, brown eyes, wearing black Jujutsu uniform with belt, carrying hammer and nails, fierce sassy expression",
                "personality": "fierce, sassy, fashionable fighter"
            },
            {
                "name": "Ryomen Sukuna",
                "description": "Muscular imposing man with pink-red spiky hair, four eyes (two pairs), black tattoo markings across face and body, wearing white-blue kimono, cruel arrogant smirk showing fangs, king of curses",
                "personality": "cruel, arrogant, king of curses"
            },
            {
                "name": "Toge Inumaki",
                "description": "Slim young man with light blond-purple hair, snake-seal marks on cheeks and tongue, wearing high-collar black uniform covering mouth, quiet intense purple eyes",
                "personality": "quiet, cursed speech, tuna mayo"
            },
            {
                "name": "Maki Zenin",
                "description": "Tall athletic woman with long dark green hair in ponytail, wearing glasses (later scars across face), black uniform, carrying polearm weapon, fierce determined warrior expression",
                "personality": "fierce, determined, anti-clan rebel"
            },
            {
                "name": "Panda",
                "description": "Large panda-like figure but actually a cursed corpse, wearing Jujutsu High uniform loosely, friendly round eyes, surprisingly intelligent expression for a panda",
                "personality": "wise, funny, not actually a panda"
            },
            {
                "name": "Kento Nanami",
                "description": "Tall handsome man with short blond hair parted neatly, wearing business suit with loosened tie and glasses, carrying blunt blade wrapped in cloth, tired professional salaryman expression",
                "personality": "professional, tired salaryman sorcerer"
            },
            {
                "name": "Aoi Todo",
                "description": "Extremely muscular tall man with dark skin, black hair in topknot, scar on face, wearing black uniform (often shirtless), enthusiastic passionate expression asking about your type",
                "personality": "passionate best friend, muscle-bound"
            },
            {
                "name": "Suguru Geto",
                "description": "Handsome man with long straight black hair, wearing traditional Buddhist monk robes with prayer beads, calm sinister smile, former friend of Gojo",
                "personality": "calm, philosophical villain, curse collector"
            },
            {
                "name": "Yuta Okkotsu",
                "description": "Slim young man with messy dark hair, tired dark circles under eyes, wearing black uniform, carrying katana, shy nervous expression hiding immense power",
                "personality": "shy, immensely powerful, love-driven"
            },
            {
                "name": "Mahito",
                "description": "Young-looking man with blue-grey patchwork skin like stitched together, mismatched eyes, wild grey-blue hair, wearing casual clothes, childish cruel playful grin",
                "personality": "childishly cruel, shape-shifting curse"
            },
            {
                "name": "Jogo",
                "description": "Humanoid figure with volcano-like head (single eye), dark skin with lava cracks, wearing traditional clothes, angry fierce volcanic expression",
                "personality": "proud, volcanic, fire curse"
            },
            {
                "name": "Toji Fushiguro",
                "description": "Extremely muscular handsome man with messy black hair, scar on lip, wearing simple dark clothes, carrying inverted spear of heaven, cocky dangerous smile, Megumi's father",
                "personality": "dangerous assassin, cocky, sorcerer killer"
            },
            {
                "name": "Choso",
                "description": "Man with long dark hair tied up, blood-like markings across nose bridge, wearing dark clothes with blood manipulation abilities, protective brotherly expression",
                "personality": "protective brother, blood manipulation"
            },
            {
                "name": "Mei Mei",
                "description": "Beautiful woman with long silver-white braided hair, wearing elegant dark outfit with fur coat, carrying battle axe, confident money-loving smirk",
                "personality": "money-loving, powerful, elegant"
            },
            {
                "name": "Kasumi Miwa",
                "description": "Young woman with short blue bob hair, wearing standard black uniform, carrying katana, nervous fangirl expression (Gojo fangirl), budget sorcerer",
                "personality": "nervous, budget sorcerer, Gojo fangirl"
            },
        ]
    },

    "Dragon Ball": {
        "description": "Saiyajilar jangi",
        "characters": [
            {
                "name": "Goku (Son Goku)",
                "description": "Muscular man with wild spiky black hair defying gravity, wearing orange martial arts gi with blue undershirt, blue belt and wristbands, cheerful innocent battle-loving grin",
                "personality": "cheerful, battle-loving, pure-hearted"
            },
            {
                "name": "Vegeta",
                "description": "Short but extremely muscular man with flame-shaped upright black hair, widow's peak, wearing blue bodysuit with white gloves and boots, Saiyan armor, proud scowling expression",
                "personality": "proud prince, rival, intense pride"
            },
            {
                "name": "Gohan",
                "description": "Young scholarly man with short neat black hair, wearing glasses and business suit OR purple fighting gi, kind gentle expression that hides enormous power",
                "personality": "scholarly, gentle, hidden power"
            },
            {
                "name": "Piccolo",
                "description": "Tall muscular man with green skin, pointed ears, antennae on forehead, wearing white cape and turban over purple gi, serious mentor expression",
                "personality": "serious mentor, strategic, green warrior"
            },
            {
                "name": "Frieza",
                "description": "Sleek figure with white and purple skin, no hair, red eyes, long tail, wearing bio-armor naturally, small stature but immense regal presence, cold cruel smirk",
                "personality": "cruel emperor, elegant villain"
            },
            {
                "name": "Trunks",
                "description": "Handsome young man with lavender-purple straight hair, blue eyes, wearing Capsule Corp blue jacket, black tank top, sword on back, cool confident expression",
                "personality": "cool future warrior, Vegeta's son"
            },
            {
                "name": "Bulma",
                "description": "Beautiful genius woman with blue hair (various styles), wearing casual fashionable clothes, Capsule Corp heiress, confident brilliant scientist expression",
                "personality": "genius inventor, fashionable, fierce"
            },
            {
                "name": "Android 18 (Lazuli)",
                "description": "Beautiful cold woman with shoulder-length blonde hair, ice blue eyes, wearing striped shirt with denim vest and skirt, cold cool beauty expression",
                "personality": "cold beauty, powerful, loving wife"
            },
            {
                "name": "Krillin",
                "description": "Short bald man with six dots on forehead (monk marks), no nose, wearing orange gi like Goku, brave cheerful expression despite being human",
                "personality": "brave, loyal best friend, human warrior"
            },
            {
                "name": "Cell",
                "description": "Tall bio-android with green spotted skin, wings, purple sections, crown-like head crest, perfect symmetrical face, arrogant perfection-obsessed smirk",
                "personality": "arrogant, perfection-obsessed"
            },
            {
                "name": "Majin Buu (Fat)",
                "description": "Round pink chubby figure with antenna on head, wearing white baggy pants and yellow gloves/boots, cape with M symbol, childlike innocent goofy grin",
                "personality": "childlike, loves candy, destructive innocent"
            },
            {
                "name": "Broly",
                "description": "Enormous extremely muscular man with wild long spiky black hair (green when transformed), wearing purple fur pants, scarred massive body, berserker rage expression",
                "personality": "gentle giant turned berserker"
            },
            {
                "name": "Beerus",
                "description": "Slim cat-like figure with purple skin, large pointed ears, Egyptian deity appearance, wearing Egyptian-style clothing with collar, lazy but dangerous expression",
                "personality": "lazy god of destruction, food-loving"
            },
            {
                "name": "Whis",
                "description": "Tall elegant figure with pale blue skin, white tall mohawk-like hair, wearing dark attendant robes with staff, calm amused angelic expression",
                "personality": "calm, powerful angel, food critic"
            },
            {
                "name": "Goten",
                "description": "Young boy looking exactly like kid Goku with spiky black hair, wearing green gi or casual clothes, cheerful mischievous grin",
                "personality": "cheerful, mischievous, mini-Goku"
            },
            {
                "name": "Videl",
                "description": "Athletic young woman with short black hair (or long pigtails), blue eyes, wearing white shirt with bike shorts, martial arts fighter, tough determined expression",
                "personality": "tough, determined, Gohan's wife"
            },
            {
                "name": "Yamcha",
                "description": "Handsome man with long dark hair and facial scars, wearing orange gi or baseball uniform, confident but often unlucky expression",
                "personality": "unlucky warrior, former desert bandit"
            },
            {
                "name": "Tien Shinhan",
                "description": "Tall muscular bald man with third eye on forehead, wearing green gi, serious disciplined martial artist expression",
                "personality": "disciplined, three-eyed warrior"
            },
            {
                "name": "Hit",
                "description": "Tall slim purple-skinned man with red eyes, wearing long dark coat with fur collar, hands in pockets, cold professional assassin expression",
                "personality": "cold, time-skip assassin, professional"
            },
            {
                "name": "Jiren",
                "description": "Extremely muscular grey-skinned alien with large black eyes, no hair, wearing red and black Pride Trooper uniform, stoic unbreakable expression",
                "personality": "stoic, strongest mortal, unbreakable"
            },
        ]
    },

    "Death Note": {
        "description": "O'lim daftari",
        "characters": [
            {
                "name": "Light Yagami",
                "description": "Extremely handsome young man with neat brown hair, intelligent sharp brown eyes, wearing white dress shirt with red tie and brown blazer, holding death note book, calculating confident god-complex smirk",
                "personality": "genius, god complex, Kira"
            },
            {
                "name": "L Lawliet",
                "description": "Slim pale man with messy wild black hair, dark circles under large dark eyes, wearing oversized white long-sleeve shirt and baggy jeans, no shoes, sitting in crouched position with thumb to lip, eccentric detective look",
                "personality": "eccentric genius detective, sugar addict"
            },
            {
                "name": "Misa Amane",
                "description": "Beautiful petite woman with long blonde pigtails, wearing gothic lolita black dress with cross accessories, heavy eye makeup, cheerful idol pop-star appearance",
                "personality": "cheerful idol, devoted, gothic beauty"
            },
            {
                "name": "Near (Nate River)",
                "description": "Young boy with curly white hair, pale skin, wearing white pajama-like clothes, sitting on floor playing with toys and dice, blank calm intelligent eyes",
                "personality": "calm, toys-playing genius successor"
            },
            {
                "name": "Mello (Mihael Keehl)",
                "description": "Slim young man with blond bob hair, scar on face, wearing black leather outfit, eating chocolate bar, fierce competitive aggressive expression",
                "personality": "aggressive, chocolate-loving, competitive"
            },
            {
                "name": "Ryuk",
                "description": "Tall dark figure with spiky black hair, blue-grey skin, large round yellow-red eyes, sharp teeth grin, clown-like appearance, wearing dark gothic outfit with chains, holding apple, mischievous death god",
                "personality": "mischievous, apple-loving, bored death god"
            },
            {
                "name": "Rem",
                "description": "Tall skeletal white figure with yellow eyes, bone-like white body, wearing tattered dark robes, feminine gentle presence despite terrifying shinigami appearance",
                "personality": "gentle, protective shinigami"
            },
            {
                "name": "Soichiro Yagami",
                "description": "Middle-aged man with short dark hair, mustache, glasses, wearing detective suit, tired but righteous honorable expression",
                "personality": "honorable father, dedicated detective"
            },
            {
                "name": "Matsuda Touta",
                "description": "Young man with neat black hair, earnest innocent face, wearing business suit, enthusiastic but naive detective expression",
                "personality": "naive, enthusiastic, emotional"
            },
            {
                "name": "Teru Mikami",
                "description": "Tall man with neat straight black hair, glasses, wearing business suit, fanatical devoted expression, extreme devotion to Kira",
                "personality": "fanatical, justice-obsessed, devoted"
            },
            {
                "name": "Kiyomi Takada",
                "description": "Beautiful elegant woman with long straight black hair, wearing professional news anchor outfit, refined sophisticated arrogant beauty",
                "personality": "sophisticated, ambitious, elegant"
            },
            {
                "name": "Naomi Misora",
                "description": "Beautiful woman with long straight black hair, determined dark eyes, wearing dark leather jacket, former FBI agent, intelligent brave expression",
                "personality": "intelligent, brave, FBI agent"
            },
        ]
    },

    "My Hero Academia (Boku no Hero Academia)": {
        "description": "Qahramonlar akademiyasi",
        "characters": [
            {
                "name": "Izuku Midoriya (Deku)",
                "description": "Young man with messy curly green hair, freckles on cheeks, green eyes, wearing green hero costume with white gloves, iron soles, and mask with long ear-like protrusions, determined teary-eyed expression",
                "personality": "determined, analytical, crybaby hero"
            },
            {
                "name": "Katsuki Bakugo",
                "description": "Muscular young man with spiky ash-blond hair, red fierce eyes, wearing black and orange hero costume with grenade-like gauntlets, aggressive explosive angry expression",
                "personality": "explosive, aggressive, competitive rival"
            },
            {
                "name": "Shoto Todoroki",
                "description": "Handsome young man with half-white half-red hair split down middle, heterochromia eyes (grey left, turquoise right), burn scar over left eye, wearing dark blue hero costume, calm cool divided expression",
                "personality": "calm, divided, ice-fire duality"
            },
            {
                "name": "All Might (Toshinori Yagi)",
                "description": "Enormous muscular man with golden blond hair with two horn-like bangs, wearing red white and blue hero costume, massive confident smile with shadowed eyes, Symbol of Peace",
                "personality": "symbol of peace, inspiring, PLUS ULTRA"
            },
            {
                "name": "Ochaco Uraraka",
                "description": "Cute young woman with short brown bob hair, round face, pink cheek pads, wearing pink and black hero costume with helmet, cheerful bubbly gravity-defying smile",
                "personality": "bubbly, cheerful, gravity girl"
            },
            {
                "name": "Tenya Iida",
                "description": "Tall young man with dark blue hair, glasses, wearing white armor-like hero costume with exhaust pipes on calves, rigid proper hand-chopping expression",
                "personality": "rigid, class president, engine legs"
            },
            {
                "name": "Tsuyu Asui",
                "description": "Young woman with long dark green hair, large round eyes, wide mouth, wearing green and black frog-themed hero costume, calm frog-like expression with finger to lip",
                "personality": "calm, straightforward, frog girl"
            },
            {
                "name": "Fumikage Tokoyami",
                "description": "Young man with bird-like black head, red eyes, wearing dark cape-like hero costume, dark shadow creature behind him, brooding dark mysterious presence",
                "personality": "brooding, dark shadow user, gothic"
            },
            {
                "name": "Eijiro Kirishima",
                "description": "Muscular young man with spiky hardened red hair, sharp teeth, wearing red and orange hero costume, manly enthusiastic determined grin",
                "personality": "manly, hardened, loyal bro"
            },
            {
                "name": "Denki Kaminari",
                "description": "Young man with blond hair with black lightning streak, golden eyes, wearing black and white hero costume, goofy cheerful electric expression",
                "personality": "goofy, electric, charming airhead"
            },
            {
                "name": "Momo Yaoyorozu",
                "description": "Tall beautiful young woman with long black hair in ponytail, wearing revealing red hero costume for creation quirk, intelligent composed mature expression",
                "personality": "intelligent, elegant, creation genius"
            },
            {
                "name": "Kyoka Jiro",
                "description": "Slim young woman with short dark purple hair, earphone jack earlobes, wearing purple and black hero costume, cool punk rock expression",
                "personality": "cool, music-loving, punk rock"
            },
            {
                "name": "Tomura Shigaraki",
                "description": "Thin pale man with messy light blue-grey hair, chapped dry lips, wearing many disembodied hands on face and body (father's hands), black outfit, scratching neck nervously, menacing decaying villain",
                "personality": "destructive, decaying, main villain"
            },
            {
                "name": "Dabi (Touya Todoroki)",
                "description": "Slim man with spiky black hair (white roots), blue eyes, purple-scarred burnt skin patches held together with staples on face and body, wearing dark coat, cold flame-wielding villain expression",
                "personality": "cold, burnt, flame villain"
            },
            {
                "name": "Himiko Toga",
                "description": "Cute young woman with messy blonde hair in two buns with loose strands, yellow cat-like eyes, wide psychotic smile with fangs, wearing school uniform with blood-sucking equipment, yandere expression",
                "personality": "psychotic, blood-loving, yandere villain"
            },
            {
                "name": "Endeavor (Enji Todoroki)",
                "description": "Massive muscular man with red flame beard and hair made of fire, blue intense eyes, wearing dark blue hero costume with flames on shoulders, stern serious number one hero expression",
                "personality": "stern, burning ambition, redemption"
            },
            {
                "name": "Hawks (Keigo Takami)",
                "description": "Handsome young man with sandy blond messy hair, golden eyes, large red feather wings on back, wearing tan jacket and aviator-style hero costume, laid-back cocky grin",
                "personality": "laid-back, fast, winged hero"
            },
            {
                "name": "Shota Aizawa (Eraserhead)",
                "description": "Tired-looking man with long messy black hair, stubble, tired dry red eyes, wearing black outfit with capture weapon scarf around neck, perpetually exhausted sleepy expression",
                "personality": "tired, logical, underground hero teacher"
            },
            {
                "name": "Mirio Togata (Lemillion)",
                "description": "Tall muscular young man with blond hair, round blue eyes, wearing red cape hero costume with million symbol, bright sunshine smile despite everything",
                "personality": "bright sunshine, permeation, next All Might"
            },
            {
                "name": "Twice (Jin Bubaigawara)",
                "description": "Man wearing full black and grey bodysuit with measurement marks, split personality shown in mask design, animated expressive gestures",
                "personality": "split personality, loyal, tragic villain"
            },
        ]
    },

    "One Punch Man": {
        "description": "Bir musht qahramon",
        "characters": [
            {
                "name": "Saitama",
                "description": "Average-looking bald man with plain face, wearing yellow jumpsuit superhero suit with white cape, red gloves and boots, bored unimpressed deadpan expression despite being strongest",
                "personality": "bored, overpowered, deadpan humor"
            },
            {
                "name": "Genos",
                "description": "Handsome young cyborg man with blond hair, glowing yellow cyborg eyes, metallic silver and black cyborg body with visible mechanical parts, wearing black and gold cyborg armor, serious determined expression",
                "personality": "serious, loyal disciple, demon cyborg"
            },
            {
                "name": "Garou",
                "description": "Muscular young man with wild spiky silver-white hair, sharp yellow eyes, wearing tight dark martial arts outfit, aggressive feral wolf-like hunting expression",
                "personality": "feral, hero hunter, wolf-like"
            },
            {
                "name": "Tatsumaki (Tornado of Terror)",
                "description": "Petite small woman with curly green hair floating upward, green glowing eyes, wearing black form-fitting dress, floating in air with psychic green aura, arrogant annoyed expression",
                "personality": "arrogant, psychic, petite powerhouse"
            },
            {
                "name": "Fubuki (Blizzard of Hell)",
                "description": "Tall beautiful woman with short dark green bob hair, wearing fur-lined dark coat over tight dress, high heels, elegant mature beauty with commanding presence",
                "personality": "elegant, commanding, psychic beauty"
            },
            {
                "name": "Speed-o'-Sound Sonic",
                "description": "Slim androgynous man with long dark purple hair, wearing black ninja outfit, cocky rival smirk, speed lines effect",
                "personality": "cocky ninja rival, speed obsessed"
            },
            {
                "name": "King",
                "description": "Tall intimidating man with short blond hair, three vertical scars on left eye area, wearing casual clothes, carrying handheld game console, terrified expression (actually weak but everyone fears him)",
                "personality": "terrified, accidental reputation, gamer"
            },
            {
                "name": "Metal Bat",
                "description": "Young delinquent with slicked-back dark hair in pompadour, wearing black school uniform, carrying metal baseball bat, tough angry yankee expression",
                "personality": "tough delinquent, fighting spirit grows"
            },
            {
                "name": "Atomic Samurai",
                "description": "Handsome man with long dark hair, goatee, wearing traditional samurai hakama, carrying katana, chewing on blade of grass, confident swordsman expression",
                "personality": "confident, top swordsman, blade master"
            },
            {
                "name": "Bang (Silver Fang)",
                "description": "Elderly fit man with silver hair swept back, wearing Chinese martial arts outfit, calm wise martial arts master expression, deceptively powerful old man",
                "personality": "calm, wise old martial artist"
            },
            {
                "name": "Mumen Rider",
                "description": "Average man with brown hair, wearing cycling helmet, goggles, jersey, riding bicycle, determined brave expression despite being powerless, true hero spirit",
                "personality": "true hero, brave cyclist, powerless but courageous"
            },
            {
                "name": "Boros",
                "description": "Alien lord with one eye, blue-purple skin, long light blue hair, wearing golden alien armor with cape, cyclops eye glowing, powerful alien emperor aura",
                "personality": "bored conqueror seeking worthy opponent"
            },
        ]
    },

    "Fullmetal Alchemist": {
        "description": "To'liq metall alkimyogar",
        "characters": [
            {
                "name": "Edward Elric",
                "description": "Short young man with long golden blond hair in braid, golden eyes, wearing red hooded coat over black outfit, automail (metal) right arm and left leg, confident determined short-tempered expression",
                "personality": "short-tempered about height, genius alchemist"
            },
            {
                "name": "Alphonse Elric",
                "description": "Soul bound to large suit of medieval armor with glowing red eyes in helmet, massive tall armored figure, gentle soul inside terrifying armor, kind aura despite appearance",
                "personality": "gentle, kind soul in armor"
            },
            {
                "name": "Roy Mustang",
                "description": "Handsome man with short black hair, dark eyes, wearing blue military uniform, white ignition gloves, ambitious confident flame alchemist smirk",
                "personality": "ambitious, flame alchemist, charming"
            },
            {
                "name": "Riza Hawkeye",
                "description": "Beautiful stern woman with short blond hair clipped back, amber eyes, wearing blue military uniform, carrying firearms, loyal composed sharp-shooting expression",
                "personality": "loyal, sharp-shooter, composed"
            },
            {
                "name": "Winry Rockbell",
                "description": "Beautiful young woman with long blond hair in ponytail, blue eyes, wearing tube top and bandana, carrying wrench, mechanical genius cheerful expression",
                "personality": "mechanical genius, cheerful, wrench-wielding"
            },
            {
                "name": "Scar",
                "description": "Large muscular man with dark skin (Ishvalan), white hair, X-shaped scar on face, wearing dark clothes, tattoo alchemy arm, fierce vengeful brooding expression",
                "personality": "vengeful, brooding, seeking justice"
            },
            {
                "name": "King Bradley (Wrath)",
                "description": "Older distinguished man with black hair greying at temples, eye patch over left eye, mustache, wearing military uniform with sword, calm terrifying smile hiding monstrous speed",
                "personality": "calm fury, terrifyingly fast, wrath"
            },
            {
                "name": "Maes Hughes",
                "description": "Tall cheerful man with spiky black hair, glasses, stubble, wearing military uniform, always showing daughter's photos, warm loving father expression",
                "personality": "loving father, loyal friend, devoted family man"
            },
            {
                "name": "Lust",
                "description": "Beautiful seductive woman with long wavy black hair, dark purple eyes, wearing black dress revealing cleavage, ouroboros tattoo, sharp extending finger nails, alluring dangerous beauty",
                "personality": "seductive, dangerous, homunculus"
            },
            {
                "name": "Greed (Greedling)",
                "description": "Handsome man with spiky dark hair, wearing dark vest showing chest, sunglasses, sharp-toothed confident grin, shield-like carbon armor ability, greedy for everything",
                "personality": "greedy for everything, rebellious homunculus"
            },
            {
                "name": "Envy",
                "description": "Androgynous figure with wild long green-black hair, wearing crop top and shorts with headband, shape-shifting jealous cruel smirk",
                "personality": "jealous, shape-shifting, cruel"
            },
            {
                "name": "Olivier Mira Armstrong",
                "description": "Tall stern beautiful woman with long blond hair, ice-blue eyes, wearing blue military winter uniform with fur, carrying sword, cold fierce northern commander expression",
                "personality": "fierce, cold, ice queen commander"
            },
            {
                "name": "Alex Louis Armstrong",
                "description": "Enormous extremely muscular bald man with single blond curl on forehead, handlebar mustache, wearing torn military uniform showing muscles, flexing with sparkles, over-the-top emotional expression",
                "personality": "emotional, muscular, sparkle posing"
            },
            {
                "name": "Ling Yao",
                "description": "Young man with long black hair tied back, narrow squinty eyes (Xingese features), wearing traditional Chinese-style outfit, cunning cheerful grin",
                "personality": "cunning, cheerful, prince of Xing"
            },
            {
                "name": "Lan Fan",
                "description": "Young woman with dark hair in bun, wearing black ninja outfit with mask, automail arm, devoted loyal bodyguard fierce expression",
                "personality": "devoted, fierce bodyguard, loyal"
            },
            {
                "name": "Izumi Curtis",
                "description": "Strong middle-aged woman with black dreadlocked hair, wearing white dress with house-wife apron, terrifyingly strong motherly expression, meat cleaver",
                "personality": "terrifying housewife, master alchemist teacher"
            },
        ]
    },

    "Tokyo Ghoul": {
        "description": "Tokio g'ullari",
        "characters": [
            {
                "name": "Ken Kaneki",
                "description": "Young man with white hair (formerly black), wearing black form-fitting suit, white half-mask with eyepatch covering left eye and zipper mouth, one red kakugan ghoul eye, cracking finger pose, tragic tortured expression",
                "personality": "tragic, tortured, finger-cracking"
            },
            {
                "name": "Touka Kirishima",
                "description": "Beautiful young woman with short blue-purple bob hair covering right eye, wearing casual cafe waitress outfit or dark combat clothes, fierce protective violet eyes",
                "personality": "fierce, protective, tsundere beauty"
            },
            {
                "name": "Shuu Tsukiyama",
                "description": "Tall elegant man with purple hair styled upward, wearing expensive tailored purple suit, rose in hand, dramatic flamboyant gourmet expression, refined cannibal aesthete",
                "personality": "dramatic gourmet, flamboyant aesthete"
            },
            {
                "name": "Juuzou Suzuya",
                "description": "Androgynous young person with white hair with red hairpins (stitches), red eyes, wearing suspenders over white shirt, stitches on skin, carrying quinque, disturbing cheerful psychotic grin",
                "personality": "psychotic cheerful, disturbing"
            },
            {
                "name": "Kishou Arima",
                "description": "Tall man with white hair, glasses, wearing white CCG coat, carrying quinque weapons, expressionless calm ultimate investigator, death god of CCG",
                "personality": "expressionless, ultimate investigator"
            },
            {
                "name": "Ayato Kirishima",
                "description": "Young man with dark blue hair, wearing dark combat outfit, fierce aggressive eyes like his sister Touka, rebellious angry expression",
                "personality": "rebellious, aggressive, protective brother"
            },
            {
                "name": "Hideyoshi Nagachika (Hide)",
                "description": "Cheerful young man with messy blond-orange hair, wearing casual colorful clothes with headphones around neck, bright warm best friend smile",
                "personality": "cheerful, loyal best friend"
            },
            {
                "name": "Rize Kamishiro",
                "description": "Beautiful woman with long purple hair, glasses, wearing casual feminine dress, deceptive gentle smile hiding predatory ghoul nature, binge eater",
                "personality": "deceptive beauty, predatory binge eater"
            },
            {
                "name": "Uta",
                "description": "Slim man with black hair undercut, multiple ear piercings, red and black kakugan eyes, wearing stylish dark alternative fashion, tattoos, mask maker artisan expression",
                "personality": "mysterious mask maker, alternative style"
            },
            {
                "name": "Eto Yoshimura (Sen Takatsuki)",
                "description": "Young woman with messy green hair, wearing bandages and dark clothes, or as author in casual smart outfit with glasses, dual identity mysterious expression",
                "personality": "mysterious, dual identity, one-eyed owl"
            },
            {
                "name": "Akira Mado",
                "description": "Beautiful woman with long blonde hair, wearing white CCG uniform coat, carrying quinque, stern professional investigator expression",
                "personality": "stern, professional, CCG investigator"
            },
            {
                "name": "Nishiki Nishio",
                "description": "Young man with brown hair, glasses, wearing casual university student clothes, sarcastic territorial expression",
                "personality": "sarcastic, territorial, student ghoul"
            },
        ]
    },

    "Spy x Family": {
        "description": "Josus oilasi",
        "characters": [
            {
                "name": "Loid Forger (Twilight)",
                "description": "Extremely handsome blond man with neat short hair, wearing elegant grey three-piece suit with tie, master of disguise spy, calm composed professional expression",
                "personality": "calm spy, master of disguise, secretly caring"
            },
            {
                "name": "Yor Forger (Thorn Princess)",
                "description": "Beautiful woman with long straight black hair, red eyes, wearing elegant red dress with gold hairpin, or black assassin outfit, gentle smile hiding deadly assassin skills",
                "personality": "gentle wife, deadly assassin"
            },
            {
                "name": "Anya Forger",
                "description": "Small cute girl with pink hair with horn-like hair accessories, green eyes, wearing Eden Academy uniform with white shirt and brown vest, mischievous knowing grin (can read minds), waku waku expression",
                "personality": "mischievous, telepathic, waku waku"
            },
            {
                "name": "Bond Forger",
                "description": "Large fluffy white Great Pyrenees dog with gentle wise eyes, wearing black bowtie, can see the future, calm protective loyal expression",
                "personality": "prophetic dog, fluffy, loyal"
            },
            {
                "name": "Damian Desmond",
                "description": "Young boy with neat dark green hair, wearing Eden Academy uniform, tsundere proud expression trying to hide his crush, rich kid demeanor",
                "personality": "tsundere, proud rich kid"
            },
            {
                "name": "Franky Franklin",
                "description": "Stocky man with brown messy hair, round face, wearing casual clothes with hat, information broker, comedic nervous expression",
                "personality": "comedic information broker, unlucky in love"
            },
            {
                "name": "Fiona Frost (Nightfall)",
                "description": "Beautiful cold woman with long dark hair covering half face, wearing professional dark outfit, cold obsessive expression (loves Twilight), professional spy",
                "personality": "cold, obsessive, rival spy in love"
            },
            {
                "name": "Yuri Briar",
                "description": "Young man with short black hair, wearing secret police uniform or suit, sister-complex obsessive intense expression",
                "personality": "sister-complex, secret police, intense"
            },
            {
                "name": "Becky Blackbell",
                "description": "Young girl with curly brown hair in twin drills, wearing Eden Academy uniform with accessories, rich spoiled but kind friend expression",
                "personality": "rich, spoiled but kind, Anya's best friend"
            },
            {
                "name": "Handler (Sylvia Sherwood)",
                "description": "Tall elegant woman with platinum blonde short hair, wearing dark professional suit, smoking cigarette, cool commanding spy boss expression",
                "personality": "commanding spy boss, elegant"
            },
        ]
    },

    "Bleach": {
        "description": "Ruhlar jangi",
        "characters": [
            {
                "name": "Ichigo Kurosaki",
                "description": "Tall muscular young man with bright spiky orange hair, brown eyes, wearing black shinigami robes (shihakusho), carrying massive wrapped zanpakuto sword on back, permanent scowl expression",
                "personality": "scowling, protective, substitute soul reaper"
            },
            {
                "name": "Rukia Kuchiki",
                "description": "Petite young woman with short black hair with strand between eyes, violet eyes, wearing black shinigami robes, beautiful noble ice-cold determination",
                "personality": "noble, ice powers, petite but fierce"
            },
            {
                "name": "Byakuya Kuchiki",
                "description": "Extremely handsome noble man with long black hair with kenseikan hair clips, wearing white captain haori over black robes, scarf, calm elegant aristocratic expression",
                "personality": "aristocratic, elegant, cherry blossom blade"
            },
            {
                "name": "Toshiro Hitsugaya",
                "description": "Short young-looking man with spiky white hair, turquoise eyes, wearing white captain haori, carrying ice dragon sword, serious beyond-his-years expression",
                "personality": "serious prodigy, ice dragon captain"
            },
            {
                "name": "Grimmjow Jaegerjaquez",
                "description": "Muscular man with wild spiky light blue hair, blue eyes, jawbone mask fragment on right cheek, wearing white Arrancar uniform open showing chest, aggressive predatory grin",
                "personality": "aggressive, predatory, panther hollow"
            },
            {
                "name": "Ulquiorra Cifer",
                "description": "Slim pale man with black hair, green eyes with green tear-line markings, half-helmet mask on head, wearing white Arrancar uniform, completely emotionless nihilistic void expression",
                "personality": "emotionless, nihilistic, melancholic bat"
            },
            {
                "name": "Sosuke Aizen",
                "description": "Handsome man with wavy brown hair swept back, wearing white robes, calm intellectual glasses-wearing (later without), manipulative god-complex all-knowing smile",
                "personality": "manipulative genius, god complex"
            },
            {
                "name": "Kenpachi Zaraki",
                "description": "Enormous muscular man with wild spiky black hair with bells on tips, scar across face, eyepatch, wearing tattered captain haori, carrying chipped katana, manic battle-loving bloodthirsty grin",
                "personality": "battle-crazy, manic, strongest fighter"
            },
            {
                "name": "Orihime Inoue",
                "description": "Beautiful busty young woman with long orange hair, hair clips with flower motif, wearing school uniform or white outfit, gentle kind healing expression",
                "personality": "gentle, healing powers, kind-hearted"
            },
            {
                "name": "Uryu Ishida",
                "description": "Slim handsome young man with short dark hair, glasses, wearing white Quincy outfit, carrying spirit bow, composed intellectual cool expression",
                "personality": "composed, intellectual, quincy pride"
            },
            {
                "name": "Rangiku Matsumoto",
                "description": "Tall beautiful busty woman with wavy strawberry blonde hair, wearing shinigami robes loosely showing cleavage, scarf, carefree flirtatious expression",
                "personality": "carefree, flirtatious, loyal lieutenant"
            },
            {
                "name": "Kisuke Urahara",
                "description": "Mysterious man with messy blond hair under green and white striped bucket hat, wearing traditional Japanese wooden sandals and green coat, fan in hand, mysterious scheming smile",
                "personality": "mysterious shopkeeper, genius strategist"
            },
            {
                "name": "Yoruichi Shihoin",
                "description": "Beautiful athletic dark-skinned woman with long purple hair, golden eyes, wearing black stealth outfit, confident playful cat-like smirk, fastest shinigami",
                "personality": "playful, fastest, cat transformation"
            },
            {
                "name": "Renji Abarai",
                "description": "Tall muscular man with long red hair in high ponytail, tribal black tattoos on forehead and body, wearing black shinigami robes with white headband, fierce loyal expression",
                "personality": "fierce, loyal, tattooed warrior"
            },
            {
                "name": "Gin Ichimaru",
                "description": "Slim man with silver hair, perpetually squinting fox-like eyes (thin slits), wearing white captain haori, fox-like creepy perpetual grin",
                "personality": "fox-like, creepy smile, hidden loyalty"
            },
            {
                "name": "Nelliel Tu Odelschwanck",
                "description": "Beautiful woman with long green hair, hazel eyes, cracked skull mask on head with horns, wearing white Arrancar outfit, cheerful innocent expression (child form: small cute green-haired toddler)",
                "personality": "cheerful warrior, dual form"
            },
        ]
    },

    "Chainsaw Man": {
        "description": "Arra odamlar jangi",
        "characters": [
            {
                "name": "Denji",
                "description": "Scruffy young man with messy dirty blond hair, sharp teeth, wearing white shirt with tie (public safety uniform), chainsaw cord pull-start coming from chest, wild feral grin",
                "personality": "simple-minded, feral, wants simple pleasures"
            },
            {
                "name": "Makima",
                "description": "Beautiful calm woman with long auburn-red hair in loose braids, yellow-ringed eyes with spiral pattern, wearing white shirt with black tie and pants, eerily calm controlling smile",
                "personality": "controlling, eerily calm, manipulation"
            },
            {
                "name": "Power",
                "description": "Wild beautiful woman with long messy strawberry blonde hair, small red horns on head, wearing white shirt with tie loosely, sharp fangs, feral chaotic egotistical grin, blood fiend",
                "personality": "chaotic, egotistical, blood fiend"
            },
            {
                "name": "Aki Hayakawa",
                "description": "Handsome stoic man with medium-length dark blue-black hair in topknot, wearing dark suit with tie, carrying sword on back, calm mature serious expression",
                "personality": "stoic, mature, revenge-driven"
            },
            {
                "name": "Himeno",
                "description": "Young woman with short dark hair, eyepatch over right eye, wearing suit with tie, cigarette, relaxed experienced devil hunter expression",
                "personality": "relaxed, experienced, big sister type"
            },
            {
                "name": "Kishibe",
                "description": "Older rugged man with grey hair, scars on face, wearing dark suit, perpetual stone-cold drunk expression, strongest devil hunter",
                "personality": "stone-cold, strongest, alcoholic mentor"
            },
            {
                "name": "Reze",
                "description": "Cute young woman with short dark hair with light streak, wearing cafe uniform or casual clothes, innocent sweet smile hiding bomb devil nature",
                "personality": "sweet disguise, bomb devil, tragic love"
            },
            {
                "name": "Kobeni Higashiyama",
                "description": "Young woman with short dark brown bob hair, wearing suit, perpetually terrified trembling anxious expression, surprisingly capable when scared",
                "personality": "perpetually terrified, surprisingly capable"
            },
            {
                "name": "Angel Devil",
                "description": "Androgynous beautiful figure with red hair, golden halo above head, white wings (one side), wearing suit, lazy apathetic bored expression",
                "personality": "lazy, apathetic, angelic devil"
            },
            {
                "name": "Quanxi",
                "description": "Tall muscular woman with white hair in ponytail, eyepatch, wearing dark Chinese-style outfit, carrying multiple swords, cool emotionless expression",
                "personality": "cool, strongest, sword fighter"
            },
            {
                "name": "Pochita",
                "description": "Small cute dog-like creature with chainsaw blade on head and tail handle, small orange body, adorable loyal puppy eyes, Denji's pet/heart",
                "personality": "adorable, loyal, chainsaw dog"
            },
            {
                "name": "Asa Mitaka",
                "description": "Young woman with long dark hair in twin braids, wearing school uniform, nervous guilty serious expression, war devil host",
                "personality": "serious, guilty, war devil host"
            },
            {
                "name": "Yoru (War Devil)",
                "description": "Same body as Asa but with scar pattern across face and different fierce expression, wearing school uniform, aggressive warlike commanding presence",
                "personality": "aggressive, commanding, war incarnate"
            },
        ]
    },

    "Hunter x Hunter": {
        "description": "Ovchilar sarguzashti",
        "characters": [
            {
                "name": "Gon Freecss",
                "description": "Young boy with spiky black-green hair pointing upward, large brown eyes, wearing green jacket and shorts, brown boots, cheerful bright adventurous expression",
                "personality": "cheerful, adventurous, pure determination"
            },
            {
                "name": "Killua Zoldyck",
                "description": "Handsome boy with spiky silver-white hair, blue cat-like eyes, wearing dark long-sleeve shirt and shorts, skateboard, cool mischievous hands-in-pockets expression",
                "personality": "cool, assassin background, loyal friend"
            },
            {
                "name": "Kurapika",
                "description": "Beautiful androgynous young man with blond bob hair, wearing blue and gold tabard outfit over chain mail, chain weapon on right hand, eyes glowing scarlet red, elegant fierce expression",
                "personality": "elegant, vengeful, scarlet eyes"
            },
            {
                "name": "Leorio Paradinight",
                "description": "Tall young man with short spiky black hair, wearing blue business suit with no tie (open collar), carrying briefcase, passionate hot-headed medical student expression",
                "personality": "hot-headed, aspiring doctor, secretly caring"
            },
            {
                "name": "Hisoka Morow",
                "description": "Muscular man with red slicked-back hair (with star and teardrop face paint), wearing crop top and baggy pants, playing cards in hand, psychotic lustful battle-hungry smirk",
                "personality": "psychotic, battle-lustful, magician clown"
            },
            {
                "name": "Chrollo Lucilfer",
                "description": "Handsome man with slicked-back black hair, cross tattoo on forehead, wearing dark fur-collared coat, carrying book, calm charismatic leader expression",
                "personality": "charismatic, thief leader, calm collector"
            },
            {
                "name": "Illumi Zoldyck",
                "description": "Tall slim man with very long straight black hair, large blank doll-like black eyes, wearing dark chinese outfit with needles, completely emotionless doll-like expression",
                "personality": "emotionless, manipulative, needle assassin"
            },
            {
                "name": "Meruem",
                "description": "Humanoid ant king with green skin, purple-green exoskeleton, tail, wearing regal clothes, intense contemplative regal expression, growing humanity",
                "personality": "regal, evolving, chimera ant king"
            },
            {
                "name": "Neferpitou",
                "description": "Cat-like humanoid with white hair, cat ears, wearing royal guard outfit, playful dangerous cat-like expression",
                "personality": "playful, dangerous, cat-like royal guard"
            },
            {
                "name": "Komugi",
                "description": "Small blind girl with white messy hair, wearing simple white dress, always with runny nose, gentle innocent warm expression",
                "personality": "innocent genius, blind strategist"
            },
            {
                "name": "Kite",
                "description": "Very tall man with long white hair, wearing blue hat, carrying long weapon that changes form, calm experienced hunter expression",
                "personality": "calm, experienced, versatile weapon"
            },
            {
                "name": "Netero",
                "description": "Old small man with long white braid, wearing martial arts outfit, mischievous old man grin despite being most powerful human, prayer pose",
                "personality": "mischievous old man, most powerful human"
            },
            {
                "name": "Feitan Portor",
                "description": "Very short slim man with dark hair covering face, wearing dark bandana over mouth, dark clothes, cold menacing torturer expression",
                "personality": "cold torturer, fastest spider"
            },
            {
                "name": "Machi Komacine",
                "description": "Young woman with pink hair, wearing traditional outfit, thread user, cold loyal spider member expression",
                "personality": "cold, loyal, thread user"
            },
            {
                "name": "Bisky (Biscuit Krueger)",
                "description": "Appears as cute small girl with blonde pigtails wearing pink dress (true form: massive muscular woman), bossy cute expression",
                "personality": "bossy, deceiving appearance, powerful mentor"
            },
        ]
    },

    "Vinland Saga": {
        "description": "Viking sarguzashti",
        "characters": [
            {
                "name": "Thorfinn",
                "description": "Young man with medium blond hair, wearing worn leather viking armor and fur, carrying dual daggers, battle-hardened scarred but eventually peaceful expression",
                "personality": "once vengeful, now peaceful warrior"
            },
            {
                "name": "Askeladd",
                "description": "Handsome older man with short brown hair, goatee, wearing dark fur-lined viking leader coat, cunning calculating intelligent smile, tactical genius",
                "personality": "cunning, tactical genius, complex villain"
            },
            {
                "name": "Canute",
                "description": "Beautiful androgynous young man with long blond hair, blue eyes, wearing royal robes and crown, evolving from timid to ruthless king expression",
                "personality": "timid turned ruthless, beautiful king"
            },
            {
                "name": "Thorkell",
                "description": "Enormous giant-like muscular man with braided blond hair, missing fingers, wearing viking warrior outfit, massive axes, joyful battle-loving expression",
                "personality": "giant, battle-loving, terrifying warrior"
            },
            {
                "name": "Thors",
                "description": "Tall muscular man with blond hair and beard, wearing simple farmer clothes (former warrior armor), calm wise peaceful warrior expression, Thorfinn's father",
                "personality": "peaceful warrior, true strength"
            },
            {
                "name": "Einar",
                "description": "Tall stocky man with brown hair and slight beard, wearing simple farmer clothes, kind honest hardworking expression",
                "personality": "kind, honest, Thorfinn's farming friend"
            },
            {
                "name": "Gudrid",
                "description": "Young woman with short dark hair, wearing simple Norse dress, adventurous brave curious expression",
                "personality": "adventurous, brave, explorer woman"
            },
            {
                "name": "Floki",
                "description": "Thin sinister man with long dark hair, wearing dark robes, cunning political schemer expression",
                "personality": "cunning schemer, political manipulator"
            },
            {
                "name": "Bjorn",
                "description": "Large muscular viking warrior with short hair, berserker, wearing battle armor, fierce berserker rage expression",
                "personality": "berserker, loyal warrior"
            },
            {
                "name": "Snake",
                "description": "Man with messy dark hair, scar, wearing mercenary outfit with sword, cynical experienced guard leader expression",
                "personality": "cynical, experienced, hidden past"
            },
        ]
    },

    "Solo Leveling": {
        "description": "Yolg'iz darajaga ko'tarilish",
        "characters": [
            {
                "name": "Sung Jin-Woo",
                "description": "Tall handsome Korean man with messy black hair, glowing blue-purple eyes, wearing dark armor or black hunter outfit, shadow aura around him, confident powerful evolved expression from weak to strongest",
                "personality": "evolved from weakest to strongest, shadow monarch"
            },
            {
                "name": "Cha Hae-In",
                "description": "Beautiful Korean woman with long blonde hair (unusual for Korean), wearing white S-rank hunter armor, elegant sword fighter, stoic but softening expression around Jin-Woo",
                "personality": "stoic S-rank, scent sensitivity, love interest"
            },
            {
                "name": "Go Gun-Hee",
                "description": "Elderly Korean man with grey hair, wearing chairman suit, wise powerful dignified old leader expression",
                "personality": "wise chairman, dignified leader"
            },
            {
                "name": "Yoo Jin-Ho",
                "description": "Young Korean man with neat brown hair, wearing hunter gear, earnest loyal enthusiastic follower expression",
                "personality": "loyal follower, earnest, Jin-Woo's vice guild master"
            },
            {
                "name": "Thomas Andre",
                "description": "Massive muscular Western man with blond hair, wearing expensive suit barely containing muscles, arrogant powerful S-rank expression",
                "personality": "arrogant S-rank, national level hunter"
            },
            {
                "name": "Liu Zhigang",
                "description": "Handsome Chinese man with long dark hair tied back, wearing traditional Chinese outfit with modern hunter gear, calm powerful martial artist expression",
                "personality": "calm, powerful Chinese national hunter"
            },
            {
                "name": "Beru",
                "description": "Tall humanoid ant king shadow soldier with dark purple-black armor, glowing eyes, serving Jin-Woo, fierce loyal shadow expression",
                "personality": "fierce, loyal shadow soldier, ant king"
            },
            {
                "name": "Igris",
                "description": "Tall knight in red and black shadow armor, wearing horned helmet, carrying sword, silent noble loyal knight expression",
                "personality": "silent noble knight, first shadow soldier"
            },
        ]
    },
}


def get_random_anime_for_today() -> tuple[str, dict]:
    """Bugungi kun uchun random anime tanlash (har kuni boshqa anime)."""
    today = datetime.date.today()
    anime_names = sorted(ANIME_DATABASE.keys())
    # Kun raqamiga qarab deterministik tanlash
    index = today.toordinal() % len(anime_names)
    anime_name = anime_names[index]
    return anime_name, ANIME_DATABASE[anime_name]


def get_all_anime_names() -> list[str]:
    """Barcha anime nomlari."""
    return sorted(ANIME_DATABASE.keys())


def get_anime_characters(anime_name: str) -> list[dict] | None:
    """Berilgan anime uchun personajlar ro'yxati."""
    anime = ANIME_DATABASE.get(anime_name)
    if anime:
        return anime["characters"]
    return None


def get_character_count(anime_name: str) -> int:
    """Animedagi personajlar soni."""
    anime = ANIME_DATABASE.get(anime_name)
    if anime:
        return len(anime["characters"])
    return 0


if __name__ == "__main__":
    anime_name, anime_data = get_random_anime_for_today()
    print(f"Bugungi anime: {anime_name}")
    print(f"Personajlar soni: {len(anime_data['characters'])}")
    for i, char in enumerate(anime_data["characters"], 1):
        print(f"  {i}. {char['name']}")
