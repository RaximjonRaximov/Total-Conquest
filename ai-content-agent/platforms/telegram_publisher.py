import logging
import os

from aiogram import Bot
from aiogram.types import FSInputFile

from config import Config

logger = logging.getLogger(__name__)


class TelegramPublisher:
    """Telegram kanallariga post yuborish."""

    def __init__(self, bot: Bot):
        self.bot = bot
        self.channels = Config.TELEGRAM_CHANNELS

    async def publish(
        self,
        text: str,
        image_path: str | None = None,
        video_path: str | None = None,
    ) -> list[dict]:
        """Barcha kanallarga post yuborish."""
        results = []

        for channel in self.channels:
            try:
                if video_path and os.path.exists(video_path):
                    video = FSInputFile(video_path)
                    msg = await self.bot.send_video(
                        chat_id=channel,
                        video=video,
                        caption=text[:1024],
                        parse_mode="HTML",
                    )
                elif image_path and os.path.exists(image_path):
                    photo = FSInputFile(image_path)
                    msg = await self.bot.send_photo(
                        chat_id=channel,
                        photo=photo,
                        caption=text[:1024],
                        parse_mode="HTML",
                    )
                else:
                    msg = await self.bot.send_message(
                        chat_id=channel,
                        text=text[:4096],
                        parse_mode="HTML",
                    )

                results.append(
                    {
                        "channel": channel,
                        "success": True,
                        "message_id": msg.message_id,
                    }
                )
                logger.info(f"Telegram {channel} ga yuborildi")

            except Exception as e:
                logger.error(f"Telegram {channel} xatosi: {e}")
                results.append(
                    {
                        "channel": channel,
                        "success": False,
                        "error": str(e),
                    }
                )

        return results
