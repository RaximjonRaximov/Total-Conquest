import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import Config


class Base(DeclarativeBase):
    pass


class ContentPost(Base):
    """Topilgan yoki yuborilgan kontent."""

    __tablename__ = "content_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Kontent ma'lumotlari
    title = Column(String(500), nullable=True)
    body = Column(Text, nullable=False)
    original_text = Column(Text, nullable=True)
    source_url = Column(String(1000), nullable=True)
    source_name = Column(String(200), nullable=True)
    # Media
    image_path = Column(String(500), nullable=True)
    video_path = Column(String(500), nullable=True)
    image_url = Column(String(1000), nullable=True)
    video_url = Column(String(1000), nullable=True)
    # Status: pending, approved, rejected, published, edited
    status = Column(String(50), default="pending")
    # Qayerdan kelgan: auto (scheduler) yoki manual (foydalanuvchi)
    origin = Column(String(50), default="auto")
    # Qaysi platformalarga yuborilgan
    published_telegram = Column(Boolean, default=False)
    published_instagram = Column(Boolean, default=False)
    published_youtube = Column(Boolean, default=False)
    # Vaqtlar
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.datetime.utcnow)
    published_at = Column(DateTime, nullable=True)


class SystemSettings(Base):
    """Bot sozlamalari."""

    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(200), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class ScheduleLog(Base):
    """Scheduler loglari."""

    __tablename__ = "schedule_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scheduled_hour = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False)  # started, completed, failed
    content_found = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# Database engine
engine = create_async_engine(Config.DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Databaseni yaratish."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Sessiya olish."""
    async with async_session() as session:
        return session
