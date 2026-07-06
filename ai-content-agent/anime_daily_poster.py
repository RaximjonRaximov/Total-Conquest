"""
Har kuni random anime personajlarini realistic/live-action style da
rasm generatsiya qilib Telegram botga yuborish.

Foydalanish:
    python3 anime_daily_poster.py
"""

import asyncio
import logging
import os
import sys
import urllib.parse

import aiohttp

from anime_database import get_random_anime_for_today, ANIME_DATABASE

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Bot token
BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "8647235630:AAF31WGqV-46v_bpc9DLMxq8wY9Vko1QKak",
)
# Admin chat ID - botga /start bosilganda olinadi
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "818518622")

# Rasm generatsiya sozlamalari
IMAGE_WIDTH = 1024
IMAGE_HEIGHT = 1280
IMAGE_MODEL = "flux"

# Rasm saqlash papkasi
IMAGE_DIR = os.path.join(os.path.dirname(__file__), "data", "anime_images")
os.makedirs(IMAGE_DIR, exist_ok=True)


def build_image_prompt(character: dict, anime_name: str) -> str:
    """Personaj uchun realistic rasm promptini yaratish."""
    name = character["name"]
    desc = character["description"]
    personality = character["personality"]

    prompt = (
        f"Ultra realistic live-action movie photograph of {name} from {anime_name} anime. "
        f"Photo-realistic, cinematic lighting, 8K quality, detailed skin texture. "
        f"Character appearance: {desc}. "
        f"Character vibe: {personality}. "
        f"The person should look like a real human in a live-action movie adaptation, "
        f"wearing the exact same iconic outfit from the anime but made with real fabrics and materials. "
        f"Professional movie still photography, shallow depth of field, dramatic lighting, "
        f"highly detailed face and eyes, natural skin, photorealistic rendering. "
        f"NOT cartoon, NOT anime style - fully realistic live-action human photograph."
    )
    return prompt


async def generate_image(session: aiohttp.ClientSession, prompt: str, filename: str) -> str | None:
    """Pollinations.ai orqali rasm generatsiya qilish."""
    encoded_prompt = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?width={IMAGE_WIDTH}&height={IMAGE_HEIGHT}&model={IMAGE_MODEL}&nologo=true&enhance=true"
    )

    filepath = os.path.join(IMAGE_DIR, filename)

    try:
        logger.info(f"Rasm generatsiya qilinmoqda: {filename}...")
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=120)) as resp:
            if resp.status != 200:
                logger.error(f"Rasm generatsiya xatosi: {resp.status}")
                return None
            content_type = resp.headers.get("Content-Type", "")
            if "image" not in content_type:
                logger.error(f"Noto'g'ri content type: {content_type}")
                return None
            image_data = await resp.read()
            with open(filepath, "wb") as f:
                f.write(image_data)
            logger.info(f"Rasm saqlandi: {filepath} ({len(image_data)} bytes)")
            return filepath
    except asyncio.TimeoutError:
        logger.error(f"Rasm generatsiya timeout: {filename}")
        return None
    except Exception as e:
        logger.error(f"Rasm generatsiya xatosi: {e}")
        return None


async def get_bot_chat_id(session: aiohttp.ClientSession) -> str | None:
    """Bot updates dan admin chat ID olish."""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    try:
        async with session.get(url) as resp:
            data = await resp.json()
            if data.get("ok") and data.get("result"):
                for update in data["result"]:
                    msg = update.get("message", {})
                    chat_id = msg.get("chat", {}).get("id")
                    if chat_id:
                        return str(chat_id)
    except Exception as e:
        logger.error(f"Chat ID olishda xato: {e}")
    return None


async def send_photo_to_telegram(
    session: aiohttp.ClientSession,
    chat_id: str,
    photo_path: str,
    caption: str,
) -> bool:
    """Telegram botga rasm yuborish."""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"

    try:
        with open(photo_path, "rb") as photo_file:
            form = aiohttp.FormData()
            form.add_field("chat_id", chat_id)
            form.add_field("caption", caption, content_type="text/plain")
            form.add_field("parse_mode", "HTML")
            form.add_field(
                "photo",
                photo_file,
                filename=os.path.basename(photo_path),
                content_type="image/jpeg",
            )

            async with session.post(url, data=form) as resp:
                result = await resp.json()
                if result.get("ok"):
                    logger.info(f"Rasm yuborildi: {os.path.basename(photo_path)}")
                    return True
                else:
                    logger.error(f"Telegram xatosi: {result}")
                    return False
    except Exception as e:
        logger.error(f"Rasm yuborishda xato: {e}")
        return False


