import logging
import os
import uuid

from aiogram import Router, F
from aiogram.types import Message

from config import Config
from database.models import ContentPost, async_session
from handlers.approval import send_post_preview
from services.ai_editor import AIEditor

logger = logging.getLogger(__name__)
router = Router()


@router.message(F.photo)
async def on_photo(message: Message):
    """Foydalanuvchi rasm yuborsa."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    await message.answer("📸 Rasm qabul qilindi, post tayyorlanmoqda...")

    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)

    os.makedirs(Config.MEDIA_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(Config.MEDIA_DIR, filename)
    await message.bot.download_file(file.file_path, filepath)

    caption = message.caption or ""
    editor = AIEditor()

    if caption:
        result = await editor.translate_and_format(caption)
    else:
        result = await editor.generate_caption_from_media(
            "AI mavzusidagi rasm. Rasm yuborildi."
        )

    body = result["body"]
    if result.get("hashtags"):
        body += "\n\n" + " ".join(f"#{t}" for t in result["hashtags"])

    async with async_session() as session:
        post = ContentPost(
            title=result.get("title", ""),
            body=body,
            original_text=caption,
            image_path=filepath,
            status="pending",
            origin="manual",
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)

    await send_post_preview(
        message.bot,
        message.chat.id,
        post,
        prefix="📎 <b>Sizning kontentingiz:</b>\n\n",
    )


@router.message(F.video)
async def on_video(message: Message):
    """Foydalanuvchi video yuborsa."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    await message.answer("🎥 Video qabul qilindi, post tayyorlanmoqda...")

    video = message.video
    file = await message.bot.get_file(video.file_id)

    os.makedirs(Config.MEDIA_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.mp4"
    filepath = os.path.join(Config.MEDIA_DIR, filename)
    await message.bot.download_file(file.file_path, filepath)

    caption = message.caption or ""
    editor = AIEditor()

    if caption:
        result = await editor.translate_and_format(caption)
    else:
        result = await editor.generate_caption_from_media(
            "AI mavzusidagi video. Video yuborildi."
        )

    body = result["body"]
    if result.get("hashtags"):
        body += "\n\n" + " ".join(f"#{t}" for t in result["hashtags"])

    async with async_session() as session:
        post = ContentPost(
            title=result.get("title", ""),
            body=body,
            original_text=caption,
            video_path=filepath,
            status="pending",
            origin="manual",
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)

    await send_post_preview(
        message.bot,
        message.chat.id,
        post,
        prefix="📎 <b>Sizning kontentingiz:</b>\n\n",
    )


@router.message(F.document)
async def on_document(message: Message):
    """Foydalanuvchi fayl yuborsa."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    doc = message.document
    mime = doc.mime_type or ""

    if "image" in mime:
        file = await message.bot.get_file(doc.file_id)
        ext = os.path.splitext(doc.file_name or "file.jpg")[1]
        os.makedirs(Config.MEDIA_DIR, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(Config.MEDIA_DIR, filename)
        await message.bot.download_file(file.file_path, filepath)

        caption = message.caption or ""
        editor = AIEditor()
        if caption:
            result = await editor.translate_and_format(caption)
        else:
            result = await editor.generate_caption_from_media(
                "AI mavzusidagi rasm."
            )

        body = result["body"]
        if result.get("hashtags"):
            body += "\n\n" + " ".join(f"#{t}" for t in result["hashtags"])

        async with async_session() as session:
            post = ContentPost(
                title=result.get("title", ""),
                body=body,
                original_text=caption,
                image_path=filepath,
                status="pending",
                origin="manual",
            )
            session.add(post)
            await session.commit()
            await session.refresh(post)

        await send_post_preview(
            message.bot, message.chat.id, post,
            prefix="📎 <b>Sizning kontentingiz:</b>\n\n",
        )
    elif "video" in mime:
        file = await message.bot.get_file(doc.file_id)
        ext = os.path.splitext(doc.file_name or "file.mp4")[1]
        os.makedirs(Config.MEDIA_DIR, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(Config.MEDIA_DIR, filename)
        await message.bot.download_file(file.file_path, filepath)

        caption = message.caption or ""
        editor = AIEditor()
        if caption:
            result = await editor.translate_and_format(caption)
        else:
            result = await editor.generate_caption_from_media(
                "AI mavzusidagi video."
            )

        body = result["body"]
        if result.get("hashtags"):
            body += "\n\n" + " ".join(f"#{t}" for t in result["hashtags"])

        async with async_session() as session:
            post = ContentPost(
                title=result.get("title", ""),
                body=body,
                original_text=caption,
                video_path=filepath,
                status="pending",
                origin="manual",
            )
            session.add(post)
            await session.commit()
            await session.refresh(post)

        await send_post_preview(
            message.bot, message.chat.id, post,
            prefix="📎 <b>Sizning kontentingiz:</b>\n\n",
        )
    else:
        await message.answer(
            "⚠️ Faqat rasm va video fayllar qabul qilinadi."
        )


@router.message(F.text & ~F.text.startswith("/"))
async def on_text(message: Message):
    """Foydalanuvchi matn yuborsa."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    from main import get_editing_post, clear_editing_post

    editing_post_id = get_editing_post()

    if editing_post_id:
        await _handle_edit(message, editing_post_id)
        clear_editing_post()
        return

    await message.answer("📝 Matn qabul qilindi, post tayyorlanmoqda...")

    editor = AIEditor()
    result = await editor.translate_and_format(message.text)

    body = result["body"]
    if result.get("hashtags"):
        body += "\n\n" + " ".join(f"#{t}" for t in result["hashtags"])

    async with async_session() as session:
        post = ContentPost(
            title=result.get("title", ""),
            body=body,
            original_text=message.text,
            status="pending",
            origin="manual",
        )
        session.add(post)
        await session.commit()
        await session.refresh(post)

    await send_post_preview(
        message.bot,
        message.chat.id,
        post,
        prefix="📎 <b>Sizning kontentingiz:</b>\n\n",
    )


async def _handle_edit(message: Message, post_id: int):
    """Tahrirlash ko'rsatmasini bajarish."""
    await message.answer("✏️ Tahrirlanmoqda...")

    editor = AIEditor()

    async with async_session() as session:
        from sqlalchemy import select

        result = await session.execute(
            select(ContentPost).where(ContentPost.id == post_id)
        )
        post = result.scalar_one_or_none()
        if not post:
            await message.answer("Post topilmadi.")
            return

        edit_result = await editor.edit_content(post.body, message.text)

        new_body = edit_result["body"]
        if edit_result.get("hashtags"):
            new_body += "\n\n" + " ".join(
                f"#{t}" for t in edit_result["hashtags"]
            )

        post.body = new_body
        if edit_result.get("title"):
            post.title = edit_result["title"]
        post.status = "pending"
        await session.commit()
        await session.refresh(post)

    await send_post_preview(
        message.bot,
        message.chat.id,
        post,
        prefix="✏️ <b>Tahrirlangan post:</b>\n\n",
    )
