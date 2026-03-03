import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Lesson } from '@/types/database'
import type { Message } from '@/types/database'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)

type ListeningMode = 'input' | 'transcribe' | 'voice' | null

export function Conversation() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [autoPlayVoice, setAutoPlayVoice] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<InstanceType<NonNullable<typeof SpeechRecognitionAPI>> | null>(null)
  const transcriptRef = useRef<string>('')
  const userStoppedRef = useRef(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  const listeningModeRef = useRef<ListeningMode>(null)
  const isVoiceModeRef = useRef(false)
  messagesRef.current = messages
  isVoiceModeRef.current = isVoiceMode

  const onTeacherMessageRef = useRef<(content: string, options?: { voiceMode?: boolean; playTTS?: boolean }) => void>(() => {})
  onTeacherMessageRef.current = (content: string, options) => {
    const playTTS = options?.playTTS ?? (options?.voiceMode ? true : autoPlayVoice)
    if (playTTS) speak(content, options?.voiceMode ? () => maybeRestartVoiceListening() : undefined)
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

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.()
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    utteranceRef.current = u
    if (onEnd) {
      u.onend = () => onEnd()
    }
    window.speechSynthesis.speak(u)
  }, [])

  function maybeRestartVoiceListening() {
    if (!isVoiceModeRef.current || !SpeechRecognitionAPI || !recognitionRef.current) return
    transcriptRef.current = ''
    userStoppedRef.current = false
    listeningModeRef.current = 'voice'
    recognitionRef.current.start()
    setIsListening(true)
  }

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
      const mode = listeningModeRef.current
      listeningModeRef.current = null

      if (!userStoppedRef.current) {
        userStoppedRef.current = false
        return
      }
      userStoppedRef.current = false

      if (mode === 'input' && text) setInput((prev) => (prev ? `${prev} ${text}` : text))
      if (mode === 'transcribe' && text) sendMessageWithOptions(text, { from_transcription: true })
      if (mode === 'voice' && text) sendMessageWithOptions(text, { voice_mode: true })
    }
    rec.onerror = () => {
      setIsListening(false)
      transcriptRef.current = ''
      userStoppedRef.current = false
      listeningModeRef.current = null
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

  function startListening(mode: ListeningMode) {
    if (!SpeechRecognitionAPI || !conversationId) return
    transcriptRef.current = ''
    userStoppedRef.current = false
    listeningModeRef.current = mode
    recognitionRef.current?.start()
    setIsListening(true)
    if (mode === 'transcribe') setIsTranscribing(true)
  }

  function stopListening() {
    userStoppedRef.current = true
    recognitionRef.current?.stop()
    if (listeningModeRef.current === 'transcribe') setIsTranscribing(false)
  }

  function toggleTranscribe() {
    if (!conversationId) return
    if (isTranscribing || isListening) {
      stopListening()
      return
    }
    startListening('transcribe')
  }

  function toggleVoiceMode() {
    if (!conversationId) return
    if (isVoiceMode) {
      setIsVoiceMode(false)
      if (isListening) stopListening()
      return
    }
    setIsVoiceMode(true)
    startListening('voice')
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
    if (lesson) await fetchTeacherReply(conv.id, [], {})
  }

  async function fetchTeacherReply(
    convId: string,
    currentMessages: Message[],
    options: { voice_mode?: boolean; from_transcription?: boolean } = {}
  ) {
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
        voice_mode: options.voice_mode ?? false,
        from_transcription: options.from_transcription ?? false,
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
        const voiceMode = !!options.voice_mode
        const playTTS = voiceMode || autoPlayVoice
        const fromTranscription = !!options.from_transcription
        onTeacherMessageRef.current(teacherContent, {
          voiceMode,
          playTTS: fromTranscription ? false : playTTS,
        })
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

  async function sendMessageWithOptions(
    text: string,
    options: { voice_mode?: boolean; from_transcription?: boolean } = {}
  ) {
    if (!text.trim() || !conversationId || !lessonId) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role: 'student', content: text.trim() })
      .select('id, conversation_id, role, content, correction_data, created_at')
      .single()
    if (!msg) return
    setMessages((prev) => [...prev, msg as Message])
    setInput('')
    const newMessages = [...messages, msg as Message]
    await fetchTeacherReply(conversationId, newMessages, options)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text) return
    await sendMessageWithOptions(text, {})
  }

  function toggleVoiceInput() {
    if (!SpeechRecognitionAPI || !conversationId) return
    if (isListening && listeningModeRef.current === 'input') {
      stopListening()
      return
    }
    if (isListening) return
    startListening('input')
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
            Ouvir resposta em áudio (exceto em Transcrever)
          </label>

          {SpeechRecognitionAPI && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={toggleTranscribe}
                title={isTranscribing ? 'Parar e enviar transcrição' : 'Transcrever: gravar fala e enviar como texto'}
                style={{
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: '2px solid var(--border)',
                  background: isTranscribing ? 'var(--error)' : 'var(--surface)',
                  color: isTranscribing ? 'white' : 'var(--text-strong)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isTranscribing ? '⏹ Parar e enviar' : '🎙️ Transcrever'}
              </button>
              <button
                type="button"
                onClick={isVoiceMode && isListening ? stopListening : toggleVoiceMode}
                title={
                  isVoiceMode && isListening
                    ? 'Parar e enviar (resposta em áudio, depois nova escuta)'
                    : isVoiceMode
                      ? 'Encerrar conversa por voz'
                      : 'Conversar: modo voz contínuo (fala ↔ resposta em áudio)'
                }
                style={{
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: '2px solid var(--border)',
                  background: isVoiceMode ? 'var(--blue)' : 'var(--surface)',
                  color: isVoiceMode ? 'white' : 'var(--text-strong)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isVoiceMode && isListening ? '⏹ Parar e enviar' : isVoiceMode ? '🔊 Encerrar voz' : '🎧 Conversar'}
              </button>
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening && listeningModeRef.current === 'input' ? 'Parar' : 'Falar e colocar no campo (depois Enviar)'}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  border: '2px solid var(--border)',
                  background: isListening && listeningModeRef.current === 'input' ? 'var(--green)' : 'var(--surface)',
                  color: isListening && listeningModeRef.current === 'input' ? 'white' : 'var(--text-strong)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isListening && listeningModeRef.current === 'input' ? '⏹' : '🎤'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite ou use Transcrever / Conversar..."
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
