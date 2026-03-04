# Inglês para Devs — Documentação Visual e Funcional

Documento que descreve todas as telas, funções e o que aparece no app, do ponto de vista visual e de uso.

---

## Visão geral

O app é um curso de inglês conversacional para desenvolvedores. A tela é clara, com fundo branco, destaque em verde e animações suaves ao carregar e interagir.

---

## Tela de carregamento inicial

**Quando aparece:** Logo ao abrir o app, antes de entrar na conta ou na trilha.

**O que aparece:**
- Ícone de livros em um quadrado verde flutuando
- Texto "Carregando…"
- Três bolinhas verdes animadas (efeito de espera)

**Fluxo:** Alguns segundos depois, o app verifica se você está logado. Se sim, mostra a trilha. Se não, encaminha para a tela de login.

---

## Tela de Login

**URL:** `/login`

**O que aparece:**
- Fundo em gradiente suave (cinza claro → branco)
- Card branco centralizado com bordas arredondadas
- Ícone de alvo em quadrado verde
- Título "Entrar"
- Texto: "Use seu email e senha para continuar aprendendo"
- Campo de email
- Campo de senha
- Opção "Mostrar senha"
- Botão verde "Entrar"
- Link "Ainda não tem conta? Criar conta"

**Funcionamento:**
- Se errar email ou senha, aparece uma mensagem em vermelho no card
- Ao clicar em "Entrar", o botão mostra "Entrando…" enquanto processa
- Ao logar, a tela muda para a trilha de aprendizado

---

## Tela de Criar Conta (Signup)

**URL:** `/signup`

**O que aparece:**
- Mesmo estilo do login (card central, fundo gradiente)
- Ícone de foguete em verde
- Título "Criar conta"
- Texto: "Digite seu email e uma senha (mínimo 6 caracteres)"
- Campo de email
- Campo de senha
- Opção "Mostrar senha"
- Botão verde "Criar conta"
- Link "Já tem conta? Entrar"

**Após criar conta com sucesso:**
- Ícone de check em verde
- Título "Conta criada!"
- Texto explicando que pode ser preciso confirmar o email
- Botão "Ir para login"

---

## Cabeçalho (em todas as telas logadas)

**O que aparece:**
- Ícone de livros em quadrado verde à esquerda
- Título "Inglês para Devs"
- Botão "Sair" à direita

O cabeçalho aparece em todas as páginas depois do login.

---

## Trilha de Aprendizado

**URL:** `/` (página inicial após login)

**O que aparece:**

1. **Título:** "Trilha de aprendizado"
2. **Subtítulo:** "Escolha uma aula e pratique com o professor IA."
3. **Lista de níveis** (ex.: A1, A2, B1…):
   - Cada nível em um badge verde com número
   - Módulos dentro de cada nível (ex.: "Saudações", "Apresentação")
   - Cada aula em um card clicável com:
     - Ícone de balão de conversa
     - Nome da aula
     - Seta →

**Durante o carregamento:**
- Ícone de livros flutuando
- Texto "Carregando trilha…"
- Cinco barras cinza animadas (skeleton)

**Ao passar o mouse nos cards de aula:** o card sobe levemente, a borda fica verde e a seta se move.

---

## Introdução da Aula

**URL:** `/lesson/:id` (ex.: ao clicar em uma aula)

**O que aparece:**
- Link "← Voltar" no topo
- Card com:
  - **Título da aula**
  - **Seção "You will learn"** — lista do que será praticado
  - **Seção "Context"** — contexto da conversa (situação, tema)
  - **Botão verde "Start conversation"** com seta →

**Durante o carregamento:**
- Ícone de livro flutuando
- Texto "Carregando…"
- Três bolinhas verdes animadas

**Se a aula não for encontrada:** mensagem em vermelho "Aula não encontrada."

---

## Tela de Conversa (Chat)

**URL:** `/lesson/:id/chat`

### Antes de começar a conversa

**O que aparece:**
- Link "← Voltar"
- Título da aula
- Ícone de conversa grande em fundo verde suave
- Texto: "Pronto para praticar? O professor IA vai guiar a conversa."
- Botão verde "Start conversation"

**Ao clicar em "Start conversation":** o professor envia a primeira mensagem e a área de chat aparece.

---

### Durante a conversa

**O que aparece:**
- **Mensagens do aluno:** à direita, em bolhas verdes
- **Mensagens do professor:** à esquerda, em bolhas brancas com borda, cada uma com botão "Ouvir"
- **Indicador de resposta:** três bolinhas animadas quando o professor está "digitando"

**Área de entrada (rodapé):**
- **Checkbox:** "Ouvir resposta em áudio (exceto em Transcrever)"
- **Três botões de voz:**
  - **Transcrever** — grava sua fala e envia como texto (resposta só aparece na tela, sem áudio)
  - **Conversar** — modo voz contínuo (fala → ouve resposta em áudio → fala de novo)
  - **Microfone** — grava e coloca o texto no campo; você edita e clica em Enviar
- **Campo de texto** para digitar
- **Botão "Enviar"** verde

---

### Botão Transcrever

**Como funciona:**
1. Clicar em "Transcrever" → gravação começa (botão fica vermelho: "Parar e enviar")
2. Falar no microfone
3. Clicar em "Parar e enviar" → o que você falou vira texto e é enviado ao professor
4. A resposta aparece só na tela (sem áudio)
5. O professor não menciona que foi transcrição; se não entender ou a mensagem parecer incompleta, responde com frases específicas para pedir que repita

---

### Botão Conversar

**Como funciona:**
1. Clicar em "Conversar" → ativa o modo voz (botão fica azul)
2. Gravação começa automaticamente
3. Falar e clicar em "Parar e enviar"
4. A resposta do professor é falada em áudio (inglês)
5. Quando o áudio termina, a gravação recomeça sozinha
6. Repetir: falar → Parar e enviar → ouvir → falar…
7. Clicar em "Encerrar voz" para sair do modo voz

**Comportamento no modo voz:** o professor fala de forma mais natural, com frases curtas, sem listas ou emojis.

---

### Botão Microfone (campo de texto)

**Como funciona:**
1. Clicar no ícone de microfone
2. Falar
3. Ao parar, o texto aparece no campo de texto
4. Você pode editar
5. Clicar em "Enviar" para enviar

---

## Resumo das páginas

| Página        | Rota       | O que mostra                                                      |
|---------------|------------|-------------------------------------------------------------------|
| Login         | `/login`   | Formulário para entrar com email e senha                          |
| Signup        | `/signup`  | Formulário para criar conta                                       |
| Trilha        | `/`        | Níveis, módulos e aulas em cards clicáveis                        |
| Introdução    | `/lesson/:id` | Título, objetivos e contexto da aula; botão para iniciar chat  |
| Conversa      | `/lesson/:id/chat` | Chat com professor IA + botões Transcrever, Conversar e Microfone |

---

## Resumo visual do tema

- **Cores:** Verde principal, fundo branco, cinzas suaves
- **Animações:** Entrada suave das telas, carregamentos com ícones flutuando e bolinhas
- **Botões:** Verde para ações principais, outline para secundários
- **Cards:** Brancos, bordas arredondadas, sombra leve
- **Layout:** Centralizado (largura máxima ~480px), pensado para mobile
