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
│   └── system_settings.py   # System prompt va jadval
├── services/
│   ├── ai_editor.py         # AI tarjima/tahrirlash
│   ├── content_finder.py    # Kontent qidirish
│   ├── publisher.py         # Nashr boshqaruvchi
│   └── scheduler.py         # Jadval boshqaruvchi
└── platforms/
    ├── telegram_publisher.py  # Telegram nashr
    ├── instagram_publisher.py # Instagram nashr
    └── youtube_publisher.py   # YouTube nashr
```
