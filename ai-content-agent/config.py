import os
from dotenv import load_dotenv

load_dotenv()


# Kontent turlari: har bir jadval soatiga bitta tur
CONTENT_TYPE_NEWS = "ai_news"          # AI yangiliklar, modellar
CONTENT_TYPE_PROMPT = "ai_prompt"      # AI prompt + rasm
CONTENT_TYPE_GENERATED = "ai_generated"  # AI yaratgan video/rasm + prompt


class Config:
    # Telegram
    BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    ADMIN_USER_ID: int = int(os.getenv("ADMIN_USER_ID", "818518622"))
    TELEGRAM_CHANNELS: list[str] = [
        ch.strip()
        for ch in os.getenv("TELEGRAM_CHANNELS", "-1001900340796").split(",")
        if ch.strip()
    ]

    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")

    # Instagram (hozircha ishlatilmaydi)
    INSTAGRAM_USERNAME: str = os.getenv("INSTAGRAM_USERNAME", "")
    INSTAGRAM_PASSWORD: str = os.getenv("INSTAGRAM_PASSWORD", "")

    # YouTube (hozircha ishlatilmaydi)
    YOUTUBE_CLIENT_ID: str = os.getenv("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")

    # Schedule — har bir soatda bitta kontent turi
    # 10:00 = AI yangiliklar, 13:00 = AI prompt+rasm, 18:00 = AI generated
    SCHEDULE_HOURS: list[int] = [
        int(h.strip())
        for h in os.getenv("SCHEDULE_HOURS", "10,13,18").split(",")
        if h.strip()
    ]

    # Har bir soatga kontent turi mapping
    SCHEDULE_CONTENT_MAP: dict[int, str] = {
        10: CONTENT_TYPE_NEWS,
        13: CONTENT_TYPE_PROMPT,
        18: CONTENT_TYPE_GENERATED,
    }

    # System prompt
    DEFAULT_SYSTEM_PROMPT: str = os.getenv(
        "SYSTEM_PROMPT",
        "Sen professional AI kontent menejerisin. Vazifang:\n"
        "1. AI haqidagi eng so'nggi va qiziqarli yangiliklar, modellar, "
        "promptlar va AI yaratgan kontentlarni topish\n"
        "2. Har bir postni o'zbek tilida (lotin alifbosida) mukammal yozish\n"
        "3. Har bir postda to'liq sarlavha (title), batafsil tavsif "
        "(description), va manba (source) bo'lishi shart\n"
        "4. Agar AI yaratgan rasm yoki video bo'lsa, uni yaratish uchun "
        "ishlatilgan promptni ham yozish\n"
        "5. Post professional va chiroyli formatda bo'lishi kerak",
    )

    # Content sources
    CONTENT_SOURCES: list[str] = [
        s.strip()
        for s in os.getenv(
            "CONTENT_SOURCES",
            "openai_blog,huggingface,techcrunch_ai,arxiv_ai,reddit_ai",
        ).split(",")
        if s.strip()
    ]

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./data/agent.db"
    )

    # Media directory
    MEDIA_DIR: str = os.getenv("MEDIA_DIR", "./data/media")
