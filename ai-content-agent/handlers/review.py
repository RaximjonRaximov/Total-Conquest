import html
import logging

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

from config import Config
from services.video_review import VideoReviewGenerator

logger = logging.getLogger(__name__)
router = Router()


class ReviewStates(StatesGroup):
    choosing_platform = State()
    waiting_description = State()
    waiting_questions = State()


SUPPORTED_PLATFORMS = {
    "streaka": "Streaka Hub — qisqa video uchun feedback ($0.50–$5+)",
    "playbookux": "PlaybookUX — sayt/ilova testlari ($10–$90)",
    "usertesting": "UserTesting — UX fikrlar ($10–$60)",
    "medium": "Medium review maqolasi (uzoq muddatli daromad)",
    "youtube": "YouTube review skripti (monetizatsiya uchun)",
    "appen": "Appen/CrowdGen — video rater loyihalari ($500+ 2 haftada)",
}


def is_admin(user_id: int) -> bool:
    return user_id == Config.ADMIN_USER_ID


@router.message(Command("review"))
async def cmd_review(message: Message, state: FSMContext):
    """Video review yozishni boshlash."""
    if not is_admin(message.from_user.id):
        await message.answer("⛔ Sizda ruxsat yo'q.")
        return

    platforms_text = "\n".join(
        f"<b>{key}</b> — {value}" for key, value in SUPPORTED_PLATFORMS.items()
    )

    await message.answer(
        "🎬 <b>Video review yordamchisi</b>\n\n"
        "Qaysi platforma uchun review yozmoqchisiz?\n\n"
        f"{platforms_text}\n\n"
        "Platforma nomini yozib yuboring (masalan: <code>streaka</code>)",
        parse_mode="HTML",
    )
    await state.set_state(ReviewStates.choosing_platform)


@router.message(ReviewStates.choosing_platform, F.text)
async def process_platform(message: Message, state: FSMContext):
    """Foydalanuvchi platformani tanlaydi."""
    if not is_admin(message.from_user.id):
        await message.answer("⛔ Sizda ruxsat yo'q.")
        return

    platform = message.text.lower().strip()
    if platform not in SUPPORTED_PLATFORMS:
        await message.answer(
            "❌ Noto'g'ri platforma. Iltimos, quyidagilardan birini yozing:\n\n"
            + ", ".join(f"<code>{k}</code>" for k in SUPPORTED_PLATFORMS.keys()),
            parse_mode="HTML",
        )
        return

    await state.update_data(platform=platform)
    await message.answer(
        "📝 Ajoyib! Endi ko'rgan video haqida <b>ozbekcha</b> qisqacha yozing.\n\n"
        "Nimalar kerak:\n"
        "• Video nomi / mavzusi\n"
        "• Nima haqida ekanligi\n"
        "• Sizga yoqqan / yoqmagan narsalar\n\n"
        "O'zbekcha yozib yuboring, men inglizchaga professional review qilib beraman.",
        parse_mode="HTML",
    )
    await state.set_state(ReviewStates.waiting_description)


@router.message(ReviewStates.waiting_description, F.text)
async def process_description(message: Message, state: FSMContext):
    """Video tavsifini qabul qilish."""
    if not is_admin(message.from_user.id):
        await message.answer("⛔ Sizda ruxsat yo'q.")
        return

    await state.update_data(description=message.text)

    await message.answer(
        "❓ Agar platform sizga savollar bergan bo'lsa, ularni yuboring.\n\n"
        "Aks holda, shunchaki <code>yo'q</code> yoki <code>no</code> yozing.\n\n"
        "Misol:\n"
        "<i>1. Did you enjoy the video?\n"
        "2. What was unclear?\n"
        "3. Would you recommend it?</i>",
        parse_mode="HTML",
    )
    await state.set_state(ReviewStates.waiting_questions)


@router.message(ReviewStates.waiting_questions, F.text)
async def process_questions(message: Message, state: FSMContext):
    """Savollarni qabul qilib review yaratish."""
    if not is_admin(message.from_user.id):
        await message.answer("⛔ Sizda ruxsat yo'q.")
        return

    data = await state.get_data()
    platform = data["platform"]
    description = data["description"]
    questions = message.text.strip()
    if questions.lower() in ("yo'q", "yoq", "no", "none", "-"):
        questions = None

    await message.answer("⏳ Review tayyorlanmoqda...")

    generator = VideoReviewGenerator()
    try:
        result = await generator.generate_review(
            video_description=description,
            questions=questions,
            platform=platform,
        )

        review_text = result["review"]
        title = result.get("title", "")
        word_count = result.get("word_count", 0)

        safe_review = html.escape(review_text)
        safe_title = html.escape(title)

        await message.answer(
            f"✅ <b>{SUPPORTED_PLATFORMS[platform].split('—')[0].strip()} uchun review tayyor!</b>\n\n"
            f"<b>Sarlavha:</b> {safe_title}\n"
            f"<b>So'zlar soni:</b> {word_count}\n\n"
            f"<blockquote expandable>{safe_review}</blockquote>\n\n"
            "📋 Yuqoridagi matnni nusxa olib, platformaga joylang.\n\n"
            "Yana review yozish uchun /review",
            parse_mode="HTML",
        )

    except Exception as e:
        logger.error(f"Review handler error: {e}")
        await message.answer(
            f"❌ Review yaratishda xatolik: {str(e)[:500]}\n\n"
            "Yana urinib ko'ring: /review"
        )
    finally:
        await state.clear()
