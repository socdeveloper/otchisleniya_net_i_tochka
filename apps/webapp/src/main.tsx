import React from 'react'
import ReactDOM from 'react-dom/client'
import { init, miniApp, themeParams, viewport } from '@tma.js/sdk-react'
import { AppRoot, Button, Cell, Section } from '@telegram-apps/telegram-ui'
import '@telegram-apps/telegram-ui/dist/styles.css'
import './style.css'

if (window.Telegram?.WebApp) {
  void (async () => {
    init()
    await Promise.all([miniApp.mount(), themeParams.mount(), viewport.mount()])
    miniApp.bindCssVars()
    themeParams.bindCssVars()
    viewport.bindCssVars()
    miniApp.ready()
  })()
}

function App() {
  const telegram = window.Telegram?.WebApp
  telegram?.expand()

  return (
    <AppRoot appearance={telegram?.colorScheme ?? 'light'}>
      <main className="screen">
        <header className="hero">
          <p className="eyebrow">Учебные работы</p>
          <h1>Найдите своего исполнителя</h1>
          <p className="muted">Специалисты из вузов Москвы. Условия и оплата — внутри сервиса.</p>
        </header>
        <Section header="Популярные категории">
          <Cell subtitle="Подготовка и оформление">Реферат и эссе</Cell>
          <Cell subtitle="Расчёты и пояснительная записка">Курсовая работа</Cell>
          <Cell subtitle="Слайды и материалы">Презентация</Cell>
        </Section>
        <Button size="l" stretched onClick={() => alert('Каталог исполнителей появится на следующем этапе.')}>Смотреть исполнителей</Button>
      </main>
    </AppRoot>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
