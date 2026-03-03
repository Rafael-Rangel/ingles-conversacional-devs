import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Lesson } from '@/types/database'
import type { Message } from '@/types/database'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)

export function Conversation() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [autoPlayVoice, setAutoPlayVoice] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<InstanceType<NonNullable<typeof SpeechRecognitionAPI>> | null>(null)
  const transcriptRef = useRef<string>('')
  const userStoppedRef = useRef(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  messagesRef.current = messages
  const onTeacherMessageRef = useRef<(content: string) => void>(() => {})
  onTeacherMessageRef.current = (content: string) => {
    if (autoPlayVoice) speak(content)
  }

  useEffect(() => {
    if (!lessonId) return
    supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()
      .then(({ data }) => setLesson(data ?? null))
  }, [lessonId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
  }, [])

  useEffect(() => {
    if (!SpeechRecognitionAPI) return
    const rec = new SpeechRecognitionAPI()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'pt-BR'
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
      }
      if (final) transcriptRef.current = (transcriptRef.current + ' ' + final).trim()
    }
    rec.onend = () => {
      setIsListening(false)
      const text = transcriptRef.current.trim()
      transcriptRef.current = ''
      if (userStoppedRef.current && text) setInput((prev) => (prev ? `${prev} ${text}` : text))
      userStoppedRef.current = false
    }
    rec.onerror = () => {
      setIsListening(false)
      transcriptRef.current = ''
      userStoppedRef.current = false
    }
    recognitionRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
  }, [])

  function toggleVoiceInput() {
    if (!SpeechRecognitionAPI || !conversationId) return
    if (isListening) {
      userStoppedRef.current = true
      recognitionRef.current?.stop()
      return
    }
    transcriptRef.current = ''
    userStoppedRef.current = false
    setIsListening(true)
    recognitionRef.current?.start()
  }

  async function startConversation() {
    if (!lessonId) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        lesson_id: lessonId,
        message_count: 0,
        completed: false,
      })
      .select('id')
      .single()
    if (convErr) {
      console.error(convErr)
      return
    }
    setConversationId(conv.id)
    if (lesson) await fetchTeacherReply(conv.id, [])
  }

  async function fetchTeacherReply(convId: string, currentMessages: Message[]) {
    if (!lesson) return
    setLoading(true)
    try {
      const body = {
        lesson: {
          title: lesson.title,
          context: lesson.context,
          learning_goals: lesson.learning_goals ?? [],
          grammar_focus: lesson.grammar_focus ?? null,
          vocabulary_tags: lesson.vocabulary_tags ?? null,
        },
        messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
      }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`)
      if (data?.error) {
        const details = data.details ? `: ${data.details}` : ''
        throw new Error(`${data.error}${details}`)
      }
      const teacherContent = data?.content ?? "Let's start. What would you like to say?"
      const { data: inserted } = await supabase
        .from('messages')
        .insert({ conversation_id: convId, role: 'teacher', content: teacherContent })
        .select('id, conversation_id, role, content, correction_data, created_at')
        .single()
      if (inserted) {
        setMessages((prev) => [...prev, inserted as Message])
        onTeacherMessageRef.current(teacherContent)
      }
      const newCount = currentMessages.length + 1
      await supabase
        .from('conversations')
        .update({ message_count: newCount, ended_at: new Date().toISOString() })
        .eq('id', convId)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Sorry, I had a connection issue. Try again.'
      console.error('Tutor error:', e)
      setMessages((prev) => [
        ...prev,
        {
          id: 'err',
          conversation_id: convId,
          role: 'teacher',
          content: msg,
          correction_data: null,
          created_at: new Date().toISOString(),
        } as Message,
      ]);
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || !conversationId || !lessonId) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'student', content: text })
      .select('id, conversation_id, role, content, correction_data, created_at')
      .single()
    if (!msg) return
    setMessages((prev) => [...prev, msg as Message])
    setInput('')
    const newMessages = [...messages, msg as Message]
    await fetchTeacherReply(conversationId, newMessages)
  }

  const showStart = conversationId === null && messages.length === 0

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 120px)' }}>
      <div className="animate-fade-in-down" style={{ marginBottom: 12, animation: 'fadeInDown 0.35s var(--ease-out-expo) forwards' }}>
        <Link to={`/lesson/${lessonId}`} className="link-back">
          ← Voltar
        </Link>
        {lesson && (
          <h2 style={{ margin: '8px 0 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-strong)' }}>
            {lesson.title}
          </h2>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '4px 0',
        }}
      >
        {showStart && (
          <div
            className="animate-fade-in-up animate-once"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              padding: '24px 0',
              opacity: 0,
              animationDelay: '0.1s',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: 'var(--green-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                animation: 'float 2.5s ease-in-out infinite',
              }}
            >
              💬
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>
              Pronto para praticar? O professor IA vai guiar a conversa.
            </p>
            <button
              type="button"
              onClick={startConversation}
              disabled={loading || !lesson}
              className="btn-primary"
            >
              {loading ? 'Starting…' : 'Start conversation'}
            </button>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === 'student' ? 'msg-bubble-student' : 'msg-bubble-teacher'}
            style={{
              alignSelf: m.role === 'student' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              padding: '14px 18px',
              borderRadius: m.role === 'student' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'teacher' ? 'var(--surface)' : 'var(--green)',
              color: m.role === 'teacher' ? 'var(--text-strong)' : 'white',
              boxShadow: m.role === 'teacher' ? 'var(--shadow)' : '0 2px 0 var(--green-dark)',
              border: m.role === 'teacher' ? '1px solid var(--border)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span style={{ lineHeight: 1.5 }}>{m.content}</span>
            {m.role === 'teacher' && (
              <button
                type="button"
                onClick={() => speak(m.content)}
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 12,
                  padding: '6px 12px',
                  background: 'var(--green-soft)',
                  border: 'none',
                  borderRadius: 10,
                  color: 'var(--green-dark)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'transform 0.2s, background 0.2s',
                }}
              >
                🔊 Ouvir
              </button>
            )}
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div
            className="animate-slide-in-left"
            style={{
              alignSelf: 'flex-start',
              padding: '14px 20px',
              borderRadius: '18px 18px 18px 4px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              animation: 'slideInLeft 0.3s var(--ease-out-expo) both',
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--text-muted)',
                  animation: 'dotPulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {conversationId !== null && (
        <div
          className="animate-fade-in-up animate-once"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
            opacity: 0,
            animationDelay: '0.05s',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={autoPlayVoice}
              onChange={(e) => setAutoPlayVoice(e.target.checked)}
              style={{ accentColor: 'var(--green)', width: 18, height: 18, cursor: 'pointer' }}
            />
            Ouvir resposta em áudio
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {SpeechRecognitionAPI && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? 'Parar gravação' : 'Falar (clique e fale; ao parar envia)'}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  border: '2px solid var(--border)',
                  background: isListening ? 'var(--error)' : 'var(--surface)',
                  color: isListening ? 'white' : 'var(--text-strong)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite ou use o microfone..."
              className="input"
              style={{ flex: 1, margin: 0 }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="btn-primary"
              style={{ padding: '12px 20px', flexShrink: 0 }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
