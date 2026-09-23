from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/app"
    redis_url: str = "redis://localhost:6379/0"
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""
    telegram_files_chat_id: int | None = None
    telegram_webapp_url: str = "http://localhost:5173"
    webapp_auth_max_age_seconds: int = 300
    s3_endpoint_url: str = "http://minio:9000"
    s3_region: str = "us-east-1"
    s3_bucket: str = "support-files"
    s3_access_key_id: str = "minioadmin"
    s3_secret_access_key: str = "minioadmin"
    s3_public_base_url: str = ""
    s3_browser_endpoint_url: str = ""
    support_upload_max_bytes: int = 20 * 1024 * 1024
    support_operator_token: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)


settings = Settings()
