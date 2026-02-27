import ChatForm from '@/components/ChatForm';

/**
 * Design Philosophy: Minimalismo Futurista com Glassmorphism
 * - Superfícies flutuantes com efeito vidro translúcido
 * - Gradientes suaves de azul para azul escuro
 * - Animações fluidas com Framer Motion
 * - Chat como interface principal de coleta de dados
 */
export default function Home() {
  return (
    <div className="w-full">
      <ChatForm />
    </div>
  );
}
