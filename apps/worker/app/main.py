import asyncio
import logging

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    logging.info("Worker is ready; background job handlers will be registered here.")
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
