# 🤖 AI Kontent Agent

Telegram bot orqali boshqariladigan AI kontent agent. Telegram, Instagram va YouTube kanallarini avtomatik boshqaradi.

## Xususiyatlar

- **Avtomatik kontent qidirish** — belgilangan soatlarda internetdan AI haqidagi kontentlarni topadi
- **AI tarjima** — topilgan kontentni o'zbek tiliga tarjima qiladi
- **Tasdiqlash tizimi** — hech narsa ruxsatsiz nashr qilinmaydi
- **Manual kontent** — rasm, video, matn yuborsangiz post tayyorlaydi
- **Ko'p platformali nashr** — Telegram, Instagram, YouTube
- **System prompt boshqaruvi** — AI xatti-harakatini bot orqali o'zgartiring
- **Jadval sozlamalari** — qidiruv soatlarini sozlang

## O'rnatish

### 1. Bog'liqliklarni o'rnatish

```bash
cd ai-content-agent
pip install -r requirements.txt
```

### 2. Sozlamalar

`.env.example` faylini `.env` ga nusxalang va to'ldiring:

```bash
cp .env.example .env
```

Kerakli sozlamalar:

| Sozlama | Tavsif |
|---------|--------|
| `TELEGRAM_BOT_TOKEN` | @BotFather dan olingan token |
| `ADMIN_USER_ID` | Sizning Telegram ID raqamingiz |
| `TELEGRAM_CHANNELS` | Kanal nomlari (vergul bilan) |
| `OPENAI_API_KEY` | OpenAI API kaliti |

### 3. Telegram Bot yaratish

1. Telegramda @BotFather ga boring
2. `/newbot` buyrug'ini yuboring
3. Bot nomini va username ni kiriting
4. Token ni `.env` ga yozing
5. Botni kanalingizga admin qilib qo'shing

### 4. Admin ID olish

1. @userinfobot ga boring
2. `/start` yuboring
3. ID raqamingizni `.env` ga yozing

### 5. Ishga tushirish

```bash
python main.py
```

### Docker bilan ishga tushirish

```bash
docker build -t ai-content-agent .
docker run -d --env-file .env --name ai-agent ai-content-agent
```

## Bot buyruqlari

| Buyruq | Tavsif |
|--------|--------|
| `/start` | Botni boshlash |
| `/help` | Barcha buyruqlar |
| `/status` | Bot holati |
| `/search` | Hozir kontent qidirish |
| `/search [mavzu]` | Mavzu bo'yicha qidirish |
| `/schedule` | Jadval ko'rish |
| `/schedule set 9,13,18` | Jadval soatlarini o'zgartirish |
| `/system` | System prompt ko'rish |
| `/system set [matn]` | System promptni o'zgartirish |
| `/system reset` | Standart promptga qaytish |
| `/channels` | Kanallar ro'yxati |
| `/history` | Postlar tarixi |
| `/stats` | Statistika |
| `/review` | Video ko'rib, English review yozish (pul ishlash uchun) |

## Ishlash jarayoni

### Avtomatik rejim
```
Belgilangan soat keldi → Internetdan AI kontent qidiradi →
O'zbekchaga tarjima qiladi → Bot sizga namuna ko'rsatadi →
Siz tasdiqlaysiz → Barcha kanallarga yuboriladi
```

### Manual rejim
```
Siz rasm/video/matn yuborasiz → AI tahrirlaydi →
Post namunasi ko'rsatiladi → Tasdiqlaysiz → Kanallarga yuboriladi
```

### Tasdiqlash oqimi
- ✅ **Tasdiqlash** — postni barcha kanallarga yuboradi, keyingi jadvalgacha kutadi
- ❌ **Rad etish** — postni o'chiradi
- ✏️ **Tahrirlash** — AI ko'rsatmangiz bo'yicha qayta tahrirlaydi
- 🔄 **Qayta qidirish** — yangi kontent qidiradi

## Kontent manbalari

- OpenAI Blog
- Hugging Face Blog
- TechCrunch AI
- arXiv (cs.AI)
- MIT AI News
- VentureBeat AI
- The Verge AI
- Reddit (r/artificial, r/MachineLearning, r/ChatGPT, r/LocalLLaMA)
- DuckDuckGo web qidiruv

## Texnologiyalar

