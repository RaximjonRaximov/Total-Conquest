import logging
import os

from config import Config

logger = logging.getLogger(__name__)


class InstagramPublisher:
    """Instagram ga post yuborish (instagrapi orqali)."""

    def __init__(self):
        self._client = None
        self._logged_in = False

    async def _ensure_login(self):
        """Instagram ga kirish."""
        if self._logged_in:
            return True

        if not Config.INSTAGRAM_USERNAME or not Config.INSTAGRAM_PASSWORD:
            logger.warning("Instagram credentials sozlanmagan")
            return False

        try:
            from instagrapi import Client

            self._client = Client()
            self._client.login(
                Config.INSTAGRAM_USERNAME, Config.INSTAGRAM_PASSWORD
            )
            self._logged_in = True
            logger.info("Instagram ga muvaffaqiyatli kirildi")
            return True
        except Exception as e:
            logger.error(f"Instagram login xatosi: {e}")
            return False

    async def publish(
        self,
        text: str,
        image_path: str | None = None,
        video_path: str | None = None,
    ) -> dict:
        """Instagram ga post yuborish."""
        if not await self._ensure_login():
            return {"success": False, "error": "Instagram ga kirilib bo'lmadi"}

        try:
            if video_path and os.path.exists(video_path):
                media = self._client.video_upload(
                    video_path, caption=text[:2200]
                )
                return {
                    "success": True,
                    "media_id": str(media.pk),
                    "type": "video",
                }
            elif image_path and os.path.exists(image_path):
                media = self._client.photo_upload(
                    image_path, caption=text[:2200]
                )
                return {
                    "success": True,
                    "media_id": str(media.pk),
                    "type": "photo",
                }
            else:
                logger.warning(
                    "Instagram uchun rasm yoki video kerak"
                )
                return {
                    "success": False,
                    "error": "Instagram uchun rasm/video talab qilinadi",
                }
        except Exception as e:
            logger.error(f"Instagram post xatosi: {e}")
            return {"success": False, "error": str(e)}
