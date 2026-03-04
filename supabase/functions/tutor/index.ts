import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

interface LessonPayload {
  title: string
  context: string
  learning_goals: string[]
  grammar_focus?: string | null
  vocabulary_tags?: string[] | null
}

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

interface RequestBody {
  lesson: LessonPayload
  messages: { role: string; content: string }[]
  studentMessage?: string | null
  voice_mode?: boolean
  from_transcription?: boolean
}

const VOICE_MODE_SYSTEM_APPENDIX = `You are now in VOICE conversation mode.
- Respond in a natural, fluid, conversational way.
- Use short or medium phrases. Avoid long answers.
- No lists, no numbered items, no markdown, no emojis.
- Sound human and dynamic. Use natural transitions like "Boa pergunta! Funciona assim…" or "Deixa eu te explicar de um jeito simples."
- Do not use robotic or formal language. Keep it like real-time spoken conversation.`

const CLEAN_TRANSCRIPT_PROMPT = `You receive a messy speech-to-text transcript with repetitions (the same phrase repeated as the user kept speaking).
Your job: output ONLY a clean, coherent version of what the person actually said. Remove redundant repetitions. Keep the meaning and flow.
Do NOT correct grammar, spelling, or vocabulary mistakes - this is for a language lesson. Keep words as spoken (even if wrong).
Output ONLY the cleaned text. No explanation, no quotes, no prefix.`

const TRANSCRIPTION_SYSTEM_APPENDIX = `This message came from speech-to-text (transcription).
- Do NOT mention that it was a transcription. Respond as if the student had typed.
- If the message is unclear or confusing, reply only: "Não entendi muito bem, pode repetir?"
- If the message seems incomplete (cut off or too short to understand), reply only: "Sua mensagem pareceu incompleta, você pode falar novamente?"
- Otherwise respond normally.`

function buildSystemPrompt(lesson: LessonPayload, options: { voice_mode?: boolean; from_transcription?: boolean } = {}): string {
  const goals = Array.isArray(lesson.learning_goals)
    ? lesson.learning_goals.map((g) => `- ${g}`).join("\n")
    : ""
  const grammar = lesson.grammar_focus ? `Grammar focus: ${lesson.grammar_focus}.` : ""
  const vocab = Array.isArray(lesson.vocabulary_tags) && lesson.vocabulary_tags.length
    ? `Vocabulary: ${lesson.vocabulary_tags.join(", ")}.`
    : ""

  let base = `You are a friendly English teacher for developers. This is a conversational lesson.

Lesson title: ${lesson.title}
Context: ${lesson.context}

You will help the student practice by:
${goals}
${grammar}
${vocab}

Rules:
- The conversation can be in English, Portuguese, or both. Reply in the language that fits best: if the student writes in Portuguese, you may answer in Portuguese or in English (to practice); if they write in English, answer in English. Mix when it helps learning.
- Be concise (1-3 short paragraphs per reply).
- If the student makes a mistake, correct them kindly: (1) acknowledge their attempt, (2) give the correct form, (3) brief explanation, (4) continue the conversation.
- Keep the dialogue natural and focused on the lesson context. Do not repeat the full lesson instructions; just guide the conversation.`

  if (options.voice_mode) {
    base += "\n\n" + VOICE_MODE_SYSTEM_APPENDIX
  }
  if (options.from_transcription) {
    base += "\n\n" + TRANSCRIPTION_SYSTEM_APPENDIX
  }

  return base
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    // Supabase clients send these headers
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders }

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY")
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY. Add it in Supabase → Edge Functions → Secrets." }), { status: 200, headers: jsonHeaders })
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 200, headers: jsonHeaders })
    }

    let { lesson, messages, voice_mode, from_transcription } = body
    if (!lesson?.title || !lesson?.context) {
      return new Response(JSON.stringify({ error: "lesson.title and lesson.context required" }), { status: 200, headers: jsonHeaders })
    }

    // Limpa transcrição repetida com IA antes de enviar ao professor
    if (from_transcription && Array.isArray(messages) && messages.length > 0) {
      const lastIdx = messages.length - 1
      const lastMsg = messages[lastIdx]
      if (lastMsg?.role === "student" && lastMsg.content?.trim()) {
        const raw = lastMsg.content.trim()
        const cleanRes = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: CLEAN_TRANSCRIPT_PROMPT },
              { role: "user", content: raw },
            ],
            max_tokens: 256,
            temperature: 0.2,
          }),
        })
        if (cleanRes.ok) {
          const cleanData = await cleanRes.json()
          const cleaned = cleanData?.choices?.[0]?.message?.content?.trim()
          if (cleaned) {
            messages = [...messages]
            messages[lastIdx] = { ...lastMsg, content: cleaned }
          }
        }
      }
    }

    const systemPrompt = buildSystemPrompt(lesson, { voice_mode: !!voice_mode, from_transcription: !!from_transcription })
    const chatMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }]

    for (const m of messages ?? []) {
      const role = m.role === "teacher" ? "assistant" : "user"
      chatMessages.push({ role: role as "user" | "assistant", content: m.content })
    }

    if (chatMessages.length === 1) {
      chatMessages.push({
        role: "user",
        content: "The student is about to start the conversation. Greet them and ask the first question to begin the lesson (in English).",
      })
    }

    const isVoiceMode = !!voice_mode
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: chatMessages,
        max_tokens: isVoiceMode ? 150 : 256,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: "Groq API error", details: err }), { status: 200, headers: jsonHeaders })
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? "Let's continue. What would you like to say?"
    return new Response(JSON.stringify({ content }), { status: 200, headers: jsonHeaders })
  } catch (e) {
    const details = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: "Tutor error", details }), { status: 200, headers: jsonHeaders })
  }
})
