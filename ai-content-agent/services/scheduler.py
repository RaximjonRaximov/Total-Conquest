import datetime
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import Config

logger = logging.getLogger(__name__)


class ContentScheduler:
    """Belgilangan vaqtlarda kontent qidirish scheduleri."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._search_callback = None
        self._is_searching = False
        self._last_approved_time: datetime.datetime | None = None

    def set_search_callback(self, callback):
        """Qidiruv funksiyasini belgilash."""
        self._search_callback = callback

    def start(self):
        """Schedulerni ishga tushirish."""
        for hour in Config.SCHEDULE_HOURS:
            self.scheduler.add_job(
                self._trigger_search,
                CronTrigger(hour=hour, minute=0),
                id=f"search_{hour}",
                replace_existing=True,
            )
            logger.info(f"Jadval qo'shildi: har kuni soat {hour}:00")

        self.scheduler.start()
        logger.info("Scheduler ishga tushdi")

    def stop(self):
        """Schedulerni to'xtatish."""
        if self.scheduler.running:
            self.scheduler.shutdown()

    async def _trigger_search(self):
        """Belgilangan vaqtda qidiruv boshlash."""
        if self._is_searching:
            logger.info("Qidiruv allaqachon davom etmoqda, o'tkazib yuborildi")
            return

        now = datetime.datetime.utcnow()
        if self._last_approved_time:
            next_scheduled = self._get_next_scheduled_time(
                self._last_approved_time
            )
            if now < next_scheduled:
                logger.info(
                    f"Keyingi jadval vaqti: {next_scheduled}, hozir o'tkaziladi"
                )
                return

        self._is_searching = True
        logger.info("Avtomatik kontent qidirish boshlandi")

        try:
            if self._search_callback:
                await self._search_callback()
        except Exception as e:
            logger.error(f"Qidiruv xatosi: {e}")
        finally:
            self._is_searching = False

    def _get_next_scheduled_time(
        self, after: datetime.datetime
    ) -> datetime.datetime:
        """Keyingi jadval vaqtini hisoblash."""
        today = after.date()
        for hour in sorted(Config.SCHEDULE_HOURS):
            scheduled = datetime.datetime.combine(
                today, datetime.time(hour=hour)
            )
            if scheduled > after:
                return scheduled

        tomorrow = today + datetime.timedelta(days=1)
        first_hour = min(Config.SCHEDULE_HOURS)
        return datetime.datetime.combine(
            tomorrow, datetime.time(hour=first_hour)
        )

    def mark_approved(self):
        """Tasdiqlangandan keyin keyingi jadvalgacha qidirmaslik."""
        self._last_approved_time = datetime.datetime.utcnow()
        self._is_searching = False
        logger.info("Kontent tasdiqlandi, keyingi jadvalgacha kutiladi")

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
            self.scheduler.add_job(
                self._trigger_search,
                CronTrigger(hour=hour, minute=0),
                id=f"search_{hour}",
                replace_existing=True,
            )
        logger.info(f"Jadval yangilandi: {hours}")

    def get_schedule_info(self) -> str:
        """Joriy jadval ma'lumotlari."""
        hours = sorted(Config.SCHEDULE_HOURS)
        schedule_text = ", ".join(f"{h}:00" for h in hours)
        status = "qidirmoqda" if self._is_searching else "kutmoqda"
        return f"Jadval: {schedule_text}\nHolat: {status}"
