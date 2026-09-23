"""Provider-neutral private object storage using the S3 API."""

import re
from uuid import uuid4

from aiobotocore.session import get_session
from botocore.config import Config

from platform_core.settings import settings

_SAFE_NAME = re.compile(r"[^\w.()-]+", re.UNICODE)


class ObjectStorage:
    async def upload(self, *, user_id: int, filename: str, content_type: str, body: bytes) -> str:
        safe_name = _SAFE_NAME.sub("_", filename).strip("._")[:120] or "attachment"
        key = f"support/{user_id}/{uuid4().hex}/{safe_name}"
        session = get_session()
        async with session.create_client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            config=Config(s3={"addressing_style": "path"}),
        ) as client:
            await client.put_object(
                Bucket=settings.s3_bucket,
                Key=key,
                Body=body,
                ContentType=content_type,
                Metadata={"owner-id": str(user_id)},
            )
        return key

    async def download_url(self, *, key: str, user_id: int, expires_seconds: int = 900) -> str:
        if not key.startswith(f"support/{user_id}/"):
            raise PermissionError("This file does not belong to the authenticated user")
        session = get_session()
        async with session.create_client(
            "s3",
            endpoint_url=settings.s3_browser_endpoint_url or settings.s3_endpoint_url,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            config=Config(s3={"addressing_style": "path"}),
        ) as client:
            return await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.s3_bucket, "Key": key},
                ExpiresIn=expires_seconds,
            )


object_storage = ObjectStorage()
