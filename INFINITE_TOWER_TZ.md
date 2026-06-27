# Infinite Tower — Texnik Topshiriq (TZ) v1

> Holat: REJA. Kod yozilmaydi — faqat "Boshla" buyrug'idan keyin.
> Til: o'yin interfeysi Uzbek (keyin ko'p tilli).

---

## 1. Konsepsiya (qisqacha)
**Infinite Tower** — yuqoridan ko'rinadigan (top-down) 2D action-RPG. O'yinchi **bitta qahramonni** (knight) boshqaradi. Markazda o'yinchining **kingdom**'i (hub/baza), atrofida **ochiq dunyo**, va asosiy dungeon sifatida **cheksiz minora**. Janr: action-RPG + roguelite + (keyin) onlayn multiplayer. Referenslar: Zelda (top-down), Soulknight / Archero (mobil roguelite), AFK-style meta-progress.

**Asosiy his:** har "run" (minoraga ko'tarilish) qiziqarli va xavfli, lekin progress (gear, level, oltin) doimiy saqlanadi → o'yinchi asta-sekin kuchayadi.

---

## 2. Asosiy sikl (Core Loop)
1. **Kingdom (hub):** do'konlardan gear/iksir olish, gear yaxshilash (temirchi), questlar (e'lon taxtasi), NPC dialoglari.
2. **Ochiq dunyoga chiqish:** kezish, kichik dushmanlar, resurslar, sirlar, questlar.
3. **Minoraga kirish (run):** qavatma-qavat ko'tarilish — har qavat alohida top-down xarita: dushmanlar, sandiqlar, kalit+qulf, tuzoqlar. Har 5–10 qavatda boss.
4. **Jang:** real-vaqt — harakat + qurol bilan urish + spell/ability + iksir.
5. **O'lja:** qurol, zirh, qalqon, iksir, gem, oltin, scroll.
6. **Run yakuni:** o'lsa yoki chiqsa → kingdom'ga qaytadi. **Roguelite:** doimiy progress (gear/level/oltin) saqlanadi.
7. **Rivojlanish:** oltin/gem bilan gear olish/enchant, level up → yana balandroq minora.

---

