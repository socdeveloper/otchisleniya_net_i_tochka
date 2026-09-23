import asyncio
import hmac
import json
from contextlib import asynccontextmanager
from datetime import datetime
from uuid import UUID

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.chat import ChatBase, SupportMessage, list_messages
from modules.files import object_storage
from platform_core.auth import authenticated_telegram_user
from platform_core.db import engine, session_factory
from platform_core.settings import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(ChatBase.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="University Work Platform API", version="0.2.0", lifespan=lifespan)


async def db_session():
    async with session_factory() as session:
        yield session


class MessageInput(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def serialize(message: SupportMessage, file_url: str | None = None) -> dict:
    return {
        "id": str(message.id),
        "senderRole": message.sender_role,
        "text": message.text,
        "fileName": message.file_name,
        "contentType": message.content_type,
        "sizeBytes": message.size_bytes,
        "fileUrl": file_url,
        "createdAt": message.created_at.isoformat(),
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/support/messages")
async def get_support_messages(
    user_id: int = Depends(authenticated_telegram_user),
    session: AsyncSession = Depends(db_session),
) -> list[dict]:
    messages = await list_messages(session, user_id)
    result = []
    for message in messages:
        url = None
        if message.file_key:
            url = await object_storage.download_url(key=message.file_key, user_id=user_id)
        result.append(serialize(message, url))
    return result


async def persist_message(
    *, session: AsyncSession, user_id: int, sender_id: int, sender_role: str,
    text: str | None = None, upload: UploadFile | None = None,
) -> SupportMessage:
    file_key = None
    file_name = None
    content_type = None
    size_bytes = None
    if upload:
        body = await upload.read(settings.support_upload_max_bytes + 1)
        if not body or len(body) > settings.support_upload_max_bytes:
            raise HTTPException(status_code=413, detail="File exceeds the 20 MB limit")
        file_name = (upload.filename or "attachment")[:255]
        content_type = upload.content_type or "application/octet-stream"
        if not is_allowed_content_type(content_type):
            raise HTTPException(status_code=415, detail="This file type is not supported")
        file_key = await object_storage.upload(
            user_id=user_id,
            filename=file_name,
            content_type=content_type,
            body=body,
        )
        size_bytes = len(body)
    if not (text and text.strip()) and not upload:
        raise HTTPException(status_code=422, detail="A message or attachment is required")
    message = SupportMessage(
        user_id=user_id,
        sender_id=sender_id,
        sender_role=sender_role,
        text=text.strip() if text and text.strip() else None,
        file_key=file_key,
        file_name=file_name,
        content_type=content_type,
        size_bytes=size_bytes,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message


def is_allowed_content_type(content_type: str) -> bool:
    return content_type in {
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv", "application/octet-stream",
    }


@app.post("/support/messages")
async def send_support_message(
    payload: MessageInput,
    user_id: int = Depends(authenticated_telegram_user),
    session: AsyncSession = Depends(db_session),
) -> dict:
    message = await persist_message(
        session=session,
        user_id=user_id,
        sender_id=user_id,
        sender_role="user",
        text=payload.text,
    )
    return serialize(message)


@app.post("/support/files")
async def send_support_file(
    file: UploadFile = File(...),
    caption: str | None = None,
    user_id: int = Depends(authenticated_telegram_user),
    session: AsyncSession = Depends(db_session),
) -> dict:
    message = await persist_message(
        session=session,
        user_id=user_id,
        sender_id=user_id,
        sender_role="user",
        text=caption,
        upload=file,
    )
    url = await object_storage.download_url(key=message.file_key, user_id=user_id)
    return serialize(message, url)


@app.post("/support/messages/{message_id}/file-url")
async def get_support_file_url(
    message_id: UUID,
    user_id: int = Depends(authenticated_telegram_user),
    session: AsyncSession = Depends(db_session),
) -> dict[str, str]:
    message = await session.scalar(
        select(SupportMessage).where(
            SupportMessage.id == message_id,
            SupportMessage.user_id == user_id,
            SupportMessage.file_key.is_not(None),
        )
    )
    if message is None or message.file_key is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"url": await object_storage.download_url(key=message.file_key, user_id=user_id)}


async def require_support_operator(authorization: str = Header(default="")) -> int:
    token = authorization.removeprefix("Bearer ")
    if not settings.support_operator_token or not hmac.compare_digest(token, settings.support_operator_token):
        raise HTTPException(status_code=401, detail="Support operator authentication required")
    return 0


@app.get("/support/operator/conversations")
async def get_support_conversations(
    _: int = Depends(require_support_operator),
    session: AsyncSession = Depends(db_session),
) -> list[dict]:
    statement = (
        select(SupportMessage)
        .distinct(SupportMessage.user_id)
        .order_by(SupportMessage.user_id, SupportMessage.created_at.desc())
    )
    latest = (await session.scalars(statement)).all()
    return [{"userId": message.user_id, "lastMessage": serialize(message)} for message in latest]


@app.get("/support/operator/conversations/{user_id}/messages")
async def get_operator_messages(
    user_id: int,
    _: int = Depends(require_support_operator),
    session: AsyncSession = Depends(db_session),
) -> list[dict]:
    messages = await list_messages(session, user_id)
    result = []
    for message in messages:
        url = None
        if message.file_key:
            url = await object_storage.download_url(key=message.file_key, user_id=user_id)
        result.append(serialize(message, url))
    return result


@app.post("/support/operator/conversations/{user_id}/messages")
async def operator_send_message(
    user_id: int,
    payload: MessageInput,
    operator_id: int = Depends(require_support_operator),
    session: AsyncSession = Depends(db_session),
) -> dict:
    message = await persist_message(
        session=session,
        user_id=user_id,
        sender_id=operator_id,
        sender_role="support",
        text=payload.text,
    )
    await publish_support_message(message)
    return serialize(message)


@app.post("/support/operator/conversations/{user_id}/files")
async def operator_send_file(
    user_id: int,
    file: UploadFile = File(...),
    caption: str | None = None,
    operator_id: int = Depends(require_support_operator),
    session: AsyncSession = Depends(db_session),
) -> dict:
    message = await persist_message(
        session=session,
        user_id=user_id,
        sender_id=operator_id,
        sender_role="support",
        text=caption,
        upload=file,
    )
    url = await object_storage.download_url(key=message.file_key, user_id=user_id)
    await publish_support_message(message)
    return serialize(message, url)


@app.websocket("/support/ws")
async def support_socket(websocket: WebSocket):
    init_data = websocket.query_params.get("initData", "")
    try:
        user_id = await authenticated_telegram_user(_WebSocketAuthRequest(init_data))
    except HTTPException:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    channel = f"support:user:{user_id}"
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel)
    tasks: set[asyncio.Task] = set()

    async def forward_events():
        async for event in pubsub.listen():
            if event["type"] == "message":
                await websocket.send_text(event["data"])

    async def detect_disconnect():
        while True:
            await websocket.receive_text()

    try:
        async with session_factory() as session:
            messages = await list_messages(session, user_id, limit=100)
            initial = []
            for message in messages:
                url = None
                if message.file_key:
                    url = await object_storage.download_url(key=message.file_key, user_id=user_id)
                initial.append(serialize(message, url))
        await websocket.send_json({"type": "history", "messages": initial})
        tasks = {asyncio.create_task(forward_events()), asyncio.create_task(detect_disconnect())}
        done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            if not task.cancelled() and task.exception():
                raise task.exception()
    except WebSocketDisconnect:
        pass
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await redis.aclose()


class _WebSocketAuthRequest:
    def __init__(self, init_data: str):
        self.headers = {"Authorization": f"tma {init_data}"}


async def publish_support_message(message: SupportMessage) -> None:
    """Publish helper used by operator workflows to notify connected clients."""
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        payload = serialize(message)
        if message.file_key:
            payload["fileUrl"] = await object_storage.download_url(
                key=message.file_key, user_id=message.user_id
            )
        await redis.publish(
            f"support:user:{message.user_id}",
            json.dumps(payload, default=lambda value: value.isoformat() if isinstance(value, datetime) else str(value)),
        )
    finally:
        await redis.aclose()
