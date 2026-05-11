import logging

from aiogram import Router, F
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
)
from sqlalchemy import select

from config import Config
from database.models import ContentPost, async_session

logger = logging.getLogger(__name__)
router = Router()


def get_approval_keyboard(post_id: int) -> InlineKeyboardMarkup:
    """Tasdiqlash/rad etish tugmalari."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Tasdiqlash",
                    callback_data=f"approve_{post_id}",
                ),
                InlineKeyboardButton(
                    text="❌ Rad etish",
                    callback_data=f"reject_{post_id}",
                ),
            ],
            [
                InlineKeyboardButton(
                    text="✏️ Tahrirlash",
                    callback_data=f"edit_{post_id}",
                ),
                InlineKeyboardButton(
                    text="🔄 Qayta qidirish",
                    callback_data=f"retry_{post_id}",
                ),
            ],
        ]
    )


async def send_post_preview(
    bot,
    chat_id: int,
    post: ContentPost,
    prefix: str = "",
):
    """Post namunasini ko'rsatish."""
    origin_label = "🤖 Avtomatik" if post.origin == "auto" else "📎 Manual"
    header = f"{prefix}{origin_label} | Post #{post.id}\n\n"

    preview_text = header + post.body

    keyboard = get_approval_keyboard(post.id)

    if post.image_path:
        from aiogram.types import FSInputFile

        photo = FSInputFile(post.image_path)
        await bot.send_photo(
            chat_id=chat_id,
            photo=photo,
            caption=preview_text[:1024],
            parse_mode="HTML",
            reply_markup=keyboard,
        )
    elif post.video_path:
        from aiogram.types import FSInputFile

        video = FSInputFile(post.video_path)
        await bot.send_video(
            chat_id=chat_id,
            video=video,
            caption=preview_text[:1024],
            parse_mode="HTML",
            reply_markup=keyboard,
        )
    else:
        await bot.send_message(
            chat_id=chat_id,
            text=preview_text[:4096],
            parse_mode="HTML",
            reply_markup=keyboard,
        )


@router.callback_query(F.data.startswith("approve_"))
async def on_approve(callback: CallbackQuery):
    """Post tasdiqlash."""
    if callback.from_user.id != Config.ADMIN_USER_ID:
        await callback.answer("⛔ Ruxsat yo'q", show_alert=True)
        return

    post_id = int(callback.data.split("_")[1])

    async with async_session() as session:
        result = await session.execute(
            select(ContentPost).where(ContentPost.id == post_id)
        )
        post = result.scalar_one_or_none()
        if not post:
            await callback.answer("Post topilmadi", show_alert=True)
            return

        post.status = "approved"
        await session.commit()

    await callback.answer("✅ Tasdiqlandi! Yuborilmoqda...")

    # Import here to avoid circular
    from main import get_publisher, get_scheduler

    publisher = get_publisher()
    scheduler = get_scheduler()

    pub_results = await publisher.publish_post(post_id)
    report = publisher.format_publish_report(pub_results)

    scheduler.mark_approved()

    await callback.message.answer(report, parse_mode="HTML")

    await callback.message.edit_reply_markup(reply_markup=None)


@router.callback_query(F.data.startswith("reject_"))
async def on_reject(callback: CallbackQuery):
    """Post rad etish."""
    if callback.from_user.id != Config.ADMIN_USER_ID:
        await callback.answer("⛔ Ruxsat yo'q", show_alert=True)
        return

    post_id = int(callback.data.split("_")[1])

    async with async_session() as session:
        result = await session.execute(
            select(ContentPost).where(ContentPost.id == post_id)
        )
        post = result.scalar_one_or_none()
        if not post:
            await callback.answer("Post topilmadi", show_alert=True)
            return

        post.status = "rejected"
        await session.commit()

    from main import get_scheduler

    get_scheduler().mark_rejected()

    await callback.answer("❌ Rad etildi")
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(
        f"Post #{post_id} rad etildi.\n\n"
        "Variantlar:\n"
        "• /search — Yangi kontent qidirish\n"
        "• Matn/rasm yuboring — manual post yaratish"
    )


@router.callback_query(F.data.startswith("edit_"))
async def on_edit(callback: CallbackQuery):
    """Post tahrirlash rejimiga o'tish."""
    if callback.from_user.id != Config.ADMIN_USER_ID:
        await callback.answer("⛔ Ruxsat yo'q", show_alert=True)
        return

    post_id = int(callback.data.split("_")[1])

    async with async_session() as session:
        result = await session.execute(
            select(ContentPost).where(ContentPost.id == post_id)
        )
        post = result.scalar_one_or_none()
        if not post:
            await callback.answer("Post topilmadi", show_alert=True)
            return

        post.status = "editing"
        await session.commit()

    await callback.answer("✏️ Tahrirlash rejimi")
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(
        f"✏️ <b>Post #{post_id} tahrirlash</b>\n\n"
        "Qanday o'zgartirish kerakligini yozing.\n"
        "Masalan: «Sarlavhani qisqartir» yoki «Hashtaglarni o'zgartir»\n\n"
        f"<i>Tahrirlash uchun javob yozing (reply):</i>",
        parse_mode="HTML",
    )

    # editing state ni saqlash uchun
    from main import set_editing_post

    set_editing_post(post_id)


@router.callback_query(F.data.startswith("retry_"))
async def on_retry(callback: CallbackQuery):
    """Qayta qidirish."""
    if callback.from_user.id != Config.ADMIN_USER_ID:
        await callback.answer("⛔ Ruxsat yo'q", show_alert=True)
        return

    post_id = int(callback.data.split("_")[1])

    async with async_session() as session:
        result = await session.execute(
            select(ContentPost).where(ContentPost.id == post_id)
        )
        post = result.scalar_one_or_none()
        if post:
            post.status = "rejected"
            await session.commit()

    await callback.answer("🔄 Qayta qidirilmoqda...")
    await callback.message.edit_reply_markup(reply_markup=None)

    from main import trigger_search

    await trigger_search()
