import { useState } from 'react'
import { Button } from '@telegram-apps/telegram-ui'
import type { InstitutionType } from './data/institutions'

type Role = 'client' | 'performer'
type Action = 'order' | 'profile' | null

interface HomeMenuProps {
  institution: string
  institutionType: InstitutionType
  studyLevel: string
  course: number
  role: Role
}

const guideSteps = [
  'Выберите нужный раздел главного меню.',
  'Опишите задачу или заполните профиль исполнителя.',
  'Согласуйте условия и общайтесь внутри сервиса.',
  'После завершения подтвердите результат. Если возникнет проблема — обратитесь в поддержку.',
]

export function HomeMenu({ institution, institutionType, studyLevel, course, role }: HomeMenuProps) {
  const [action, setAction] = useState<Action>(null)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  return (
    <div className="home-menu">
      <header className="home-header">
        <div>
          <p className="home-kicker">ЛИЧНЫЙ КАБИНЕТ</p>
          <h1>Привет! <span>👋</span></h1>
          <p className="home-subtitle">Всё для учёбы — в одном месте</p>
        </div>
        <div className="home-avatar" aria-hidden="true">{role === 'performer' ? '💼' : '🎓'}</div>
      </header>

      <div className="home-studyline">
        <span className="studyline-icon">{institutionType === 'Вуз' ? '🏛' : '🏫'}</span>
        <span className="studyline-name">{institution}</span>
        <span className="studyline-dot">·</span>
        <span>{course} курс</span>
      </div>

      <section className="home-actions" aria-label="Основные действия">
        <p className="home-section-label">БЫСТРЫЙ ДОСТУП</p>
        <Button size="l" stretched onClick={() => { setAction('order'); setSupportOpen(false) }}>
          <span className="button-icon">＋</span> Заказать работу
        </Button>
        <button className="menu-row profile-row" onClick={() => { setAction('profile'); setSupportOpen(false) }}>
          <span className="menu-row-icon profile-icon">◉</span>
          <span className="menu-row-copy">
            <strong>{role === 'performer' ? 'Профиль исполнителя' : 'Стать исполнителем'}</strong>
            <small>{role === 'performer' ? 'Услуги, цены и отзывы' : 'Принимайте заказы и развивайте профиль'}</small>
          </span>
          <span className="menu-chevron">›</span>
        </button>
      </section>

      {action && (
        <section className="action-preview" aria-live="polite">
          <div className="action-preview-top">
            <strong>{action === 'order' ? 'Новый заказ' : 'Профиль исполнителя'}</strong>
            <button onClick={() => setAction(null)} aria-label="Закрыть">×</button>
          </div>
          <p>{action === 'order'
            ? 'Здесь можно будет описать задачу, выбрать категорию и сроки.'
            : 'Здесь можно будет добавить направления работы и цены «от».'}</p>
          <span className="coming-label">РАЗДЕЛ ГОТОВИТСЯ</span>
        </section>
      )}

      <section className="home-secondary">
        <button className="menu-row disclosure-row" aria-expanded={servicesOpen} onClick={() => setServicesOpen((open) => !open)}>
          <span className="menu-row-icon services-icon">✦</span>
          <span className="menu-row-copy"><strong>Учебные сервисы</strong><small>Дополнительные инструменты проекта</small></span>
          <span className={servicesOpen ? 'menu-chevron rotated' : 'menu-chevron'}>⌄</span>
        </button>
        {servicesOpen && (
          <div className="disclosure-content services-content">
            <div className="service-line"><span>Проверка и оформление текста</span><span className="soon-badge">Скоро</span></div>
            <div className="service-line"><span>Подготовка к защите</span><span className="soon-badge">Скоро</span></div>
            <p>Новые инструменты появятся здесь по мере запуска.</p>
          </div>
        )}

        <div className="menu-divider" />

        <button className="menu-row disclosure-row guide-row" aria-expanded={guideOpen} onClick={() => setGuideOpen((open) => !open)}>
          <span className="menu-row-icon guide-icon">?</span>
          <span className="menu-row-copy"><strong>Путеводитель</strong><small>Как пользоваться сервисом</small></span>
          <span className={guideOpen ? 'menu-chevron rotated' : 'menu-chevron'}>⌄</span>
        </button>
        {guideOpen && (
          <ol className="disclosure-content guide-content">
            {guideSteps.map((text, index) => <li key={text}><span>{index + 1}</span><p>{text}</p></li>)}
          </ol>
        )}
      </section>

      <button className="support-link" onClick={() => { setSupportOpen((open) => !open); setAction(null) }}>
        <span className="support-icon">◌</span>
        <span>Что-то непонятно? <strong>Обратитесь в поддержку</strong></span>
        <span className="menu-chevron">›</span>
      </button>
      {supportOpen && (
        <div className="support-panel" aria-live="polite">
          <strong>Мы поможем разобраться</strong>
          <p>Поддержка поможет с заказом, оплатой или работой сервиса. Связь с командой появится в следующем обновлении.</p>
          <button onClick={() => setSupportOpen(false)}>Понятно</button>
        </div>
      )}

      <footer className="home-footer">{studyLevel} · {course} курс</footer>
    </div>
  )
}
