import { useEffect, useRef, useState } from 'react'

type ChatMessage = {
  id: string
  senderRole: 'user' | 'support'
  text: string | null
  fileName: string | null
  contentType: string | null
  sizeBytes: number | null
  fileUrl: string | null
  createdAt: string
}

type Props = { initData: string; onClose: () => void }

const fileLimit = 20 * 1024 * 1024
const mimeAllowed = /^(image\/(png|jpeg|gif|webp)|application\/pdf|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation|spreadsheetml\.sheet))|text\/(plain|csv)|audio\/(webm|ogg|mpeg|mp4|wav))$/i

function apiHeaders(initData: string) {
  return { Authorization: `tma ${initData}` }
}

export function SupportChat({ initData, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    let socket: WebSocket | undefined
    let retry: number | undefined
    let closed = false
    const connect = () => {
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${scheme}//${location.host}/api/support/ws?initData=${encodeURIComponent(initData)}`)
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data) as { type?: string; messages?: ChatMessage[] } & ChatMessage
        if (data.type === 'history' && data.messages) setMessages(data.messages)
        else if (data.id) setMessages((old) => old.some((item) => item.id === data.id) ? old : [...old, data])
      }
      socket.onclose = () => { if (!closed) retry = window.setTimeout(connect, 1800) }
    }
    connect()
    return () => { closed = true; if (retry) clearTimeout(retry); socket?.close() }
  }, [initData])

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])

  async function sendText(event: React.FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST', headers: { ...apiHeaders(initData), 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error('Не удалось отправить сообщение')
      setDraft('')
      const message = await response.json() as ChatMessage
      setMessages((old) => old.some((item) => item.id === message.id) ? old : [...old, message])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка отправки') }
    finally { setBusy(false) }
  }

  async function uploadFile(file: File) {
    if (file.size > fileLimit) { setError('Размер файла не должен превышать 20 МБ'); return }
    if (!mimeAllowed.test(file.type)) { setError('Этот формат пока нельзя отправить'); return }
    setBusy(true); setError('')
    try {
      const data = new FormData(); data.append('file', file)
      const response = await fetch('/api/support/files', { method: 'POST', headers: apiHeaders(initData), body: data })
      if (!response.ok) throw new Error('Не удалось загрузить файл')
      const message = await response.json() as ChatMessage
      setMessages((old) => old.some((item) => item.id === message.id) ? old : [...old, message])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка загрузки') }
    finally { setBusy(false) }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Запись аудио не поддерживается в этом браузере'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder; chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        if (blob.size) await uploadFile(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }))
      }
      recorder.start(); setRecording(true); setError('')
    } catch { setError('Разрешите доступ к микрофону в настройках устройства') }
  }

  function stopRecording() { recorderRef.current?.stop(); setRecording(false) }

  return <section className="support-chat" aria-label="Чат поддержки">
    <header className="support-chat-header">
      <button className="chat-back" onClick={onClose} aria-label="Назад">‹</button>
      <div className="support-agent-avatar">✦</div>
      <div className="support-agent-copy"><strong>Поддержка</strong><small><i /> Обычно отвечаем быстро</small></div>
      <button className="chat-more" aria-label="Информация о чате">···</button>
    </header>
    <div className="chat-day-label"><span>ЧАТ С ПОДДЕРЖКОЙ</span></div>
    <div className="support-message-list" ref={listRef}>
      <div className="support-welcome"><span>✦</span><strong>Мы на связи</strong><p>Напишите вопрос — ответим здесь. Можно приложить фото, документ или голосовое.</p></div>
      {messages.map((message) => <article key={message.id} className={`chat-bubble ${message.senderRole === 'user' ? 'outgoing' : 'incoming'}`}>
        {message.fileUrl && message.contentType?.startsWith('image/') && <a href={message.fileUrl} target="_blank" rel="noreferrer"><img className="chat-image" src={message.fileUrl} alt={message.fileName ?? 'Изображение'} /></a>}
        {message.fileUrl && message.contentType?.startsWith('audio/') && <audio controls src={message.fileUrl} />}
        {message.fileUrl && !message.contentType?.startsWith('image/') && !message.contentType?.startsWith('audio/') && <a className="chat-file" href={message.fileUrl} target="_blank" rel="noreferrer"><span>▤</span><span><strong>{message.fileName}</strong><small>{message.sizeBytes ? `${(message.sizeBytes / 1024 / 1024).toFixed(1)} МБ` : 'Документ'}</small></span><b>↓</b></a>}
        {message.text && <p>{message.text}</p>}
        <time>{new Date(message.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}{message.senderRole === 'user' && <span className="chat-check"> ✓</span>}</time>
      </article>)}
    </div>
    {error && <div className="chat-error" role="alert">{error}</div>}
    <form className="chat-composer" onSubmit={sendText}>
      <button type="button" className="chat-attach" aria-label="Прикрепить файл" onClick={() => inputRef.current?.click()} disabled={busy}>＋</button>
      <input ref={inputRef} hidden type="file" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); event.currentTarget.value = '' }} />
      <input className="chat-text-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Сообщение" aria-label="Сообщение" />
      {draft.trim() ? <button type="submit" className="chat-send" disabled={busy} aria-label="Отправить">➤</button> : <button type="button" className={recording ? 'chat-mic recording' : 'chat-mic'} aria-label={recording ? 'Остановить запись' : 'Записать голосовое'} onClick={() => recording ? stopRecording() : void startRecording()} disabled={busy}>{recording ? '■' : '🎙'}</button>}
    </form>
    {recording && <div className="recording-hint"><span /> Идёт запись · нажмите ■ для отправки</div>}
  </section>
}
