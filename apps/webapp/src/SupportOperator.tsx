import { useEffect, useState } from 'react'

type Message = { id: string; senderRole: string; text: string | null; fileName: string | null; contentType: string | null; fileUrl: string | null; createdAt: string }
type Conversation = { userId: number; lastMessage: Message }

export function SupportOperator() {
  const [token, setToken] = useState(sessionStorage.getItem('support-operator-token') ?? '')
  const [draftToken, setDraftToken] = useState(token)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function request(path: string, init?: RequestInit) {
    return fetch(`/api/support/operator${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } })
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        const response = await request('/conversations')
        if (!response.ok) throw new Error('Не удалось загрузить обращения. Проверьте токен оператора.')
        const rows = await response.json() as Conversation[]
        if (!cancelled) {
          setConversations(rows)
          if (selected === null && rows.length) setSelected(rows[0].userId)
        }
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Ошибка соединения') }
    }
    void load()
    const timer = window.setInterval(load, 5000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [token, selected])

  useEffect(() => {
    if (!token || selected === null) return
    let cancelled = false
    const load = async () => {
      try {
        const response = await request(`/conversations/${selected}/messages`)
        if (!response.ok) return
        const rows = await response.json() as Message[]
        if (!cancelled) setMessages(rows)
      } catch { /* the next refresh will retry */ }
    }
    void load()
    const timer = window.setInterval(load, 2500)
    return () => { cancelled = true; clearInterval(timer) }
  }, [token, selected])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (selected === null || !draft.trim() || busy) return
    setBusy(true)
    try {
      const response = await request(`/conversations/${selected}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: draft.trim() }) })
      if (!response.ok) throw new Error('Не удалось отправить ответ')
      const message = await response.json() as Message
      setDraft('')
      setMessages((old) => [...old, message])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка отправки') }
    finally { setBusy(false) }
  }

  async function upload(file: File) {
    if (selected === null) return
    setBusy(true)
    const form = new FormData(); form.append('file', file)
    try {
      const response = await request(`/conversations/${selected}/files`, { method: 'POST', body: form })
      if (!response.ok) throw new Error('Не удалось отправить файл')
      const message = await response.json() as Message
      setMessages((old) => [...old, message])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка отправки') }
    finally { setBusy(false) }
  }

  if (!token) return <main className="operator-login"><div><div className="operator-mark">✦</div><h1>Поддержка</h1><p>Вход для команды сервиса</p><form onSubmit={(event) => { event.preventDefault(); sessionStorage.setItem('support-operator-token', draftToken); setToken(draftToken) }}><input type="password" value={draftToken} onChange={(event) => setDraftToken(event.target.value)} placeholder="Ключ доступа" autoComplete="current-password"/><button disabled={!draftToken}>Войти</button></form></div></main>

  return <main className="operator-app">
    <aside className="operator-sidebar"><header><span className="operator-mark small">✦</span><div><strong>Поддержка</strong><small>Панель команды</small></div><button aria-label="Выйти" onClick={() => { sessionStorage.removeItem('support-operator-token'); setToken('') }}>↪</button></header><p className="operator-caption">ОБРАЩЕНИЯ · {conversations.length}</p>{conversations.map((item) => <button key={item.userId} className={item.userId === selected ? 'operator-thread selected' : 'operator-thread'} onClick={() => { setSelected(item.userId); setError('') }}><span className="operator-user-avatar">{String(item.userId).slice(-2)}</span><span><strong>Пользователь {item.userId}</strong><small>{item.lastMessage.text || item.lastMessage.fileName || 'Вложение'}</small></span></button>)}</aside>
    <section className="operator-chat"><header><strong>{selected ? `Пользователь ${selected}` : 'Выберите обращение'}</strong><small>Чат поддержки</small></header><div className="operator-messages">{messages.map((message) => <article key={message.id} className={message.senderRole === 'support' ? 'operator-bubble reply' : 'operator-bubble'}>{message.fileUrl && message.contentType?.startsWith('image/') && <img src={message.fileUrl} alt={message.fileName || 'Фото'} />}{message.fileUrl && message.contentType?.startsWith('audio/') && <audio controls src={message.fileUrl} />}{message.fileUrl && !message.contentType?.startsWith('image/') && !message.contentType?.startsWith('audio/') && <a href={message.fileUrl} target="_blank" rel="noreferrer">▤ {message.fileName}</a>}{message.text && <p>{message.text}</p>}<time>{new Date(message.createdAt).toLocaleString('ru')}</time></article>)}</div>{error && <div className="operator-error">{error}</div>}{selected !== null && <form className="operator-composer" onSubmit={send}><label title="Прикрепить файл">＋<input type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} /></label><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ответ пользователю…"/><button disabled={busy || !draft.trim()}>Отправить</button></form>}</section>
  </main>
}
