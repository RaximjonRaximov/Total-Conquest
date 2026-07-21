#!/usr/bin/env python3
"""Terminaldan ishga tushadigan video review generator.

Foydalanish:
    export OPENAI_API_KEY=sk-...
    python video_review_cli.py

Yoki .env faylini sozlang:
    cp .env.example .env
"""

import asyncio

from dotenv import load_dotenv

from services.video_review import VideoReviewGenerator

load_dotenv()


SUPPORTED_PLATFORMS = {
    "streaka": "Streaka Hub — qisqa video uchun feedback ($0.50–$5+)",
    "playbookux": "PlaybookUX — sayt/ilova testlari ($10–$90)",
    "usertesting": "UserTesting — UX fikrlar ($10–$60)",
    "medium": "Medium review maqolasi (uzoq muddatli daromad)",
    "youtube": "YouTube review skripti (monetizatsiya uchun)",
    "appen": "Appen/CrowdGen — video rater loyihalari ($500+ 2 haftada)",
}


def print_header():
    print("\n🎬 AI Video Review Generator")
    print("Platformalarga professional inglizcha review yozadi.\n")


def choose_platform() -> str:
    print("Qaysi platforma uchun review yozmoqchisiz?")
    for key, value in SUPPORTED_PLATFORMS.items():
        print(f"  {key:12} — {value}")
    while True:
        choice = input("\nPlatforma (streaka/playbookux/...): ").strip().lower()
        if choice in SUPPORTED_PLATFORMS:
            return choice
        print("❌ Noto'g'ri tanlov. Iltimos, yuqoridagi nomlardan birini yozing.")


def get_description() -> str:
    print("\nKo'rgan video haqida o'zbekcha qisqacha yozing:")
    print("(bitta qator yoki bir nechta qator. Tugatganingizda Enter-Enter bosing)")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if not line and lines:
            break
        lines.append(line)
    return "\n".join(lines).strip()


def get_questions() -> str | None:
    print("\nPlatform berilgan savollar bormi? (yo'q deb yozsangiz, o'tkazib yuboriladi)")
    print("(bitta qator yoki bir nechta qator. Tugatganingizda Enter-Enter bosing)")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if not line and lines:
            break
        lines.append(line)
    text = "\n".join(lines).strip()
    if text.lower() in ("yo'q", "yoq", "no", "none", "-", ""):
        return None
    return text


async def main():
    print_header()
    platform = choose_platform()
    description = get_description()
    questions = get_questions()

    print("\n⏳ Review tayyorlanmoqda...\n")
    generator = VideoReviewGenerator()
    result = await generator.generate_review(
        video_description=description,
        questions=questions,
        platform=platform,
    )

    print(f"✅ Platforma: {SUPPORTED_PLATFORMS[platform].split('—')[0].strip()}")
    print(f"📝 Sarlavha: {result.get('title', '')}")
    print(f"🔢 So'zlar soni: {result.get('word_count', 0)}")
    print("\n" + "=" * 60)
    print(result["review"])
    print("=" * 60)
    print("\n📋 Yuqoridagi matnni nusxa olib, platformaga joylang.")


if __name__ == "__main__":
    asyncio.run(main())
