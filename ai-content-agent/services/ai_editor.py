import logging
from openai import AsyncOpenAI

from config import Config
from database.models import SystemSettings, async_session

from sqlalchemy import select

logger = logging.getLogger(__name__)


class AIEditor:
    """OpenAI yordamida kontentni tarjima va tahrirlash."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = Config.OPENAI_MODEL

    async def get_system_prompt(self) -> str:
        """Databasedan joriy system promptni olish."""
        async with async_session() as session:
            result = await session.execute(
                select(SystemSettings).where(
                    SystemSettings.key == "system_prompt"
                )
            )
            setting = result.scalar_one_or_none()
            if setting:
                return setting.value
        return Config.DEFAULT_SYSTEM_PROMPT

    async def translate_and_format(
        self, content: str, source_url: str | None = None
    ) -> dict:
        """Kontentni o'zbekchaga tarjima qilib post formatiga keltirish."""
        system_prompt = await self.get_system_prompt()

        user_prompt = f"""Quyidagi kontentni o'zbek tiliga tarjima qil va Telegram/Instagram uchun chiroyli post formatida yoz.

Qoidalar:
1. O'zbek tilida yoz (lotin alifbosida)
2. Sarlavha qo'y (emoji bilan)
3. Asosiy matn qisqa va tushunarli bo'lsin
4. Teglar (#hashtag) qo'sh
5. Manba havolasini saqla (agar bo'lsa)
6. Post 2000 belgidan oshmasin

Kontent:
{content}

{"Manba: " + source_url if source_url else ""}

Javobni JSON formatda ber:
{{"title": "sarlavha", "body": "to'liq post matni", "hashtags": ["tag1", "tag2"]}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            import json

            result = json.loads(response.choices[0].message.content)
            return {
                "title": result.get("title", ""),
                "body": result.get("body", ""),
                "hashtags": result.get("hashtags", []),
            }
        except Exception as e:
            logger.error(f"AI tarjima xatosi: {e}")
            return {
                "title": "Tarjima xatosi",
                "body": content[:1500],
                "hashtags": ["#AI", "#SuniyIntellekt"],
            }

    async def edit_content(self, original: str, edit_instructions: str) -> dict:
        """Foydalanuvchi ko'rsatmasi bo'yicha kontentni tahrirlash."""
        system_prompt = await self.get_system_prompt()

        user_prompt = f"""Quyidagi postni foydalanuvchining ko'rsatmasiga ko'ra tahrirlash kerak.

Joriy post:
{original}

Foydalanuvchi ko'rsatmasi:
{edit_instructions}

Tahrirlangan postni JSON formatda ber:
{{"title": "yangi sarlavha", "body": "tahrirlangan to'liq post matni", "hashtags": ["tag1", "tag2"]}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            import json

            result = json.loads(response.choices[0].message.content)
            return {
                "title": result.get("title", ""),
                "body": result.get("body", ""),
                "hashtags": result.get("hashtags", []),
            }
        except Exception as e:
            logger.error(f"AI tahrirlash xatosi: {e}")
            return {
                "title": "",
                "body": original,
                "hashtags": [],
            }

    async def generate_caption_from_media(
        self, media_description: str
    ) -> dict:
        """Rasm/video uchun post yaratish."""
        system_prompt = await self.get_system_prompt()

        user_prompt = f"""Quyidagi media (rasm/video) haqida AI mavzusida Telegram/Instagram uchun post yoz.

Media tavsifi:
{media_description}

Qoidalar:
1. O'zbek tilida (lotin alifbosida)
2. Qiziqarli sarlavha
3. Qisqa va mazmunli matn
4. Teglar qo'sh
5. Post 1500 belgidan oshmasin

JSON formatda javob ber:
{{"title": "sarlavha", "body": "to'liq post matni", "hashtags": ["tag1", "tag2"]}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            import json

            result = json.loads(response.choices[0].message.content)
            return {
                "title": result.get("title", ""),
                "body": result.get("body", ""),
                "hashtags": result.get("hashtags", []),
            }
        except Exception as e:
            logger.error(f"AI media caption xatosi: {e}")
            return {
                "title": "AI Yangilik",
                "body": media_description[:1000],
                "hashtags": ["#AI"],
            }
