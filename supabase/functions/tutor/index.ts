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
}

function buildSystemPrompt(lesson: LessonPayload): string {
  const goals = Array.isArray(lesson.learning_goals)
    ? lesson.learning_goals.map((g) => `- ${g}`).join("\n")
    : ""
  const grammar = lesson.grammar_focus ? `Grammar focus: ${lesson.grammar_focus}.` : ""
  const vocab = Array.isArray(lesson.vocabulary_tags) && lesson.vocabulary_tags.length
    ? `Vocabulary: ${lesson.vocabulary_tags.join(", ")}.`
    : ""

  return `You are a friendly English teacher for developers. This is a conversational lesson.

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

    const { lesson, messages } = body
    if (!lesson?.title || !lesson?.context) {
      return new Response(JSON.stringify({ error: "lesson.title and lesson.context required" }), { status: 200, headers: jsonHeaders })
    }

    const systemPrompt = buildSystemPrompt(lesson)
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

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: chatMessages,
        max_tokens: 512,
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
