# Inglês para Devs

Web app mobile-first para treino de inglês conversacional para desenvolvedores (A1–B1). Uso pessoal: trilha CEFR, aulas guiadas por IA (Groq), Supabase.

## Setup

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha:

- `VITE_SUPABASE_URL` — URL do projeto Supabase (ex.: `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — chave anon (publishable) do Supabase
- `GROQ_API_KEY` — chave da API Groq (só para Edge Function; não usar no frontend)

### 2. Supabase: schema e seed

No [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor:

1. Execute o conteúdo de `supabase/migrations/001_schema.sql` (cria tabelas e RLS).
2. Execute o conteúdo de `supabase/seed.sql` (insere níveis, módulos e aulas A1–B1).

### 3. Edge Function (tutor Groq)

No projeto Supabase:

1. Instale o [Supabase CLI](https://supabase.com/docs/guides/cli) e faça login.
2. No projeto: `supabase link --project-ref SEU_PROJECT_REF`.
3. Defina o secret: `supabase secrets set GROQ_API_KEY=sua_chave_groq`.
4. Deploy: `supabase functions deploy tutor`.

Ou crie a function pelo dashboard (Functions → New function → colar o código de `supabase/functions/tutor/index.ts`) e configure `GROQ_API_KEY` em Settings → Edge Functions → Secrets.

### 4. Auth

No Supabase Dashboard → Authentication → Providers: habilite Email. Crie um usuário (ou use Sign up) para fazer login no app.

### 5. Rodar o app

```bash
npm install
npm run dev
```

Abra o URL mostrado (ex.: http://localhost:5173). Faça login e use a trilha: escolha uma aula → Start conversation.

## Estrutura

- `src/` — React (Vite), mobile-first: Learning Path, introdução da aula, chat com professor IA.
- `supabase/migrations/` — schema (levels, modules, lessons, profiles, conversations, messages, user_lesson_progress) e RLS.
- `supabase/seed.sql` — trilha CEFR A1–B1 com conteúdo para devs.
- `supabase/functions/tutor/` — Edge Function que chama a Groq com system prompt por aula.

## Deploy na Netlify

1. Conecte o repositório [ingles-conversacional-devs](https://github.com/Rafael-Rangel/ingles-conversacional-devs) no [Netlify](https://app.netlify.com).
2. Build command e publish directory já vêm do `netlify.toml` (`npm run build` e `dist`).
3. Em **Site settings → Environment variables** adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Faça o deploy. O app usa Supabase na nuvem; a Edge Function `tutor` deve estar publicada no seu projeto Supabase.

## Stack

- React 18, Vite, TypeScript
- Supabase (Auth, Postgres, Edge Functions)
- Groq (llama-3.1-8b-instant) para o professor conversacional
