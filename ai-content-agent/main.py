import asyncio
import logging
import os
import sys
import uuid

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from config import CONTENT_TYPE_NEWS, Config
from database.models import ContentPost, async_session, init_db
from handlers import approval, commands, content_input, system_settings
from services.ai_editor import AIEditor
from services.content_finder import ContentFinder
from services.publisher import Publisher
from services.scheduler import ContentScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("data/bot.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

# Global instances
bot: Bot | None = None
dp = Dispatcher()
content_finder = ContentFinder()
ai_editor = AIEditor()
scheduler = ContentScheduler()
publisher: Publisher | None = None

# State: qaysi post tahrirlanmoqda
_editing_post_id: int | None = None


def get_publisher() -> Publisher:
    return publisher


def get_scheduler() -> ContentScheduler:
    return scheduler


def get_editing_post() -> int | None:
    return _editing_post_id


def set_editing_post(post_id: int):
    global _editing_post_id
    _editing_post_id = post_id


def clear_editing_post():
    global _editing_post_id
    _editing_post_id = None


async def trigger_search(content_type: str = CONTENT_TYPE_NEWS):
    """Kontent turiga qarab qidirish va admin ga yuborish."""
    type_labels = {
        "ai_news": "📰 AI Yangiliklar",
        "ai_prompt": "🎨 AI Prompt + Rasm",
        "ai_generated": "🎬 AI Yaratgan Kontent",
    }
    type_label = type_labels.get(content_type, content_type)

    logger.info(f"Kontent qidirish boshlandi: {type_label}")

    try:
        contents = await content_finder.find_content(content_type)

        if not contents:
            logger.warning(f"Hech qanday kontent topilmadi: {content_type}")
            if bot:
                await bot.send_message(
                    Config.ADMIN_USER_ID,
                    f"🔍 {type_label} — kontent topilmadi. "
                    f"Keyinroq qayta uriniladi.",
                )
            return

        best = contents[0]
        for item in contents:
            if item.get("image_url") or item.get("video_url"):
                best = item
                break

        result = await ai_editor.translate_and_format(
            f"Sarlavha: {best['title']}\n\n{best['text']}",
            source_url=best.get("url"),
            content_type=content_type,
        )

        body = result["body"]
        if result.get("hashtags"):
            body += "\n\n" + " ".join(f"#{t}" for t in result["hashtags"])

        image_path = None
        video_path = None

        if best.get("image_url"):
            filename = f"{uuid.uuid4().hex}.jpg"
            image_path = await content_finder.download_image(
                best["image_url"], filename
            )

        async with async_session() as session:
            post = ContentPost(
                title=result.get("title", best.get("title", "")),
                body=body,
                original_text=best.get("text", ""),
                source_url=best.get("url"),
                source_name=best.get("source"),
                image_path=image_path,
                video_path=video_path,
                status="pending",
                origin="auto",
                content_type=content_type,
            )
            session.add(post)
            await session.commit()
            await session.refresh(post)

        if bot:
            from handlers.approval import send_post_preview

            await send_post_preview(
                bot,
                Config.ADMIN_USER_ID,
                post,
                prefix=f"🔍 <b>{type_label} topildi:</b>\n\n",
            )

        logger.info(f"Post #{post.id} ({content_type}) admin ga yuborildi")

    except Exception as e:
        logger.error(f"Kontent qidirish xatosi ({content_type}): {e}")
        if bot:
            await bot.send_message(
                Config.ADMIN_USER_ID,
                f"❌ {type_label} qidirishda xatolik: {str(e)[:500]}",
            )


async def main():
    global bot, publisher

    os.makedirs("data", exist_ok=True)
    os.makedirs(Config.MEDIA_DIR, exist_ok=True)

    if not Config.BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN sozlanmagan!")
        sys.exit(1)

    if not Config.ADMIN_USER_ID:
        logger.error("ADMIN_USER_ID sozlanmagan!")
        sys.exit(1)

    await init_db()
    logger.info("Database tayyor")

    bot = Bot(
        token=Config.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    publisher = Publisher(bot)

    dp.include_router(commands.router)
    dp.include_router(system_settings.router)
    dp.include_router(approval.router)
    dp.include_router(content_input.router)

    scheduler.set_search_callback(trigger_search)
    scheduler.start()
    logger.info("Scheduler ishga tushdi")

    logger.info("Bot ishga tushmoqda...")

    schedule_info = scheduler.get_schedule_info()

    try:
        await bot.send_message(
            Config.ADMIN_USER_ID,
            "🤖 <b>AI Kontent Agent ishga tushdi!</b>\n\n"
            f"{schedule_info}\n\n"
            f"📢 Kanal: {', '.join(Config.TELEGRAM_CHANNELS) or 'Sozlanmagan'}\n\n"
            "/help — Barcha buyruqlar",
        )
    except Exception as e:
        logger.warning(f"Boshlang'ich xabar yuborib bo'lmadi: {e}")

    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot to'xtatildi")
    finally:
        scheduler.stop()
