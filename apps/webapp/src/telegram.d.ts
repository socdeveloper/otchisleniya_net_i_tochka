interface TelegramWebApp {
  colorScheme: 'light' | 'dark'
  ready(): void
  expand(): void
  initData: string
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp }
}
