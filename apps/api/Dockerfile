FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY packages/backend ./packages/backend
COPY apps/api ./apps/api
RUN pip install --no-cache-dir .
ENV PYTHONPATH=/app/apps/api:/app/packages/backend
EXPOSE 8000
