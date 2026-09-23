from datetime import UTC, datetime, timedelta

from aiogram.utils.web_app import safe_parse_webapp_init_data
from fastapi import HTTPException, Request

from platform_core.settings import settings


async def authenticated_telegram_user(request: Request) -> int:
    """Validate Telegram Mini App initData and return the signed Telegram user ID."""
    init_data = request.headers.get("Authorization", "").removeprefix("tma ")
    if not init_data or not settings.telegram_bot_token:
        raise HTTPException(status_code=401, detail="Telegram authentication required")
    try:
        data = safe_parse_webapp_init_data(settings.telegram_bot_token, init_data)
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid Telegram initData") from exc
    age = datetime.now(UTC) - data.auth_date
    if age > timedelta(seconds=settings.webapp_auth_max_age_seconds) or age < timedelta(seconds=-60):
        raise HTTPException(status_code=401, detail="Expired Telegram initData")
    if data.user is None:
        raise HTTPException(status_code=401, detail="Telegram user is missing")
    return data.user.id