async def send_message_to_telegram(
    session: aiohttp.ClientSession,
    chat_id: str,
    text: str,
) -> bool:
    """Telegram botga matn yuborish."""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    try:
        async with session.post(url, json=payload) as resp:
            result = await resp.json()
            return result.get("ok", False)
    except Exception as e:
        logger.error(f"Xabar yuborishda xato: {e}")
        return False


async def run_daily_anime_post(specific_anime: str | None = None):
    """Bugungi anime uchun barcha personajlar rasmini generatsiya qilib yuborish."""

    if specific_anime and specific_anime in ANIME_DATABASE:
        anime_name = specific_anime
        anime_data = ANIME_DATABASE[specific_anime]
    else:
        anime_name, anime_data = get_random_anime_for_today()

    characters = anime_data["characters"]
    logger.info(f"Bugungi anime: {anime_name} ({len(characters)} personaj)")

    async with aiohttp.ClientSession() as session:
        # Chat ID aniqlash
        chat_id = ADMIN_CHAT_ID
        if not chat_id:
            chat_id = await get_bot_chat_id(session)
            if not chat_id:
                logger.error(
                    "Chat ID topilmadi! Avval botga /start yuboring."
                )
                return

        logger.info(f"Chat ID: {chat_id}")

        # Boshlanish xabari
        header = (
            f"🎌 <b>Bugungi anime: {anime_name}</b>\n"
            f"📝 {anime_data['description']}\n"
            f"👥 Personajlar soni: {len(characters)}\n\n"
            f"Har bir personajning realistic/live-action rasmi generatsiya qilinmoqda... ⏳"
        )
        await send_message_to_telegram(session, chat_id, header)

        success_count = 0
        fail_count = 0

        for i, character in enumerate(characters, 1):
            char_name = character["name"]
            logger.info(f"[{i}/{len(characters)}] {char_name} generatsiya qilinmoqda...")

            # Prompt yaratish
            prompt = build_image_prompt(character, anime_name)

            # Fayl nomi
            safe_name = char_name.replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "")
            filename = f"{anime_name.replace(' ', '_')}_{safe_name}.jpg"

            # Rasm generatsiya qilish
            image_path = await generate_image(session, prompt, filename)

            if image_path:
                # Caption yaratish
                caption = (
                    f"🎌 <b>{anime_name}</b>\n"
                    f"👤 <b>{char_name}</b>\n"
                    f"✨ {character['personality']}\n\n"
                    f"📸 Realistic Live-Action Style\n"
                    f"[{i}/{len(characters)}]"
                )

                sent = await send_photo_to_telegram(session, chat_id, image_path, caption)
                if sent:
                    success_count += 1
                else:
                    fail_count += 1
            else:
                fail_count += 1
                await send_message_to_telegram(
                    session, chat_id,
                    f"❌ {char_name} uchun rasm generatsiya qilib bo'lmadi"
                )

            # Rate limiting - har bir rasm orasida 5 soniya kutish
            if i < len(characters):
                await asyncio.sleep(5)

        # Yakuniy xabar
        summary = (
            f"✅ <b>{anime_name} — Yakunlandi!</b>\n\n"
            f"📊 Natija:\n"
            f"  ✅ Muvaffaqiyatli: {success_count}\n"
            f"  ❌ Xato: {fail_count}\n"
            f"  📸 Jami: {len(characters)}\n\n"
            f"Ertaga boshqa anime personajlari keladi! 🎌"
        )
        await send_message_to_telegram(session, chat_id, summary)

        logger.info(
            f"Yakunlandi: {success_count} muvaffaqiyatli, "
            f"{fail_count} xato, jami {len(characters)}"
        )


if __name__ == "__main__":
    # Agar argument berilsa — shu anime uchun ishlaydi
    anime_arg = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(run_daily_anime_post(anime_arg))
