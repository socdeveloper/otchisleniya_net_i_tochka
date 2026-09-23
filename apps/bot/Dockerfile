FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY packages/backend ./packages/backend
COPY apps/bot ./apps/bot
RUN pip install --no-cache-dir .
ENV PYTHONPATH=/app/apps/bot:/app/packages/backend
