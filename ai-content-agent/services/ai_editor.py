import json
import logging

from openai import AsyncOpenAI
from sqlalchemy import select

from config import (
    CONTENT_TYPE_GENERATED,
    CONTENT_TYPE_NEWS,
    CONTENT_TYPE_PROMPT,
    Config,
)
from database.models import SystemSettings, async_session

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

    def _get_content_type_prompt(self, content_type: str) -> str:
        """Kontent turiga qarab maxsus prompt olish."""
        if content_type == CONTENT_TYPE_NEWS:
            return """Bu AI YANGILIK posti. Qoidalar:
1. O'zbek tilida (lotin alifbosida) yoz
2. Sarlavha qiziqarli va aniq bo'lsin (emoji bilan)
3. AI model nomi, kompaniya va asosiy xususiyatlarini batafsil yoz
4. Model parametrlari, imkoniyatlari haqida yoz (agar ma'lumot bo'lsa)
5. Nima uchun bu muhim — foydalanuvchiga tushunarli qilib yoz
6. Manba URL ni albatta ko'rsat: 🔗 Manba: [url]
7. Teglar (#hashtag) qo'sh
8. Post 2000 belgidan oshmasin

Misol format:
🤖 [SARLAVHA]

📌 [Batafsil tavsif...]

🔗 Manba: [url]

#AI #SuniyIntellekt #[teglar]"""

        elif content_type == CONTENT_TYPE_PROMPT:
            return """Bu AI PROMPT + RASM posti. Qoidalar:
1. O'zbek tilida (lotin alifbosida) yoz
2. Sarlavha: qaysi AI tool (Midjourney/DALL-E/Stable Diffusion) va nima yaratilgani
3. PROMPT ni to'liq ingliz tilida yoz (originalda)
4. Promptning o'zbekcha tavsifini ham ber
5. Qaysi AI tool/model ishlatilgani yoz
6. Manba URL ni albatta ko'rsat: 🔗 Manba: [url]
7. Teglar (#hashtag) qo'sh

Misol format:
🎨 [SARLAVHA]

🖼 AI Tool: [Midjourney/DALL-E/SD]

📝 Prompt:
"[original prompt inglizchada]"

📌 Tavsif: [o'zbekcha tushuntirish]

🔗 Manba: [url]

#AIArt #Prompt #[teglar]"""

        elif content_type == CONTENT_TYPE_GENERATED:
            return """Bu AI YARATGAN KONTENT posti (rasm/video). Qoidalar:
1. O'zbek tilida (lotin alifbosida) yoz
2. Sarlavha: nima yaratilgani va qaysi AI tool
3. Agar prompt ma'lum bo'lsa — to'liq inglizchada yoz
4. AI tool/model nomini yoz (Sora, Runway, Kling, DALL-E va h.k.)
5. Kontent haqida batafsil tavsif ber
6. Manba URL ni albatta ko'rsat: 🔗 Manba: [url]
7. Teglar (#hashtag) qo'sh

Misol format:
🎬 [SARLAVHA]

🤖 AI Tool: [Sora/Runway/Kling/...]
📝 Prompt: "[prompt agar mavjud bo'lsa]"

📌 Tavsif: [batafsil o'zbekcha tushuntirish]

🔗 Manba: [url]

#AIGenerated #AIVideo #[teglar]"""

        return ""

    async def translate_and_format(
        self,
        content: str,
        source_url: str | None = None,
        content_type: str = CONTENT_TYPE_NEWS,
    ) -> dict:
        """Kontentni o'zbekchaga tarjima qilib post formatiga keltirish."""
        system_prompt = await self.get_system_prompt()
        type_prompt = self._get_content_type_prompt(content_type)

        user_prompt = f"""{type_prompt}

Kontent:
{content}

{"🔗 Manba: " + source_url if source_url else ""}

Javobni JSON formatda ber:
{{"title": "sarlavha", "body": "to'liq post matni (manba URL bilan)", "hashtags": ["tag1", "tag2"]}}"""

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

        user_prompt = f"""Quyidagi media (rasm/video) haqida AI mavzusida Telegram uchun post yoz.

Media tavsifi:
{media_description}

Qoidalar:
1. O'zbek tilida (lotin alifbosida)
2. Qiziqarli sarlavha (emoji bilan)
3. Batafsil va mazmunli matn
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
