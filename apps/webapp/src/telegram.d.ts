interface TelegramWebApp {
  colorScheme: 'light' | 'dark'
  ready(): void
  expand(): void
  initData: string
  HapticFeedback?: { selectionChanged(): void }
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp }
}