- **Python 3.12+**
- **aiogram 3.x** — Telegram bot framework
- **OpenAI API** — AI tarjima va tahrirlash
- **APScheduler** — jadval bo'yicha qidirish
- **SQLAlchemy + aiosqlite** — ma'lumotlar bazasi
- **BeautifulSoup + feedparser** — web scraping
- **instagrapi** — Instagram nashr
- **Google API** — YouTube nashr

## Loyiha tuzilishi

```
ai-content-agent/
├── main.py                  # Asosiy fayl
├── config.py                # Sozlamalar
├── requirements.txt         # Bog'liqliklar
├── .env.example             # Sozlamalar namunasi
├── Dockerfile               # Docker
├── database/
│   └── models.py            # Database modellari
├── handlers/
│   ├── commands.py          # Bot buyruqlari
│   ├── approval.py          # Tasdiqlash/rad etish
│   ├── content_input.py     # Manual kontent
│   ├── review.py            # Video review yaratish
│   └── system_settings.py   # System prompt va jadval
├── services/
│   ├── ai_editor.py         # AI tarjima/tahrirlash
│   ├── content_finder.py    # Kontent qidirish
│   ├── publisher.py         # Nashr boshqaruvchi
│   ├── scheduler.py         # Jadval boshqaruvchi
│   └── video_review.py      # Video review generator
└── platforms/
    ├── telegram_publisher.py  # Telegram nashr
    ├── instagram_publisher.py # Instagram nashr
    └── youtube_publisher.py   # YouTube nashr
```

## 💰 Bot orqali pul ishlash yo'llari

### 1. `/review` — video ko'rib, English review yozish

Eng sodda va tez daromad yo'li. Platformalar sizga video ko'rish va fikr yozish uchun to'laydi:

- **Streaka Hub** — $0.50–$5+ bir review
- **PlaybookUX** — $10 (10 daqiqa), $90 (90 daqiqa)
- **UserTesting, Userlytics** — $10–$100 sessiya
- **CrowdGen / Appen** — ijtimoiy tarmoq video rater loyihalari, 2 haftada $500+ gacha

#### Telegram bot orqali:
1. Platformada ro'yxatdan o'ting va video review topshiriq oling.
2. Telegramda `/review` yozing.
3. Platforma nomini tanlang (`streaka`, `playbookux`, `usertesting`, `appen` yoki `medium`/`youtube`).
4. Ko'rgan video haqida o'zbekcha qisqacha yozing.
5. Platform berilgan savollarni yuboring.
6. Bot professional inglizcha review tayyorlaydi — nusxa olib, platformaga joylang.

#### Terminal'dan ishlatish:
Agar Telegram bot hali sozlanmagan bo'lsa, to'g'ridan-to'g'ri terminaldan foydalanishingiz mumkin:

```bash
python video_review_cli.py
```

Sizdan platforma, video tavsifi va savollar so'raladi. Review inglizchada tayyor bo'ladi.

### 2. AI kontent agenti — Telegram/YouTube kanali

Kanal yaratib, AI yangiliklarini avtomatik nashr qilasiz. Keyin reklama, affiliate, sponsorship orqali pul ishlash mumkin. Bu uzoq muddatli strategiya.

### 3. Frilans xizmatlar

Bot bilan tayyorlangan postlarni va review namunalarini portfolio qilib, Upwork/Fiverr da SMM, AI content writing, video script xizmatlarini sotishingiz mumkin.

### 4. Tez boshlash rejasi (1 hafta)

1. Kun 1: Payoneer hisobi oching.
2. Kun 2: Streaka Hub, PlaybookUX, Mindrift ro'yxatdan o'ting.
3. Kun 3: `/review` bilan 5 ta test review yozing.
4. Kun 4-7: Kuniga 1–2 soat vazifa bajaring, bot bilan tezlashtiring.

Realistik maqsad: birinchi 2-4 haftada $50–$200, 3 oydan keyin $300–$1000+.

## ⚠️ Ogohlantirishlar

- Hech qanday "oldin to'lov" talab qiluvchi kursga kirmang.
- Fake obuna/like sotib olish yoki bot kommentariyalar — akauntingizni bloklab qo'yadi.
- "Telefonda video ko'rib boy bo'ling" va'dalari ko'pincha skam. Haqiqiy platformalarda to'lov past, lekin aniq.
- AI review faqat yozish jarayonini tezlashtiradi — video haqiqatdan ko'rish shart.
