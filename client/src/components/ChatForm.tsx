import { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface FormData {
  name: string;
  companyName: string;
  phone: string;
  objective: string;
  targetAudience: string;
  availableContent: string;
  referenceLinks: string;
  desiredSections: string;
  features: string;
  domain: string;
  deadline: string;
  additionalInfo: string;
}

const STEPS = [
  {
    id: 'name',
    title: 'Nome',
    question: 'Qual é o seu nome completo?',
    key: 'name'
  },
  {
    id: 'company',
    title: 'Nome da Empresa',
    question: 'Qual é o nome da sua empresa ou negócio?',
    key: 'companyName'
  },
  {
    id: 'phone',
    title: 'Telefone',
    question: 'Qual é o seu número de telefone ou WhatsApp?',
    key: 'phone'
  },
  {
    id: 'objective',
    title: 'Objetivo da Landing Page',
    question: 'Qual é o principal objetivo da sua landing page?',
    options: [
      'Captar leads',
      'Receber contatos pelo WhatsApp',
      'Gerar pedidos de orçamento',
      'Apresentar serviços'
    ],
    key: 'objective'
  },
  {
    id: 'audience',
    title: 'Público-Alvo',
    question: 'Qual é o público que você deseja atingir?',
    options: [
      'Empresas',
      'Pessoas físicas',
      'Pequenos negócios',
      'Clínicas',
      'Lojas'
    ],
    key: 'targetAudience'
  },
  {
    id: 'content',
    title: 'Conteúdo Disponível',
    question: 'Que tipo de conteúdo você já possui para usar no site?',
    options: [
      'Textos',
      'Logo',
      'Imagens',
      'Vídeos',
      'Identidade visual',
      'Nenhum ainda'
    ],
    key: 'availableContent'
  },
  {
    id: 'references',
    title: 'Sites de Referência',
    question: 'Envie links de sites que você gosta como referência ou descreva o estilo desejado.',
    key: 'referenceLinks'
  },
  {
    id: 'sections',
    title: 'Estrutura Desejada',
    question: 'Quais seções você deseja incluir na landing page?',
    options: [
      'Banner inicial',
      'Serviços',
      'Sobre a empresa',
      'Depoimentos',
      'Portfólio',
      'Formulário de contato',
      'Botão WhatsApp'
    ],
    key: 'desiredSections'
  },
  {
    id: 'features',
    title: 'Funcionalidades',
    question: 'Quais funcionalidades você precisa no site?',
    options: [
      'Formulário de contato',
      'Botão WhatsApp',
      'Integração com CRM',
      'Pixel de anúncios',
      'Google Analytics'
    ],
    key: 'features'
  },
  {
    id: 'domain',
    title: 'Domínio e Hospedagem',
    question: 'Você já possui domínio e hospedagem?',
    options: [
      'Sim, tenho ambos',
      'Tenho domínio apenas',
      'Tenho hospedagem apenas',
      'Não tenho nenhum',
      'Quero que vocês cuidem disso'
    ],
    key: 'domain'
  },
  {
    id: 'deadline',
    title: 'Prazo',
    question: 'Existe algum prazo para a entrega do projeto?',
    key: 'deadline'
  },
  {
    id: 'additional',
    title: 'Informações Adicionais',
    question: 'Há mais alguma informação que você gostaria de compartilhar?',
    key: 'additionalInfo'
  }
];

export default function ChatForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    companyName: '',
    phone: '',
    objective: '',
    targetAudience: '',
    availableContent: '',
    referenceLinks: '',
    desiredSections: '',
    features: '',
    domain: '',
    deadline: '',
    additionalInfo: ''
  });
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        const greeting: Message = {
          id: '0',
          type: 'bot',
          content: 'Olá! 👋 Bem-vindo ao assistente de briefing da StackFlow. Vou fazer algumas perguntas para entender melhor o seu projeto e criar uma landing page ideal para você.',
          timestamp: new Date()
        };
        const firstQuestion: Message = {
          id: '1',
          type: 'bot',
          content: STEPS[0].question,
          timestamp: new Date()
        };
        setMessages([greeting, firstQuestion]);
      }, 500);
    }
  }, []);

  const handleOptionClick = (option: string) => {
    handleInputSubmit(option);
  };

  const handleInputSubmit = (value: string) => {
    if (!value.trim()) return;

    const step = STEPS[currentStep];
    const updatedFormData = { ...formData, [step.key]: value };
    setFormData(updatedFormData);

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: value,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    if (currentStep === STEPS.length - 1) {
      submitForm(updatedFormData);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const nextStep = STEPS[currentStep + 1];
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: nextStep.question,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setCurrentStep(prev => prev + 1);
      setIsLoading(false);
      setUserInput('');
    }, 800);
  };

  const submitForm = async (data?: FormData) => {
    setIsLoading(true);
    const formDataToSend = data ?? formData;

    try {
      const emailContent = `
BRIEFING PARA LANDING PAGE - StackFlow
=====================================

DADOS DE CONTATO
----------------
Nome: ${formDataToSend.name}
Empresa: ${formDataToSend.companyName}
Telefone/WhatsApp: ${formDataToSend.phone}

OBJETIVO E ESTRUTURA
-------------------
1. Objetivo da Landing Page
${formDataToSend.objective}

2. Público-Alvo
${formDataToSend.targetAudience}

3. Conteúdo Disponível
${formDataToSend.availableContent}

4. Sites de Referência
${formDataToSend.referenceLinks}

5. Estrutura Desejada
${formDataToSend.desiredSections}

6. Funcionalidades
${formDataToSend.features}

7. Domínio e Hospedagem
${formDataToSend.domain}

8. Prazo para Entrega
${formDataToSend.deadline}

9. Informações Adicionais
${formDataToSend.additionalInfo}
      `.trim();

      const formElement = document.createElement('form');
      formElement.method = 'POST';
      formElement.action = 'https://formsubmit.co/stackflow.soft@gmail.com';
      formElement.style.display = 'none';

      const subjectInput = document.createElement('input');
      subjectInput.type = 'hidden';
      subjectInput.name = '_subject';
      subjectInput.value = 'Novo Briefing de Landing Page';
      formElement.appendChild(subjectInput);

      const messageInput = document.createElement('textarea');
      messageInput.name = 'message';
      messageInput.value = emailContent;
      formElement.appendChild(messageInput);

      document.body.appendChild(formElement);
      
      const formDataToSend = new FormData(formElement);
      const response = await fetch('https://formsubmit.co/stackflow.soft@gmail.com', {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setIsSubmitted(true);
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'bot',
          content: 'Perfeito! Seu briefing foi enviado com sucesso. Em breve entraremos em contato com você! 🎉',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
      }

      document.body.removeChild(formElement);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setIsLoading(false);
    }
  };

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col">
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-blue-900 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-display font-bold text-cyan-400">
                StackFlow Briefing
              </h1>
            </div>
          </div>
          <div className="w-full bg-blue-900 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 py-8">
        <AnimatePresence mode="wait">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`flex mb-6 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-3 max-w-xs lg:max-w-md ${
                  message.type === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {message.type === 'bot' && (
                  <motion.div
                    className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <img 
                      src="https://d2xsxph8kpxj0f.cloudfront.net/310519663370803495/mjUwYk48ozGEqcyv5KrozC/ai-assistant-avatar-jDay5y6ysLpThsg6odbAmd.webp" 
                      alt="AI Assistant" 
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                )}

                <motion.div
                  className={`px-4 py-3 rounded-2xl backdrop-blur-sm ${
                    message.type === 'bot'
                      ? 'bg-slate-800/80 border border-blue-700 text-gray-100 rounded-bl-none'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-none'
                  }`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            className="flex gap-3 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
              <img 
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663370803495/mjUwYk48ozGEqcyv5KrozC/ai-assistant-avatar-jDay5y6ysLpThsg6odbAmd.webp" 
                alt="AI Assistant" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-600"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {!isSubmitted && !isLoading && currentStep < STEPS.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-8"
          >
            {/* Mostrar opções rápidas se existirem */}
            {step.options && step.options.length > 0 && (
              <div className="grid grid-cols-1 gap-2 mb-4">
                {step.options.map((option, idx) => (
                  <motion.button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    whileHover={{ x: 4 }}
                    className="p-3 text-left rounded-xl border-2 transition-all border-blue-700 bg-slate-800/50 hover:border-blue-600 text-gray-200"
                  >
                    <span className="text-sm font-medium">{option}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Campo de input de texto em TODAS as etapas */}
            <div className="flex gap-2 items-center justify-center">
              <input
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && userInput.trim()) {
                    handleInputSubmit(userInput);
                  }
                }}
                placeholder={step.options && step.options.length > 0 ? "Ou digite sua resposta..." : "Digite sua resposta..."}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-blue-700 focus:border-cyan-500 focus:outline-none bg-slate-800/50 text-gray-100 placeholder-gray-400 transition-colors"
              />
              <Button
                onClick={() => {
                  if (userInput.trim()) {
                    handleInputSubmit(userInput);
                  }
                }}
                disabled={!userInput.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            </motion.div>
            <h2 className="text-2xl font-display font-bold text-cyan-300 mb-2">
              Formulário Enviado com Sucesso!
            </h2>
            <p className="text-gray-300">
              Obrigado por compartilhar os detalhes do seu projeto. Em breve entraremos em contato.
            </p>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
