import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Lesson } from '@/types/database'
import type { Message } from '@/types/database'
import {
  ArrowLeft,
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Headphones,
  StopCircle,
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' &&
  ((window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition)

interface SpeechRecognitionInstance {
  start(): void
  stop(): void
  abort(): void
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

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
  const [voiceOverlayState, setVoiceOverlayState] = useState<'listening' | 'thinking' | 'speaking'>('listening')
  const [lastVoiceReplyContent, setLastVoiceReplyContent] = useState<string>('')
  const [autoPlayVoice, setAutoPlayVoice] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSpeakingRef = useRef(false)
  const ttsUnlockedRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const transcriptRef = useRef<string>('')
  const userStoppedRef = useRef(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  const listeningModeRef = useRef<ListeningMode>(null)
  const isVoiceModeRef = useRef(false)
  messagesRef.current = messages
  isVoiceModeRef.current = isVoiceMode

  const sendMessageWithOptionsRef = useRef<(text: string, options?: { voice_mode?: boolean; from_transcription?: boolean }) => void>(() => {})
  const onTeacherMessageRef = useRef<(content: string, options?: { voiceMode?: boolean; playTTS?: boolean }) => void>(() => {})
  onTeacherMessageRef.current = (content: string, options) => {
    if (options?.voiceMode) setLastVoiceReplyContent(content ?? '')
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

  function unlockTTS() {
    if (ttsUnlockedRef.current || typeof window === 'undefined' || !window.speechSynthesis) return
    ttsUnlockedRef.current = true
    const syn = window.speechSynthesis
    syn.getVoices()
    if (syn.onvoiceschanged !== undefined) {
      syn.onvoiceschanged = () => syn.getVoices()
    }
  }

  /** Chama no primeiro gesto do usuário (ex.: clicar em Conversar) para liberar TTS para uso depois. */
  function warmUpTTS() {
    unlockTTS()
  }

  /** Reproduz áudio via Edge Function TTS (VoiceRSS ou Google). Retorna Promise que resolve quando terminar ou rejeita em erro. */
  function playTTSViaAPI(text: string): Promise<void> {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key || !text?.trim()) return Promise.reject(new Error('Missing config or text'))
    return fetch(`${url}/functions/v1/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ text: text.trim().slice(0, 1000) }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((j) => Promise.reject(new Error(j?.error || res.statusText)))
        return res.blob()
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob)
        const audio = new Audio(objectUrl)
        ttsAudioRef.current = audio
        return new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(objectUrl)
            ttsAudioRef.current = null
            resolve()
          }
          audio.onerror = (e) => {
            URL.revokeObjectURL(objectUrl)
            ttsAudioRef.current = null
            reject(e)
          }
          audio.play().catch(reject)
        })
      })
  }

  /** Reproduz texto em áudio: tenta TTS via API (Edge Function); se falhar, usa Web Speech API nativa. */
  const speak = useCallback((text: string, onEnd?: () => void, _fromUserGesture?: boolean) => {
    if (!text?.trim()) {
      onEnd?.()
      return
    }
    if (isVoiceModeRef.current) {
      isSpeakingRef.current = true
      setVoiceOverlayState('speaking')
    }
    let ended = false
    const finish = () => {
      if (ended) return
      ended = true
      isSpeakingRef.current = false
      onEnd?.()
    }
    playTTSViaAPI(text)
      .then(finish)
      .catch(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          finish()
          return
        }
        unlockTTS()
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text.trim())
        u.lang = 'en-US'
        u.rate = 0.9
        u.volume = 1
        const syn = window.speechSynthesis
        const voices = syn.getVoices()
        const enVoice = voices.find((v) => v.lang.startsWith('en')) ?? voices[0]
        if (enVoice) u.voice = enVoice
        utteranceRef.current = u
        u.onend = finish
        u.onerror = finish
        syn.resume?.()
        syn.speak(u)
        if (onEnd) setTimeout(finish, 45000)
      })
  }, [])

  function stopTTSAndListen() {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause()
      ttsAudioRef.current.currentTime = 0
      ttsAudioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    isSpeakingRef.current = false
    maybeRestartVoiceListening()
  }

  function maybeRestartVoiceListening() {
    if (!isVoiceModeRef.current || !SpeechRecognitionAPI || !recognitionRef.current) return
    setLastVoiceReplyContent('')
    transcriptRef.current = ''
    userStoppedRef.current = false
    listeningModeRef.current = 'voice'
    setVoiceOverlayState('listening')
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!SpeechRecognitionAPI) return
    const rec = new SpeechRecognitionAPI()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'pt-BR'
    rec.onresult = (e: SpeechRecognitionResultEvent) => {
      const mode = listeningModeRef.current

      // Interrupção: usuário falou durante TTS
      if (mode === 'voice' && isSpeakingRef.current) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel()
          isSpeakingRef.current = false
        }
        setVoiceOverlayState('listening')
      }

      // Chrome envia resultados progressivos – pegar só o último final
      let lastFinal = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) lastFinal = e.results[i][0].transcript.trim()
      }
      if (lastFinal) {
        const prev = transcriptRef.current.trim()
        if (prev && lastFinal.toLowerCase().startsWith(prev.toLowerCase())) {
          transcriptRef.current = lastFinal
        } else {
          transcriptRef.current = (prev ? prev + ' ' + lastFinal : lastFinal).trim()
        }
      }

      // Timer 1,2s de silêncio (modo voz): qualquer fala reseta; após 1,2s sem fala, envia
      if (mode === 'voice' && (transcriptRef.current.trim() || lastFinal)) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null
          userStoppedRef.current = true
          recognitionRef.current?.stop()
        }, 1200)
      }
    }
    rec.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      setIsListening(false)
      const mode = listeningModeRef.current
      const text = transcriptRef.current.trim()

      if (!userStoppedRef.current) {
        userStoppedRef.current = false
        // Modo voz com transcript: não reiniciar – o timer de 1,2s vai parar e enviar
        if (mode === 'voice' && text) return
        const canRestart = (mode === 'transcribe' || mode === 'voice' || mode === 'input') && recognitionRef.current
        if (canRestart) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start()
              setIsListening(true)
            } catch {
              transcriptRef.current = ''
              listeningModeRef.current = null
              if (mode === 'transcribe') setIsTranscribing(false)
            }
          }, 120)
        } else {
          transcriptRef.current = ''
          listeningModeRef.current = null
          if (mode === 'transcribe') setIsTranscribing(false)
        }
        return
      }
      transcriptRef.current = ''
      listeningModeRef.current = null
      userStoppedRef.current = false

      if (mode === 'input' && text) setInput((prev) => (prev ? `${prev} ${text}` : text))
      if (mode === 'transcribe' && text) {
        setInput(text)
        setTimeout(() => sendMessageWithOptionsRef.current(text, { from_transcription: true }), 400)
      }
      if (mode === 'voice') {
        if (text) {
          sendMessageWithOptionsRef.current(text, { voice_mode: true, from_transcription: true })
        } else if (isVoiceModeRef.current && recognitionRef.current) {
          // Silêncio sem texto – reinicia escuta
          transcriptRef.current = ''
          userStoppedRef.current = false
          listeningModeRef.current = 'voice'
          setTimeout(() => {
            try {
              recognitionRef.current?.start()
              setIsListening(true)
            } catch {
              /* ignore */
            }
          }, 120)
        }
      }
    }
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      const err = e?.error ?? ''
      setIsListening(false)
      setIsTranscribing(false)
      const mode = listeningModeRef.current
      // Em modo voz: erros recuperáveis (no-speech, aborted) → reiniciar escuta em vez de matar
      if (mode === 'voice' && isVoiceModeRef.current && recognitionRef.current) {
        const recoverable = ['no-speech', 'aborted', 'audio-capture'].includes(err)
        if (recoverable) {
          transcriptRef.current = ''
          userStoppedRef.current = false
          listeningModeRef.current = 'voice'
          setVoiceOverlayState('listening')
          setTimeout(() => {
            try {
              recognitionRef.current?.start()
              setIsListening(true)
            } catch {
              listeningModeRef.current = null
            }
          }, 400)
          return
        }
      }
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
    const rec = recognitionRef.current
    if (!rec) return
    transcriptRef.current = ''
    userStoppedRef.current = false
    listeningModeRef.current = mode
    // Modo conversa: reconhecer em inglês (prática); transcrever/input em pt-BR
    rec.lang = mode === 'voice' ? 'en-US' : 'pt-BR'
    try {
      rec.start()
      setIsListening(true)
      if (mode === 'transcribe') setIsTranscribing(true)
    } catch (e) {
      console.error('Erro ao iniciar reconhecimento de voz:', e)
      listeningModeRef.current = null
      if (mode === 'transcribe') setIsTranscribing(false)
    }
  }

  function stopListening() {
    userStoppedRef.current = true
    recognitionRef.current?.stop()
    if (listeningModeRef.current === 'transcribe') setIsTranscribing(false)
  }

  function toggleTranscribe() {
    if (!conversationId) return
    unlockTTS()
    if (isTranscribing || isListening) {
      stopListening()
      return
    }
    startListening('transcribe')
  }

  function toggleVoiceMode() {
    if (!conversationId) return
    unlockTTS()
    if (isVoiceMode) {
      setIsVoiceMode(false)
      setVoiceOverlayState('listening')
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      if (isListening) stopListening()
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      return
    }
    warmUpTTS()
    setIsVoiceMode(true)
    setVoiceOverlayState('listening')
    setTimeout(() => startListening('voice'), 150)
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
    if (options.voice_mode) setVoiceOverlayState('thinking')
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
      const { data, error: invokeError } = await supabase.functions.invoke('tutor', {
        body,
        timeout: 90_000, // 90s – Groq pode demorar em cold start + latência
      })
      if (invokeError) {
        let errMsg = invokeError.message ?? 'Request failed'
        if (invokeError.name === 'FunctionsHttpError' && invokeError.context instanceof Response) {
          const res = invokeError.context
          try {
            const body = await res.json().catch(() => res.text())
            if (typeof body === 'object' && body?.error)
              errMsg = body.details ? `${body.error}: ${body.details}` : String(body.error)
            else if (typeof body === 'string' && body) errMsg = body
            else errMsg = `Erro ${res.status} na Edge Function`
          } catch {
            errMsg = `Erro ${res.status} na Edge Function`
          }
        }
        throw new Error(errMsg)
      }
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
        // Modo voz: sempre tocar resposta; transcrever no input: não tocar (evitar duplo áudio)
        const playTTS = voiceMode ? true : (options.from_transcription ? false : autoPlayVoice)
        onTeacherMessageRef.current(teacherContent, {
          voiceMode,
          playTTS,
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
  sendMessageWithOptionsRef.current = sendMessageWithOptions

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

  const btnIcon = { size: 18 as const, strokeWidth: 2 }

  return (
    <>
      {isVoiceMode && (
        <div
          className={`voice-overlay voice-overlay--${voiceOverlayState}`}
          role="dialog"
          aria-label="Modo conversa por voz"
        >
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {voiceOverlayState === 'thinking' && <div className="voice-pulse" aria-hidden />}
            <button
              type="button"
              className="voice-overlay__logo"
              onClick={() => {
                if (voiceOverlayState === 'speaking') stopTTSAndListen()
              }}
              title={voiceOverlayState === 'speaking' ? 'Interromper e ouvir' : undefined}
              style={{ cursor: voiceOverlayState === 'speaking' ? 'pointer' : 'default' }}
              aria-label={voiceOverlayState === 'speaking' ? 'Interromper resposta' : 'Logo'}
            >
              <MessageCircle size={48} strokeWidth={1.5} />
            </button>
            {voiceOverlayState === 'listening' && (
              <div className="voice-waves" aria-hidden>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span key={i} />
                ))}
              </div>
            )}
            {voiceOverlayState === 'thinking' && (
              <p style={{ margin: '24px 0 0', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
                Pensando…
              </p>
            )}
            {voiceOverlayState === 'speaking' && (
              <div style={{ marginTop: 24, maxWidth: 320, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Resposta da IA
                </p>
                {lastVoiceReplyContent ? (
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text)', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}>
                    {lastVoiceReplyContent}
                  </p>
                ) : (
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>Ouvindo resposta…</p>
                )}
              </div>
            )}
          </div>
          <div className="voice-controls">
            <button
              type="button"
              className="voice-controls__exit"
              onClick={toggleVoiceMode}
              title="Encerrar conversa"
            >
              <X size={20} style={{ marginRight: 6 }} />
              Encerrar conversa
            </button>
            {voiceOverlayState === 'speaking' && (
              <button
                type="button"
                onClick={stopTTSAndListen}
                title="Parar áudio e ouvir"
              >
                <VolumeX size={22} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current)
                  silenceTimerRef.current = null
                }
                userStoppedRef.current = true
                recognitionRef.current?.stop()
                transcriptRef.current = ''
                userStoppedRef.current = false
                listeningModeRef.current = 'voice'
                setVoiceOverlayState('listening')
                setTimeout(() => {
                  try {
                    recognitionRef.current?.start()
                    setIsListening(true)
                  } catch {
                    /* ignore */
                  }
                }, 150)
              }}
              title="Reiniciar escuta"
            >
              <RotateCcw size={22} />
            </button>
          </div>
        </div>
      )}

    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 120px)', opacity: isVoiceMode ? 0.3 : 1, pointerEvents: isVoiceMode ? 'none' : 'auto', transition: 'opacity 0.3s ease' }}>
      <div style={{ marginBottom: 16, animation: 'fadeInDown 0.3s var(--ease-out-expo) both' }}>
        <Link to={`/lesson/${lessonId}`} className="link-back">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        {lesson && (
          <h2
            style={{
              margin: '10px 0 0',
              fontSize: '1.0625rem',
              fontWeight: 600,
              color: 'var(--text-strong)',
              letterSpacing: '-0.01em',
            }}
          >
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
          gap: 12,
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
              gap: 20,
              padding: '32px 0',
              opacity: 0,
              animationDelay: '0.08s',
            }}
          >
            <div
              className="icon-wrap"
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background: 'var(--green-soft)',
                color: 'var(--green)',
                animation: 'float 2.5s ease-in-out infinite',
              }}
            >
              <MessageCircle size={32} strokeWidth={1.5} />
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 500, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
              Pronto para praticar? O professor IA vai guiar a conversa.
            </p>
            <button
              type="button"
              onClick={() => { warmUpTTS(); startConversation() }}
              disabled={loading || !lesson}
              className="btn-primary"
            >
              <ChevronRight size={20} strokeWidth={2} />
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
              padding: '14px 16px',
              borderRadius: m.role === 'student' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'teacher' ? 'var(--surface)' : 'var(--green)',
              color: m.role === 'teacher' ? 'var(--text-strong)' : 'white',
              boxShadow: m.role === 'student' ? '0 4px 0 var(--green-dark)' : 'var(--shadow)',
              border: m.role === 'teacher' ? '2px solid var(--border)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <span style={{ lineHeight: 1.55, fontSize: 14 }}>{m.content}</span>
            {m.role === 'teacher' && (
              <button
                type="button"
                onClick={() => { unlockTTS(); speak(m.content, undefined, true) }}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  padding: '6px 10px',
                  background: 'var(--green-soft)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--green-dark)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <Volume2 size={14} strokeWidth={2} />
                Ouvir
              </button>
            )}
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div
            className="animate-slide-in-left"
            style={{
              alignSelf: 'flex-start',
              padding: '14px 18px',
              borderRadius: '14px 14px 14px 4px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              animation: 'slideInLeft 0.25s var(--ease-out-expo) both',
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--text-subtle)',
                  animation: 'dotPulse 1s ease-in-out infinite',
                  animationDelay: `${i * 0.12}s`,
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
            gap: 12,
            paddingTop: 16,
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
              fontSize: 13,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <input
              type="checkbox"
              checked={autoPlayVoice}
              onChange={(e) => setAutoPlayVoice(e.target.checked)}
              style={{ accentColor: 'var(--green)', width: 16, height: 16, cursor: 'pointer' }}
            />
            Ouvir resposta em áudio (exceto em Transcrever)
          </label>

          {SpeechRecognitionAPI && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={toggleTranscribe}
                title={isTranscribing ? 'Parar e enviar' : 'Transcrever'}
                className="btn-secondary"
                style={{
                  padding: '10px 14px',
                  background: isTranscribing ? 'var(--error)' : undefined,
                  color: isTranscribing ? 'white' : undefined,
                  borderColor: isTranscribing ? 'var(--error)' : undefined,
                }}
              >
                {isTranscribing ? (
                  <>
                    <StopCircle {...btnIcon} />
                    Parar e enviar
                  </>
                ) : (
                  <>
                    <Mic {...btnIcon} />
                    Transcrever
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={isVoiceMode && isListening ? stopListening : toggleVoiceMode}
                title={
                  isVoiceMode && isListening
                    ? 'Parar e enviar'
                    : isVoiceMode
                      ? 'Encerrar voz'
                      : 'Conversar (modo voz contínuo)'
                }
                className="btn-secondary"
                style={{
                  padding: '10px 14px',
                  background: isVoiceMode ? 'var(--blue)' : undefined,
                  color: isVoiceMode ? 'white' : undefined,
                  borderColor: isVoiceMode ? 'var(--blue)' : undefined,
                }}
              >
                {isVoiceMode && isListening ? (
                  <>
                    <StopCircle {...btnIcon} />
                    Parar e enviar
                  </>
                ) : isVoiceMode ? (
                  <>
                    <Headphones {...btnIcon} />
                    Encerrar voz
                  </>
                ) : (
                  <>
                    <Headphones {...btnIcon} />
                    Conversar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={
                  isListening && listeningModeRef.current === 'input'
                    ? 'Parar'
                    : 'Falar e colocar no campo'
                }
                className="btn-secondary"
                style={{
                  width: 44,
                  height: 44,
                  padding: 0,
                  background:
                    isListening && listeningModeRef.current === 'input' ? 'var(--green)' : undefined,
                  color: isListening && listeningModeRef.current === 'input' ? 'white' : undefined,
                  borderColor:
                    isListening && listeningModeRef.current === 'input' ? 'var(--green)' : undefined,
                }}
              >
                {isListening && listeningModeRef.current === 'input' ? (
                  <MicOff {...btnIcon} />
                ) : (
                  <Mic {...btnIcon} />
                )}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite ou use Transcrever / Conversar"
              className="input"
              style={{ flex: 1, margin: 0 }}
            />
            <button
              type="button"
              onClick={() => { unlockTTS(); sendMessage() }}
              disabled={loading || !input.trim()}
              className="btn-primary"
              style={{ padding: '12px 18px', flexShrink: 0 }}
            >
              <Send size={18} strokeWidth={2} />
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
