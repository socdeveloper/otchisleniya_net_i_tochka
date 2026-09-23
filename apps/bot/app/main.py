import asyncio
import os

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

dispatcher = Dispatcher()


@dispatcher.message(CommandStart())
async def start(message: Message) -> None:
    webapp_url = os.environ["TELEGRAM_WEBAPP_URL"]
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Открыть приложение", web_app=WebAppInfo(url=webapp_url))]
        ]
    )
    await message.answer("Откройте приложение, чтобы найти исполнителя или оформить заказ.", reply_markup=keyboard)


async def main() -> None:
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    bot = Bot(token=token)
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
