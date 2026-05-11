import datetime
import logging

from aiogram import Bot
from sqlalchemy import select

from database.models import ContentPost, async_session
from platforms.instagram_publisher import InstagramPublisher
from platforms.telegram_publisher import TelegramPublisher
from platforms.youtube_publisher import YouTubePublisher

logger = logging.getLogger(__name__)


class Publisher:
    """Barcha platformalarga nashr qilish boshqaruvchisi."""

    def __init__(self, bot: Bot):
        self.telegram = TelegramPublisher(bot)
        self.instagram = InstagramPublisher()
        self.youtube = YouTubePublisher()

    async def publish_post(self, post_id: int) -> dict:
        """Postni barcha platformalarga yuborish."""
        async with async_session() as session:
            result = await session.execute(
                select(ContentPost).where(ContentPost.id == post_id)
            )
            post = result.scalar_one_or_none()
            if not post:
                return {"success": False, "error": "Post topilmadi"}

            results = {"telegram": [], "instagram": None, "youtube": None}

            tg_results = await self.telegram.publish(
                text=post.body,
                image_path=post.image_path,
                video_path=post.video_path,
            )
            results["telegram"] = tg_results
            post.published_telegram = any(r["success"] for r in tg_results)

            if post.image_path or post.video_path:
                ig_result = await self.instagram.publish(
                    text=post.body,
                    image_path=post.image_path,
                    video_path=post.video_path,
                )
                results["instagram"] = ig_result
                post.published_instagram = ig_result.get("success", False)

            if post.video_path:
                yt_result = await self.youtube.publish(
                    title=post.title or "AI Yangilik",
                    description=post.body,
                    video_path=post.video_path,
                    tags=["AI", "SuniyIntellekt", "Uzbek"],
                )
                results["youtube"] = yt_result
                post.published_youtube = yt_result.get("success", False)

            post.status = "published"
            post.published_at = datetime.datetime.utcnow()
            await session.commit()

            logger.info(f"Post #{post_id} barcha platformalarga yuborildi")
            return {
                "success": True,
                "results": results,
            }

    def format_publish_report(self, results: dict) -> str:
        """Nashr natijalarini formatlash."""
        lines = ["📊 <b>Nashr natijasi:</b>\n"]

        tg = results.get("results", {}).get("telegram", [])
        for r in tg:
            status = "✅" if r.get("success") else "❌"
            lines.append(f"{status} Telegram {r.get('channel', '')}")

        ig = results.get("results", {}).get("instagram")
        if ig:
            status = "✅" if ig.get("success") else "❌"
            error = f" ({ig.get('error', '')})" if not ig.get("success") else ""
            lines.append(f"{status} Instagram{error}")

        yt = results.get("results", {}).get("youtube")
        if yt:
            status = "✅" if yt.get("success") else "❌"
            extra = ""
            if yt.get("success"):
                extra = f" ({yt.get('url', '')})"
            elif yt.get("error"):
                extra = f" ({yt['error']})"
            lines.append(f"{status} YouTube{extra}")

        return "\n".join(lines)
