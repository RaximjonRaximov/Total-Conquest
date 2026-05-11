import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Telegram
    BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    ADMIN_USER_ID: int = int(os.getenv("ADMIN_USER_ID", "0"))
    TELEGRAM_CHANNELS: list[str] = [
        ch.strip()
        for ch in os.getenv("TELEGRAM_CHANNELS", "").split(",")
        if ch.strip()
    ]

    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")

    # Instagram
    INSTAGRAM_USERNAME: str = os.getenv("INSTAGRAM_USERNAME", "")
    INSTAGRAM_PASSWORD: str = os.getenv("INSTAGRAM_PASSWORD", "")

    # YouTube
    YOUTUBE_CLIENT_ID: str = os.getenv("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")

    # Schedule
    SCHEDULE_HOURS: list[int] = [
        int(h.strip())
        for h in os.getenv("SCHEDULE_HOURS", "9,13,18").split(",")
        if h.strip()
    ]

    # System prompt
    DEFAULT_SYSTEM_PROMPT: str = os.getenv(
        "SYSTEM_PROMPT",
        "Sen professional AI kontent menejerisin. Vazifang internetdan AI "
        "haqidagi eng qiziqarli va foydali kontentlarni topib, ularni "
        "o'zbek tiliga tarjima qilib, chiroyli post formatida tayyorlash.",
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
