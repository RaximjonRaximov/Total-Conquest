import datetime
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import CONTENT_TYPE_NEWS, Config

logger = logging.getLogger(__name__)


class ContentScheduler:
    """Belgilangan vaqtlarda kontent qidirish scheduleri.

    Har bir soatda turli kontent turi qidiriladi:
    - 10:00 = AI yangiliklar (modellar, texnologiyalar)
    - 13:00 = AI prompt + rasm
    - 18:00 = AI yaratgan kontent (video/rasm + prompt)
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._search_callback = None
        self._is_searching = False
        self._last_approved_times: dict[str, datetime.datetime] = {}

    def set_search_callback(self, callback):
        """Qidiruv funksiyasini belgilash.

        Callback signature: async def callback(content_type: str)
        """
        self._search_callback = callback

    def start(self):
        """Schedulerni ishga tushirish."""
        for hour in Config.SCHEDULE_HOURS:
            content_type = Config.SCHEDULE_CONTENT_MAP.get(
                hour, CONTENT_TYPE_NEWS
            )
            self.scheduler.add_job(
                self._trigger_search,
                CronTrigger(hour=hour, minute=0),
                id=f"search_{hour}",
                args=[hour, content_type],
                replace_existing=True,
            )
            logger.info(
                f"Jadval qo'shildi: soat {hour}:00 -> {content_type}"
            )

        self.scheduler.start()
        logger.info("Scheduler ishga tushdi")

    def stop(self):
        """Schedulerni to'xtatish."""
        if self.scheduler.running:
            self.scheduler.shutdown()

    async def _trigger_search(self, hour: int, content_type: str):
        """Belgilangan vaqtda qidiruv boshlash."""
        if self._is_searching:
            logger.info("Qidiruv allaqachon davom etmoqda, o'tkazib yuborildi")
            return

        last_approved = self._last_approved_times.get(content_type)
        if last_approved:
            today = datetime.datetime.utcnow().date()
            if last_approved.date() == today:
                logger.info(
                    f"{content_type} bugun allaqachon tasdiqlangan, o'tkaziladi"
                )
                return

        self._is_searching = True
        logger.info(
            f"Avtomatik qidiruv boshlandi: soat {hour}:00, tur: {content_type}"
        )

        try:
            if self._search_callback:
                await self._search_callback(content_type)
        except Exception as e:
            logger.error(f"Qidiruv xatosi: {e}")
        finally:
            self._is_searching = False

    def mark_approved(self, content_type: str = CONTENT_TYPE_NEWS):
        """Tasdiqlangandan keyin shu kontent turi uchun bugungi qidiruvni to'xtatish."""
        self._last_approved_times[content_type] = datetime.datetime.utcnow()
        self._is_searching = False
        logger.info(
            f"{content_type} tasdiqlandi, bugun uchun to'xtatildi"
        )

    def mark_rejected(self):
        """Rad etilganda qayta qidirish imkoniyati."""
        self._is_searching = False
        logger.info("Kontent rad etildi, qayta qidirish mumkin")

    def update_schedule(self, hours: list[int]):
        """Jadval vaqtlarini yangilash."""
        for job in self.scheduler.get_jobs():
            if job.id.startswith("search_"):
                self.scheduler.remove_job(job.id)

        for hour in hours:
            content_type = Config.SCHEDULE_CONTENT_MAP.get(
                hour, CONTENT_TYPE_NEWS
            )
            self.scheduler.add_job(
                self._trigger_search,
                CronTrigger(hour=hour, minute=0),
                id=f"search_{hour}",
                args=[hour, content_type],
                replace_existing=True,
            )
        logger.info(f"Jadval yangilandi: {hours}")

    def get_schedule_info(self) -> str:
        """Joriy jadval ma'lumotlari."""
        lines = []
        for hour in sorted(Config.SCHEDULE_HOURS):
            content_type = Config.SCHEDULE_CONTENT_MAP.get(
                hour, CONTENT_TYPE_NEWS
            )
            type_label = {
                "ai_news": "📰 AI Yangiliklar",
                "ai_prompt": "🎨 AI Prompt + Rasm",
                "ai_generated": "🎬 AI Yaratgan Kontent",
            }.get(content_type, content_type)
            lines.append(f"  {hour}:00 → {type_label}")

        schedule_text = "\n".join(lines)
        status = "🔍 qidirmoqda" if self._is_searching else "⏳ kutmoqda"
        return f"📅 Jadval:\n{schedule_text}\n\nHolat: {status}"
