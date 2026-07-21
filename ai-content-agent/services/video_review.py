import json
import logging

from openai import AsyncOpenAI

from config import Config

logger = logging.getLogger(__name__)


class VideoReviewGenerator:
    """Video kontent uchun professional review yozuvchi."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = Config.OPENAI_MODEL

    async def generate_review(
        self,
        video_description: str,
        questions: str | None = None,
        platform: str = "streaka",
        tone: str = "honest and helpful",
    ) -> dict:
        """Video haqida structured review yaratish.

        Args:
            video_description: Foydalanuvchi ko'rgan video haqida qisqacha matn.
            questions: Platform berilgan savollar (Streaka, PlaybookUX, Appen va h.k.).
            platform: Qaysi platforma uchun review — streaka, playbookux, medium, youtube.
            tone: Review uslubi: professional, casual, honest, detailed.

        Returns:
            {"review": "tayyor matn", "platform": "streaka", "word_count": int}
        """
        platform_guidelines = {
            "streaka": """This review is for Streaka Hub / content feedback platforms.
Rules:
- Be concise, honest, and specific.
- Answer each question directly.
- Mention one thing that worked and one thing that could improve.
- Keep total length 80-200 words unless questions require more.
- Do not sound like AI; write like a real viewer sharing an opinion.""",
            "playbookux": """This review is for PlaybookUX / user testing platforms.
Rules:
- Speak while thinking — explain what confused you or delighted you.
- Be specific about UX, navigation, layout, or content.
- Use first-person: "I noticed...", "I expected...", "It would be better if...".
- Suggest at least one concrete improvement.
- Length: 100-250 words depending on task time.""",
            "medium": """This is a Medium blog review / long-form article.
Rules:
- Write an engaging title.
- Include 3-5 sections: summary, what I liked, what could improve, final verdict.
- Add a rating (e.g., 8/10) at the end.
- Length: 400-800 words.
- Tone should be human, thoughtful, and shareable.""",
            "youtube": """This is a YouTube video script / review.
Rules:
- Start with a hook.
- Include summary, pros, cons, and a final recommendation.
- Use short punchy sentences for voiceover.
- Add a CTA: "Subscribe for more reviews".
- Length: 200-400 words, split into spoken paragraphs.""",
        }

        guideline = platform_guidelines.get(platform, platform_guidelines["streaka"])

        system_prompt = (
            "You are a professional content reviewer who helps people write "
            "high-quality, honest English reviews for video feedback platforms "
            "(Streaka Hub, PlaybookUX, UserTesting, Appen), blogs, or YouTube. "
            "Your English sounds like a real person, not a marketing robot. "
            "Never invent facts beyond what the user describes."
        )

        user_prompt = f"""{guideline}

Video / content the user watched:
{video_description}

"""
        if questions:
            user_prompt += f"""Platform's review questions / instructions:
{questions}

"""

        user_prompt += """Generate the review in English.
Return only a JSON object in this exact format:
{"review": "the full review text", "title": "short title or headline"}

Do not include markdown code fences."""

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
            review_text = result.get("review", "")
            return {
                "review": review_text,
                "title": result.get("title", ""),
                "platform": platform,
                "word_count": len(review_text.split()),
            }
        except Exception as e:
            logger.error(f"Video review generation error: {e}")
            fallback = (
                "I watched the video. It was engaging overall, but I noticed "
                "some areas that could be improved for clarity. The content "
                "kept my attention, and the message was mostly clear. "
                "However, a few moments felt repetitive or slow. With some "
                "tighter editing, this could be much stronger."
            )
            return {
                "review": fallback,
                "title": "Video Review",
                "platform": platform,
                "word_count": len(fallback.split()),
            }

    async def generate_summary_for_notes(
        self,
        notes: str,
        max_words: int = 80,
    ) -> str:
        """Qisqa shaxsiy eslatmalardan professional review qilish."""
        prompt = f"""Turn the user's rough notes about a video into a polished, honest English review for a feedback platform.

Notes:
{notes}

Rules:
- {max_words} words or less
- First-person, human tone
- One clear positive and one clear suggestion
- No invented details
- No code fences or JSON"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a concise video reviewer writing honest "
                            "feedback for content platforms."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return notes[:500]