## 3. Boshqaruv (mobil-first, desktop ham)
- **Mobil:** chap pastda virtual joystick (harakat), o'ng pastda asosiy urish tugmasi + 1–3 ability tugmasi, pastda hotbar (iksir/food), yuqorida HP/Mana/oltin.
- **Desktop:** WASD/strelka — harakat; sichqoncha/space — urish; 1–0 — hotbar; E — interaksiya; I — inventar; Esc — pauza.
- 8 yo'nalishli yoki 4 yo'nalishli harakat (MVP: 4 yo'nalish, keyin 8).

---

## 4. Tizimlar (Systems)

### 4.1 Qahramon (Character)
- Statlar: HP, Mana, Hujum (ATK), Himoya (DEF), Tezlik, Crit%, Crit kuchi.
- Level / XP: dushman/quest'dan XP → level up → stat o'sishi.
- Ekipirovka slotlari: qurol, zirh (bosh/tana), qalqon, aksessuar.

### 4.2 Harakat va kamera
- Tilemap asosida harakat, to'siqlar bilan kollizion (devor, suv, daraxt).
- Kamera qahramonni kuzatadi (smooth follow), xarita chegarasida to'xtaydi.
- Minimap (UI assetda bor) — atrof va quest markerlar.

### 4.3 Jang (Combat)
- Yaqin jang (melee): qilich/bolta — old tomonga zarba, cooldown.
- Uzoq jang (ranged): kamon/o'q — yo'nalishga otish.
- Sehr (spells): mana sarflaydi (fireball va h.k.), cooldown.
- Dushman AI: patrul → o'yinchini sezish → ta'qib → hujum. Bosslar: bir necha faza/pattern.
- Damage formula, crit, knockback, i-frame (zarba olgach qisqa himoya).

### 4.4 Inventar va buyumlar
- Grid inventar (UI asset), drag/tap bilan ekipirovka, hotbar'ga consumable.
- Buyum turlari (assetlardan): qurollar (qilich/bolta/bolg'a/kamon/staff), zirh/qalqon/dubulg'a, iksirlar (HP/Mana/buff), oltin, gemlar (enchant uchun), kalitlar (qulf), scroll (bir martalik effekt), food (HP/buff).
- Rarity (nodirlik): oddiy/noyob/epik/afsonaviy (rang bilan) → stat farqi.

### 4.5 Kingdom (hub)
- Binolar (props assetdan): o'yinchi uyi, qurol do'koni, zirh do'koni, iksir do'koni, temirchi (upgrade/enchant), e'lon taxtasi (questlar), quduq/bozor/chodir/gulxan = atmosfera.
- NPClar: dialog (dialog box asseti), sotuvchi, quest beruvchi.
- Kingdom keyinchalik rivojlanadi (mukofotlarga bino ochish/yaxshilash) — keyingi bosqich.

### 4.6 Ochiq dunyo
- Bir nechta zona (o'rmon/dasht/g'or/sohil — tileset shu uchun yetarli).
- Tarqoq dushmanlar, resurs (o'tin/tosh/gul), sirli sandiq, sayohat questlari.
- Minora kirishi shu dunyoda joylashgan.

### 4.7 Cheksiz minora (asosiy dungeon)
- Qavatlar: qo'lda yasalgan boshlang'ich qavatlar (1–N) keyin **prosedural** cheksiz qavatlar.
- Har qavat: top-down xona(lar), dushman to'lqinlari, sandiq/kalit/qulf, tuzoq, chiqish zinapoyasi.
- Boss qavatlari (masalan har 5/10).
- Qiyinlik qavat bilan o'sadi (dushman HP/ATK, soni).
- Run davomida vaqtinchalik kuchaytirishlar (ixtiyoriy, keyin).

### 4.8 Roguelite progress
- O'lim → run tugaydi, kingdom'ga qaytadi.
- **Saqlanadi:** level, gear (inventar/ekipirovka), oltin, gem, ochilgan questlar, eng baland qavat rekordi.
- **Yo'qolmaydi:** hech narsa (Roguelite, hardcore emas).

### 4.9 Quest
- E'lon taxtasi + NPC questlari (quest markerlar: !, ?, skull, star).
- Turlar: o'ldir, yetkaz, yet, top. Mukofot: oltin/XP/gem/gear.

### 4.10 Iqtisod
- Oltin: do'kondan xarid, upgrade.
- Gem: kamyob — enchant/maxsus yaxshilash.
- (Keyin) monetizatsiya: reklama (rewarded), IAP — MVP'da yo'q.

### 4.11 Multiplayer (bosqichma-bosqich)
1. **Leaderboard** — kim eng baland qavatga chiqqan (async, eng oson, scale uchun ideal).
2. **Do'st kingdom'iga tashrif** (read-only).
3. **Async PvP** — raqib snapshot'iga qarshi (real-time emas → million+ uchun arzon).
4. **Klan** — 5 ta bayroq asseti = fraksiya/klan; klan reytingi, birgalikdagi maqsadlar.

### 4.12 Profil / Auth / Save
- Guest (darhol), Google login (credential keyin: `GOOGLE_CLIENT_ID`).
- Cloud save (server): qahramon, inventar, progress, rekord.
- Offline-first: lokal saqlash, onlaynda sinxron.

---

## 5. Art va assetlar
- **Bor (foydalanuvchi bergan):** tileset (o'tloq/tuproq/tosh/suv/qum/qoya/g'or), props (binolar, daraxt, bozor, chodir va h.k.), UI (inventar, hotbar, minimap, HP/Mana, oltin, quest markerlar, bayroqlar), buyumlar (qurol/zirh/iksir/gem/food/scroll).
- **Kerak (generatsiya qilinadi):**
  - Qahramon sprite sheet: yurish (4/8 yo'nalish), urish, o'lim — transparent fon.
  - Dushman spritelari (bir necha tur) + boss.
  - NPC spritelari.
  - Effektlar (zarba, fireball, o'lim).
- Uslub: 16-bit pixel-art, fantasy/qorong'i ohang (loading screen bilan bir xil).

---

## 6. Texnik arxitektura

### 6.1 Frontend (tavsiya)
- **Tavsiyam: Phaser 3** (top-down RPG uchun tilemap, fizika/kollizion, sprite animatsiya, kamera, input — tayyor). Vanilla Canvas'da bularning hammasini qo'lda yozish ancha sekin.
- Loading screen (HTML/CSS) shundoq qoladi; o'yin Phaser canvas'da ishlaydi.
- Vite — dev/build. Mobil: **Capacitor** orqali Android/iOS ilova.
- *(Agar siz vanilla Canvas'da davom etishni xohlasangiz — mumkin, lekin sekinroq. Tasdiqlang.)*

### 6.2 Backend
- Node.js + **Fastify**, JWT auth (guest/Google).
- DB: dev'da SQLite → prod'da **Postgres**.
- Scale: **Redis** (leaderboard, sessiya, cache), CDN (assetlar), stateless API → gorizontal scale (million+ uchun).
- Multiplayer asosan **async** (snapshot) → server yuki kam.

### 6.3 Ma'lumotlar modeli (qisqacha)
- `User` (id, auth turi, nick) · `Character` (statlar, level, xp) · `Inventory`/`Item` · `Progress` (eng baland qavat, ochilgan zonalar/questlar) · `Leaderboard` entry.

---

## 7. Bosqichli yo'l xaritasi (Roadmap)
- **0. Loading screen** — ✅ tayyor (PR #4).
- **1. MVP — Personaj harakati** *(siz tanladingiz, birinchi)*: kingdom tilemap render + knight 4-yo'nalish yurish animatsiyasi + joystick/WASD + kollizion + kamera follow.
- **2. Kingdom hub:** binolar, kollizion, NPC + dialog, interaksiya (E).
- **3. Jang:** dushman + melee urish + HP + damage + o'lim/respawn.
- **4. Inventar/ekipirovka + buyumlar + hotbar.**
- **5. Do'konlar + iqtisod (oltin) + e'lon taxtasi (quest).**
- **6. Ochiq dunyo zonalari + resurs/dushman.**
- **7. Cheksiz minora:** prosedural qavatlar + o'lja + boss + roguelite run + meta-progress.
- **8. Profil/Auth + cloud save (guest→Google).**
- **9. Multiplayer: leaderboard.**
- **10. Ijtimoiy: tashrif → async PvP → klan.**
- **11. Mobil paket (Capacitor), polish, (ixtiyoriy) monetizatsiya.**

Har bosqich: alohida PR + brauzerda/emulyatorda test + video.

---

## 8. Hal qilinadigan savollar (TBD)
1. Frontend dvijok: **Phaser 3** — ✅ TASDIQLANDI.
2. Harakat: 4 yo'nalish (MVP) → keyin 8 — *default: ha*.
3. Kingdom xaritasi o'lchami — *default: kichik-o'rta ixcham (~40×40 tile)*.
4. O'yin tili: **Inglizcha (asosiy)** — ✅ TASDIQLANDI. Keyin ko'p tilli qo'shilishi mumkin.
5. Nom: "Infinite Tower" store'da band bo'lishi mumkin — keyin noyob variant ko'riladi.
