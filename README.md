# Платформа учебных работ — MVP

Стартовый каркас Telegram Mini App и бота для московских вузов.

## Запуск

1. Скопируйте `.env.example` в `.env` и укажите `TELEGRAM_BOT_TOKEN`.
2. Запустите `docker compose up --build` для PostgreSQL, Redis, API, бота и worker.
3. В отдельном терминале запустите WebApp: `cd apps/webapp && npm install && npm run dev`.
4. Откройте `http://localhost:8000/health` для проверки API.

Для быстрого тестирования Mini App в Telegram выполните `./scripts/telegram-preview.sh`. Скрипт пересоберёт приложения, откроет временный HTTPS-туннель, обновит URL для бота и покажет ссылку. Откройте бота и отправьте `/start`; процесс туннеля должен оставаться запущенным.

Quick Tunnel предназначен только для разработки: ссылка временная, перестаёт работать после остановки процесса и может измениться при следующем запуске. Для постоянного запуска используйте стабильный HTTPS-домен и VPS/контейнерный хостинг для API, бота, worker и PostgreSQL/Redis.

## Документы

- [Контекст проекта](CONTEXT.md)
- [ADR: модульный монолит](docs/adr/0001-modular-monolith.md)
- [Московский каталог учебных заведений: данные и источники](docs/catalogs/moscow-institutions.md)

## Состав каркаса

- `apps/api` — HTTP API на FastAPI.
- `apps/bot` — Telegram-бот на aiogram; `/start` открывает Mini App.
- `apps/worker` — отдельный процесс для фоновых задач.
- `apps/webapp` — React Mini App с Telegram SDK и Telegram UI Kit.
- `packages/backend/platform_core` — конфигурация, подключение к PostgreSQL/Redis и проверка Telegram `initData`.
- `packages/backend/modules` — доменные модули для каталога, профилей, заказов, чата, платежей, файлов и модерации.

Это каркас: бизнес-сценарии, платёжный провайдер, миграции БД, файловые команды и административный интерфейс предстоит реализовать отдельными этапами.
