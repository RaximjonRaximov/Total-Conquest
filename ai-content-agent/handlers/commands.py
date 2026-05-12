import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

from config import Config

logger = logging.getLogger(__name__)
router = Router()


def is_admin(user_id: int) -> bool:
    return user_id == Config.ADMIN_USER_ID


@router.message(Command("start"))
async def cmd_start(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("⛔ Sizda ruxsat yo'q.")
        return

    await message.answer(
        "🤖 <b>AI Kontent Agent</b>\n\n"
        "Men sizning AI kontent boshqaruvchingizman!\n\n"
        "📋 <b>Buyruqlar:</b>\n"
        "/help — Barcha buyruqlar\n"
        "/status — Bot holati\n"
        "/search — Hozir kontent qidirish\n"
        "/schedule — Jadval sozlamalari\n"
        "/system — System prompt boshqaruvi\n"
        "/channels — Kanallar ro'yxati\n\n"
        "📎 Rasm, video yoki matn yuboring — men post tayyorlab beraman!",
        parse_mode="HTML",
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    if not is_admin(message.from_user.id):
        return

    await message.answer(
        "📋 <b>Barcha buyruqlar:</b>\n\n"
        "<b>🔍 Kontent:</b>\n"
        "/search — AI yangiliklar qidirish\n"
        "/search news — AI yangiliklar\n"
        "/search prompt — AI prompt + rasm\n"
        "/search video — AI yaratgan kontent\n\n"
        "<b>📅 Jadval:</b>\n"
        "/schedule — Joriy jadval\n"
        "/schedule set 9,13,18 — Soatlarni belgilash\n\n"
        "<b>⚙️ Sozlamalar:</b>\n"
        "/system — Joriy system prompt\n"
        "/system set [matn] — System promptni o'zgartirish\n"
        "/channels — Kanallar ro'yxati\n"
        "/status — Bot holati\n\n"
        "<b>📎 Manual kontent:</b>\n"
        "• Matn yuboring — post qilib beraman\n"
        "• Rasm yuboring — rasm bilan post\n"
        "• Video yuboring — video bilan post\n"
        "• Rasm + matn — ikkalasi bilan post\n\n"
        "<b>📊 Boshqaruv:</b>\n"
        "/history — Oxirgi postlar tarixi\n"
        "/stats — Statistika",
        parse_mode="HTML",
    )


@router.message(Command("status"))
async def cmd_status(message: Message):
    if not is_admin(message.from_user.id):
        return


    channels_text = "\n".join(
        f"  • {ch}" for ch in Config.TELEGRAM_CHANNELS
    ) or "  Sozlanmagan"

    ig_status = "✅ Sozlangan" if Config.INSTAGRAM_USERNAME else "❌ Sozlanmagan"
    yt_status = "✅ Sozlangan" if Config.YOUTUBE_CLIENT_ID else "❌ Sozlanmagan"

    await message.answer(
        "📊 <b>Bot holati:</b>\n\n"
        f"<b>Telegram kanallar:</b>\n{channels_text}\n\n"
        f"<b>Instagram:</b> {ig_status}\n"
        f"<b>YouTube:</b> {yt_status}\n"
        f"<b>AI Model:</b> {Config.OPENAI_MODEL}\n\n"
        f"<b>Jadval soatlari:</b> "
        f"{', '.join(str(h) + ':00' for h in sorted(Config.SCHEDULE_HOURS))}",
        parse_mode="HTML",
    )


@router.message(Command("channels"))
async def cmd_channels(message: Message):
    if not is_admin(message.from_user.id):
        return

    if not Config.TELEGRAM_CHANNELS:
        await message.answer(
            "📢 Hech qanday kanal sozlanmagan.\n\n"
            ".env fayliga TELEGRAM_CHANNELS qo'shing."
        )
        return

    channels_text = "\n".join(
        f"  {i+1}. {ch}" for i, ch in enumerate(Config.TELEGRAM_CHANNELS)
    )
    await message.answer(
        f"📢 <b>Telegram kanallar:</b>\n\n{channels_text}",
        parse_mode="HTML",
    )
