import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const MAX_TEXT_LENGTH = 1000

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const text = typeof body?.text === "string" ? body.text.trim() : ""
    if (!text || text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: "text required (max " + MAX_TEXT_LENGTH + " chars)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      )
    }

    const voiceRssKey = Deno.env.get("VOICERSS_API_KEY")
    let audioBytes: ArrayBuffer
    let contentType: string

    if (voiceRssKey) {
      const url =
        "https://api.voicerss.org/?" +
        new URLSearchParams({
          key: voiceRssKey,
          hl: "en-us",
          src: text.slice(0, 500),
          c: "MP3",
          r: "-1",
        }).toString()
      const res = await fetch(url)
      if (!res.ok) {
        const t = await res.text()
        return new Response(
          JSON.stringify({ error: "VoiceRSS error", details: t.slice(0, 200) }),
          { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders() } }
        )
      }
      audioBytes = await res.arrayBuffer()
      contentType = "audio/mpeg"
    } else {
      const chunk = text.slice(0, 200).replace(/\s+/g, " ")
      const url =
        "https://translate.google.com/translate_tts?" +
        new URLSearchParams({
          ie: "UTF-8",
          q: chunk,
          tl: "en",
          client: "tw-ob",
        }).toString()
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      })
      if (!res.ok) {
        return new Response(
          JSON.stringify({
            error: "TTS indisponível. Adicione VOICERSS_API_KEY em Supabase → Edge Functions → Secrets (chave grátis em voicerss.org).",
          }),
          { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders() } }
        )
      }
      audioBytes = await res.arrayBuffer()
      contentType = res.headers.get("Content-Type") || "audio/mpeg"
    }

    return new Response(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        ...corsHeaders(),
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: "TTS error", details: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    })
  }
})
