import logging
import os

from config import Config

logger = logging.getLogger(__name__)


class YouTubePublisher:
    """YouTube ga video yuklash (YouTube Data API v3)."""

    def __init__(self):
        self._service = None
        self._authenticated = False

    async def _ensure_auth(self):
        """YouTube API ga autentifikatsiya."""
        if self._authenticated:
            return True

        if not Config.YOUTUBE_CLIENT_ID or not Config.YOUTUBE_CLIENT_SECRET:
            logger.warning("YouTube API credentials sozlanmagan")
            return False

        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build

            token_file = "./data/youtube_token.json"
            if os.path.exists(token_file):
                creds = Credentials.from_authorized_user_file(token_file)
                self._service = build("youtube", "v3", credentials=creds)
                self._authenticated = True
                logger.info("YouTube API ga muvaffaqiyatli ulandi")
                return True
            else:
                logger.warning(
                    "YouTube token fayli topilmadi. "
                    "Avval /youtube_auth buyrug'ini ishlating."
                )
                return False
        except Exception as e:
            logger.error(f"YouTube auth xatosi: {e}")
            return False

    async def publish(
        self,
        title: str,
        description: str,
        video_path: str | None = None,
        tags: list[str] | None = None,
    ) -> dict:
        """YouTube ga video yuklash."""
        if not video_path or not os.path.exists(video_path):
            return {
                "success": False,
                "error": "YouTube uchun video fayli kerak",
            }

        if not await self._ensure_auth():
            return {
                "success": False,
                "error": "YouTube API ga ulanib bo'lmadi",
            }

        try:
            from googleapiclient.http import MediaFileUpload

            body = {
                "snippet": {
                    "title": title[:100],
                    "description": description[:5000],
                    "tags": tags or ["AI", "SuniyIntellekt"],
                    "categoryId": "28",  # Science & Technology
                },
                "status": {
                    "privacyStatus": "public",
                    "selfDeclaredMadeForKids": False,
                },
            }

            media = MediaFileUpload(
                video_path, chunksize=1024 * 1024, resumable=True
            )

            request = self._service.videos().insert(
                part="snippet,status", body=body, media_body=media
            )

            response = request.execute()

            return {
                "success": True,
                "video_id": response.get("id", ""),
                "url": f"https://youtube.com/watch?v={response.get('id', '')}",
            }
        except Exception as e:
            logger.error(f"YouTube yuklash xatosi: {e}")
            return {"success": False, "error": str(e)}
