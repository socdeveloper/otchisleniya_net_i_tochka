interface TelegramWebApp {
  colorScheme: 'light' | 'dark'
  ready(): void
  expand(): void
  initData: string
  openTelegramLink?(url: string): void
  HapticFeedback?: { selectionChanged(): void }
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp }
}
