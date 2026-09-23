import React, { useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { init, miniApp, themeParams, viewport } from '@tma.js/sdk-react'
import { AppRoot, Button, Cell, Section } from '@telegram-apps/telegram-ui'
import '@telegram-apps/telegram-ui/dist/styles.css'
import { HomeMenu } from './HomeMenu'
import { InstitutionType, uniqueInstitutions } from './data/institutions'
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

type Role = 'client' | 'performer'
type StudyLevel = 'Бакалавриат' | 'Специалитет' | 'Магистратура' | 'Среднее профессиональное'
type Step = 'welcome' | 'institution' | 'level' | 'course' | 'role' | 'home'

const steps: Step[] = ['welcome', 'institution', 'level', 'course', 'role']
const levels: { title: StudyLevel; subtitle: string; icon: string; institutionType: InstitutionType }[] = [
  { title: 'Бакалавриат', subtitle: 'Высшее образование', icon: '🎓', institutionType: 'Вуз' },
  { title: 'Специалитет', subtitle: 'Высшее образование', icon: '📘', institutionType: 'Вуз' },
  { title: 'Магистратура', subtitle: 'Высшее образование', icon: '📚', institutionType: 'Вуз' },
  { title: 'Среднее профессиональное', subtitle: 'Колледж или техникум', icon: '🏫', institutionType: 'Колледж / техникум' },
]

function App() {
  const telegram = window.Telegram?.WebApp
  const [step, setStep] = useState<Step>('welcome')
  const [institutionSearch, setInstitutionSearch] = useState('')
  const [institution, setInstitution] = useState('')
  const [institutionType, setInstitutionType] = useState<InstitutionType>('Вуз')
  const [studyLevel, setStudyLevel] = useState<StudyLevel | ''>('')
  const [course, setCourse] = useState<number | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [suggestion, setSuggestion] = useState(false)

  telegram?.expand()
  const visibleInstitutions = useMemo(() => {
    const query = institutionSearch.trim().toLocaleLowerCase('ru')
    return uniqueInstitutions.filter((item) => {
      const matchesType = item.type === institutionType
      const matchesQuery = !query || `${item.name} ${item.aliases?.join(' ') ?? ''}`.toLocaleLowerCase('ru').includes(query)
      return matchesType && matchesQuery
    })
  }, [institutionType, institutionSearch])

  const goBack = () => {
    const current = steps.indexOf(step)
    if (current > 0) setStep(steps[current - 1])
  }
  const haptic = () => telegram?.HapticFeedback?.selectionChanged()
  const selectInstitution = (name: string) => {
    haptic()
    setInstitution(name)
    setStep('level')
  }
  const selectLevel = (value: StudyLevel) => { haptic(); setStudyLevel(value); setStep('course') }
  const progressIndex = step === 'welcome' ? 0 : step === 'home' ? 4 : steps.indexOf(step)

  return (
    <AppRoot appearance={telegram?.colorScheme ?? 'light'}>
      <main className="screen">
        {step !== 'welcome' && step !== 'home' && (
          <header className="topbar">
            <button className="back-button" onClick={goBack} aria-label="Назад">‹</button>
            <div className="progress" aria-label={`Шаг ${Math.max(progressIndex, 1)} из 4`}>
              {[1, 2, 3, 4].map((n) => <span key={n} className={n <= progressIndex ? 'progress-dot active' : 'progress-dot'} />)}
            </div>
            <span className="step-count">{Math.max(progressIndex, 1)}/4</span>
          </header>
        )}

        {step === 'welcome' && (
          <>
            <div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><span className="art-cap">🎓</span><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span><span className="art-star">✳</span></div>
            <div className="welcome-copy">
              <div className="brand-pill"><span className="brand-dot" /> СТУДЕНЧЕСКИЙ СЕРВИС</div>
              <h1>Учёба —<br /><span>под контролем</span></h1>
              <p className="muted">Находите проверенных исполнителей или получайте заказы от студентов вашего вуза.</p>
            </div>
            <div className="welcome-bottom">
              <div className="trust-row"><span>🔒</span><span>Общение и оплата внутри сервиса</span></div>
              <Button size="l" stretched onClick={() => setStep('institution')}>Продолжить <span className="button-arrow">→</span></Button>
              <p className="terms">Продолжая, вы принимаете условия сервиса</p>
            </div>
          </>
        )}

        {step === 'institution' && (
          <>
            <div className="page-heading"><div className="heading-icon">🏛️</div><p className="eyebrow">ВАШЕ ОБУЧЕНИЕ</p><h1>Где вы учитесь?</h1><p className="muted">Выберите вуз или колледж Москвы</p></div>
            <label className="search-box"><span>⌕</span><input value={institutionSearch} onChange={(event) => setInstitutionSearch(event.target.value)} placeholder="Название или аббревиатура" autoComplete="off" /><kbd>⌘ K</kbd></label>
            {institution && <button className="selection-chip" onClick={() => setInstitution('')}>Выбрано: {institution} <span>×</span></button>}
            <div className="institution-switch" role="tablist" aria-label="Тип учебного заведения">
              {(['Вуз', 'Колледж / техникум'] as InstitutionType[]).map((type) => <button key={type} className={institutionType === type ? 'active' : ''} onClick={() => { setInstitutionType(type); setInstitutionSearch('') }}>{type === 'Вуз' ? 'Вузы' : 'Колледжи и техникумы'}</button>)}
            </div>
            <div className="institution-list">
              {visibleInstitutions.length ? (
                <Section header={`${institutionType === 'Вуз' ? 'ВУЗЫ МОСКВЫ' : 'КОЛЛЕДЖИ И ТЕХНИКУМЫ'} · ${visibleInstitutions.length}`}>
                  {visibleInstitutions.map((item) => <Cell key={item.name} after={<span className="row-chevron">›</span>} onClick={() => selectInstitution(item.name)}>{item.name}<span className="institution-type">{item.type === 'Вуз' ? 'Высшее образование' : 'Среднее профессиональное'}</span></Cell>)}
                </Section>
              ) : <div className="empty-state"><span>🔎</span><strong>Не нашли своё заведение?</strong><p>Предложите его — добавим в каталог</p></div>}
              <button className="suggest-link" onClick={() => setSuggestion(true)}>＋ Предложить своё заведение</button>
            </div>
            {suggestion && <div className="suggest-panel"><p>Напишите название вуза или колледжа</p><input autoFocus value={institutionSearch} onChange={(event) => setInstitutionSearch(event.target.value)} placeholder="Например, МГТУ имени Баумана" /><Button size="m" stretched onClick={() => { if (institutionSearch.trim()) { setInstitution(institutionSearch.trim()); setSuggestion(false); setStep('level') } }}>Продолжить с этим заведением</Button></div>}
          </>
        )}

        {step === 'level' && (
          <>
            <div className="page-heading compact"><div className="heading-icon">📖</div><p className="eyebrow">ВАШЕ ОБУЧЕНИЕ</p><h1>Уровень обучения</h1><p className="muted">Так мы подберём подходящие предложения</p></div>
            <div className="context-card"><span>🏛️</span><div><small>УЧЕБНОЕ ЗАВЕДЕНИЕ</small><strong>{institution || 'Москва'}</strong></div><button onClick={() => setStep('institution')}>Изменить</button></div>
            <div className="option-list">
              {levels.filter((item) => item.institutionType === (institutionType === 'Вуз' ? 'Вуз' : 'Колледж / техникум')).map((item) => <button className="option-row" key={item.title} onClick={() => selectLevel(item.title)}><span className="option-icon">{item.icon}</span><span className="option-text"><strong>{item.title}</strong><small>{item.subtitle}</small></span><span className="row-chevron">›</span></button>)}
            </div>
          </>
        )}

        {step === 'course' && (
          <>
            <div className="page-heading compact"><div className="heading-icon">🗓️</div><p className="eyebrow">ВАШЕ ОБУЧЕНИЕ</p><h1>На каком вы курсе?</h1><p className="muted">Укажите текущий курс обучения</p></div>
            <div className="context-card"><span>📘</span><div><small>{studyLevel?.toLocaleUpperCase('ru')}</small><strong>{institution || 'Ваше заведение'}</strong></div><button onClick={() => setStep('level')}>Изменить</button></div>
            <div className="course-grid">{Array.from({ length: studyLevel === 'Магистратура' ? 2 : studyLevel === 'Среднее профессиональное' ? 4 : 6 }, (_, index) => index + 1).map((item) => <button className={course === item ? 'course-card selected' : 'course-card'} key={item} onClick={() => { haptic(); setCourse(item) }}><strong>{item}</strong><span>{item === 1 ? 'курс' : item < 5 ? 'курса' : 'курсов'}</span>{course === item && <i>✓</i>}</button>)}</div>
            <div className="sticky-action"><Button size="l" stretched disabled={!course} onClick={() => setStep('role')}>Продолжить <span className="button-arrow">→</span></Button></div>
          </>
        )}

        {step === 'role' && (
          <>
            <div className="page-heading compact"><div className="heading-icon">✨</div><p className="eyebrow">ПОСЛЕДНИЙ ШАГ</p><h1>Как вы хотите<br />использовать сервис?</h1><p className="muted">Роль можно будет изменить в профиле</p></div>
            <div className="role-cards">
              <button className={role === 'client' ? 'role-card client selected' : 'role-card client'} onClick={() => { haptic(); setRole('client') }}><span className="role-emoji">📝</span><span className="role-arrow">↗</span><strong>Найти исполнителя</strong><p>Создать заказ и выбрать специалиста для учебной задачи</p><span className="role-foot">Я ищу помощь <b>→</b></span></button>
              <button className={role === 'performer' ? 'role-card performer selected' : 'role-card performer'} onClick={() => { haptic(); setRole('performer') }}><span className="role-emoji">💼</span><span className="role-arrow">↗</span><strong>Стать исполнителем</strong><p>Разместить услуги и получать заказы от студентов</p><span className="role-foot">Я предлагаю услуги <b>→</b></span></button>
            </div>
            <div className="profile-preview"><span className="preview-avatar">{role === 'performer' ? '💼' : '🎓'}</span><div><small>ВАШ ПРОФИЛЬ</small><strong>{institution || 'Ваше заведение'} · {course ?? '—'} курс</strong></div><span className="verified-badge">✓</span></div>
            <div className="sticky-action"><Button size="l" stretched disabled={!role} onClick={() => setStep('home')}>Открыть меню <span className="button-arrow">→</span></Button></div>
          </>
        )}

        {step === 'home' && institution && studyLevel && course && role && (
          <HomeMenu institution={institution} institutionType={institutionType} studyLevel={studyLevel} course={course} role={role} />
        )}
      </main>
    </AppRoot>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
