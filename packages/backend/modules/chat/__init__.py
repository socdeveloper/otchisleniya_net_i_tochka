"""In-platform support chat persistence."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class ChatBase(DeclarativeBase):
    pass


class SupportMessage(ChatBase):
    __tablename__ = "support_messages"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[int] = mapped_column(BigInteger, index=True)
    sender_id: Mapped[int] = mapped_column(BigInteger)
    sender_role: Mapped[str] = mapped_column(String(16))
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(160), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


async def list_messages(session: AsyncSession, user_id: int, limit: int = 100) -> list[SupportMessage]:
    result = await session.scalars(
        select(SupportMessage)
        .where(SupportMessage.user_id == user_id)
        .order_by(SupportMessage.created_at.desc())
        .limit(limit)
    )
    return list(reversed(result.all()))
