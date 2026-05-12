import logging

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import select

from config import Config
from database.models import ContentPost, SystemSettings, async_session

logger = logging.getLogger(__name__)
router = Router()


@router.message(Command("system"))
async def cmd_system(message: Message):
    """System prompt boshqaruvi."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    args = message.text.split(maxsplit=2)

    if len(args) < 2:
        async with async_session() as session:
            result = await session.execute(
                select(SystemSettings).where(
                    SystemSettings.key == "system_prompt"
                )
            )
            setting = result.scalar_one_or_none()
            current = (
                setting.value if setting else Config.DEFAULT_SYSTEM_PROMPT
            )

        await message.answer(
            f"⚙️ <b>Joriy System Prompt:</b>\n\n"
            f"<code>{current[:3000]}</code>\n\n"
            f"O'zgartirish uchun:\n"
            f"/system set [yangi prompt matni]",
            parse_mode="HTML",
        )
        return

    if args[1] == "set" and len(args) > 2:
        new_prompt = args[2]

        async with async_session() as session:
            result = await session.execute(
                select(SystemSettings).where(
                    SystemSettings.key == "system_prompt"
                )
            )
            setting = result.scalar_one_or_none()

            if setting:
                setting.value = new_prompt
            else:
                session.add(
                    SystemSettings(key="system_prompt", value=new_prompt)
                )
            await session.commit()

        await message.answer(
            f"✅ System prompt yangilandi!\n\n"
            f"<code>{new_prompt[:2000]}</code>",
            parse_mode="HTML",
        )
    elif args[1] == "reset":
        async with async_session() as session:
            result = await session.execute(
                select(SystemSettings).where(
                    SystemSettings.key == "system_prompt"
                )
            )
            setting = result.scalar_one_or_none()
            if setting:
                await session.delete(setting)
                await session.commit()

        await message.answer(
            "🔄 System prompt standart holatga qaytarildi.",
        )
    else:
        await message.answer(
            "❓ Noto'g'ri buyruq.\n\n"
            "Foydalanish:\n"
            "/system — Joriy promptni ko'rish\n"
            "/system set [matn] — Yangi prompt\n"
            "/system reset — Standart holatga qaytarish"
        )


@router.message(Command("schedule"))
async def cmd_schedule(message: Message):
    """Jadval sozlamalari."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    args = message.text.split()

    if len(args) < 2:
        from main import get_scheduler

        scheduler = get_scheduler()
        info = scheduler.get_schedule_info()
        await message.answer(
            f"📅 <b>Jadval sozlamalari:</b>\n\n{info}\n\n"
            f"O'zgartirish:\n/schedule set 9,13,18",
            parse_mode="HTML",
        )
        return

    if args[1] == "set" and len(args) > 2:
        try:
            hours = [int(h.strip()) for h in args[2].split(",")]
            valid_hours = [h for h in hours if 0 <= h <= 23]

            if not valid_hours:
                await message.answer("❌ Noto'g'ri soatlar. 0-23 oralig'ida.")
                return

            from main import get_scheduler

            scheduler = get_scheduler()
            scheduler.update_schedule(valid_hours)

            async with async_session() as session:
                result = await session.execute(
                    select(SystemSettings).where(
                        SystemSettings.key == "schedule_hours"
                    )
                )
                setting = result.scalar_one_or_none()
                value = ",".join(str(h) for h in valid_hours)
                if setting:
                    setting.value = value
                else:
                    session.add(
                        SystemSettings(key="schedule_hours", value=value)
                    )
                await session.commit()

            hours_text = ", ".join(f"{h}:00" for h in sorted(valid_hours))
            await message.answer(
                f"✅ Jadval yangilandi!\n\n"
                f"Yangi soatlar: {hours_text}",
            )
        except ValueError:
            await message.answer(
                "❌ Noto'g'ri format.\n"
                "To'g'ri: /schedule set 9,13,18"
            )
    else:
        await message.answer(
            "❓ Noto'g'ri buyruq.\n\n"
            "/schedule — Ko'rish\n"
            "/schedule set 9,13,18 — O'zgartirish"
        )


@router.message(Command("search"))
async def cmd_search(message: Message):
    """Hozir kontent qidirish. /search [news|prompt|generated]"""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    from config import CONTENT_TYPE_GENERATED, CONTENT_TYPE_NEWS, CONTENT_TYPE_PROMPT

    args = message.text.split()
    content_type = CONTENT_TYPE_NEWS

    if len(args) > 1:
        type_map = {
            "news": CONTENT_TYPE_NEWS,
            "yangilik": CONTENT_TYPE_NEWS,
            "prompt": CONTENT_TYPE_PROMPT,
            "rasm": CONTENT_TYPE_PROMPT,
            "generated": CONTENT_TYPE_GENERATED,
            "video": CONTENT_TYPE_GENERATED,
        }
        content_type = type_map.get(args[1].lower(), CONTENT_TYPE_NEWS)

    type_labels = {
        CONTENT_TYPE_NEWS: "📰 AI Yangiliklar",
        CONTENT_TYPE_PROMPT: "🎨 AI Prompt + Rasm",
        CONTENT_TYPE_GENERATED: "🎬 AI Yaratgan Kontent",
    }
    await message.answer(
        f"🔍 {type_labels.get(content_type, '')} qidirilmoqda..."
    )

    from main import trigger_search

    await trigger_search(content_type)


@router.message(Command("history"))
async def cmd_history(message: Message):
    """Oxirgi postlar tarixi."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    async with async_session() as session:
        result = await session.execute(
            select(ContentPost)
            .order_by(ContentPost.created_at.desc())
            .limit(10)
        )
        posts = result.scalars().all()

    if not posts:
        await message.answer("📜 Hali postlar yo'q.")
        return

    lines = ["📜 <b>Oxirgi 10 ta post:</b>\n"]
    for post in posts:
        status_emoji = {
            "pending": "⏳",
            "approved": "✅",
            "rejected": "❌",
            "published": "📤",
            "editing": "✏️",
        }.get(post.status, "❓")

        title = (post.title or "Sarlavhasiz")[:50]
        date = post.created_at.strftime("%d.%m %H:%M") if post.created_at else ""
        origin = "🤖" if post.origin == "auto" else "📎"
        lines.append(f"{status_emoji} {origin} #{post.id} {title} ({date})")

    await message.answer("\n".join(lines), parse_mode="HTML")


@router.message(Command("stats"))
async def cmd_stats(message: Message):
    """Statistika."""
    if message.from_user.id != Config.ADMIN_USER_ID:
        return

    from sqlalchemy import func

    async with async_session() as session:
        total = await session.execute(
            select(func.count(ContentPost.id))
        )
        total_count = total.scalar() or 0

        published = await session.execute(
            select(func.count(ContentPost.id)).where(
                ContentPost.status == "published"
            )
        )
        published_count = published.scalar() or 0

        auto = await session.execute(
            select(func.count(ContentPost.id)).where(
                ContentPost.origin == "auto"
            )
        )
        auto_count = auto.scalar() or 0

        manual = await session.execute(
            select(func.count(ContentPost.id)).where(
                ContentPost.origin == "manual"
            )
        )
        manual_count = manual.scalar() or 0

    await message.answer(
        f"📊 <b>Statistika:</b>\n\n"
        f"📝 Jami postlar: {total_count}\n"
        f"📤 Nashr qilingan: {published_count}\n"
        f"🤖 Avtomatik: {auto_count}\n"
        f"📎 Manual: {manual_count}",
        parse_mode="HTML",
    )
