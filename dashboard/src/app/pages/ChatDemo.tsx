import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Bot,
  RotateCcw,
  ArrowLeft,
  Smartphone,
  Laptop,
  Coffee,
  CreditCard,
  Shirt,
  Building2,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { markDemoVisited } from '../../lib/onboardingProgress';
import { MarkdownMessage, sanitizeBotMarkdown } from '../components/MarkdownMessage';
import { SponsoredCard } from '../components/demo/SponsoredCard';
import { Logo } from '../components/design';
import { cn } from '../components/ui/utils';

type Message = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  ad?: {
    match: boolean;
    suggestion?: string;
    tracking_url?: string;
    cta_label?: string;
    campaign_name?: string;
    category_label?: string;
  };
};

const MAX_INPUT_HEIGHT = 140;
const SESSION_KEY = 'synaptic_demo_session_id';
const DEMO_API_KEY = 'sk-synaptic-demo';

function getDemoApiKey(): string {
  return import.meta.env.VITE_DEMO_API_KEY || localStorage.getItem('synaptic_demo_api_key') || DEMO_API_KEY;
}

function ensureDemoApiKey() {
  if (!localStorage.getItem('synaptic_demo_api_key') && !import.meta.env.VITE_DEMO_API_KEY) {
    localStorage.setItem('synaptic_demo_api_key', DEMO_API_KEY);
  }
}

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function newSessionId() {
  const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

function toApiHistory(messages: Message[]) {
  return messages.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.text,
  }));
}

function buildBotMessage(
  answer: string,
  defaultCtaLabel: string,
  sponsored?: {
    suggestion: string;
    tracking_url?: string;
    cta_label?: string;
    campaign_name?: string;
    category_label?: string;
  }
) {
  const cleanAnswer = sanitizeBotMarkdown(answer);
  if (!sponsored?.suggestion) {
    return { text: cleanAnswer };
  }
  return {
    text: cleanAnswer,
    ad: {
      match: true,
      suggestion: sponsored.suggestion,
      tracking_url: sponsored.tracking_url,
      cta_label: sponsored.cta_label || defaultCtaLabel,
      campaign_name: sponsored.campaign_name,
      category_label: sponsored.category_label,
    },
  };
}

export default function ChatDemo() {
  const { t } = useTranslation();
  const welcomeMessage = {
    id: 'welcome',
    sender: 'bot',
    text: t('chat.welcomeMessage'),
  } satisfies Message;
  const fallbackAnswer = t('chat.fallbackAnswer');
  const promptGroups = [
    {
      title: t('chat.categories.finance'),
      icon: CreditCard,
      prompts: [t('chat.prompts.loan'), t('chat.prompts.installment')],
    },
    {
      title: t('chat.categories.tech'),
      icon: Laptop,
      prompts: [t('chat.prompts.laptop'), t('chat.prompts.iphone')],
    },
    {
      title: t('chat.categories.food'),
      icon: Coffee,
      prompts: [t('chat.prompts.pizza'), t('chat.prompts.dinner')],
    },
    {
      title: t('chat.categories.fashion'),
      icon: Shirt,
      prompts: [t('chat.prompts.clothing'), t('chat.prompts.sneakers')],
    },
  ];

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef(getOrCreateSessionId());

  useEffect(() => {
    ensureDemoApiKey();
    markDemoVisited();
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const resetChat = () => {
    sessionIdRef.current = newSessionId();
    setMessages([welcomeMessage]);
    setInput('');
    toast.success(t('chat.newChatStarted'));
  };

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText.trim(),
    };

    const historyBefore = messages;
    const apiHistory = toApiHistory([...historyBefore, userMsg]);

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      let answer = fallbackAnswer;
      try {
        const enrich = await api.enrich(userText, {
          answerOnly: true,
          messages: apiHistory,
          sessionId: sessionIdRef.current,
          parseMode: 'Markdown',
        });
        if (enrich?.text) answer = enrich.text;
      } catch {
        toast.error(t('chat.aiError'));
      }

      let sponsored:
        | {
            suggestion: string;
            tracking_url?: string;
            cta_label?: string;
            campaign_name?: string;
            category_label?: string;
          }
        | undefined;

      try {
        const synaptic = await api.sendResult(userText, getDemoApiKey(), { messages: apiHistory });
        const hasValidLink =
          typeof synaptic?.tracking_url === 'string' &&
          synaptic.tracking_url.includes('/t/') &&
          !synaptic.tracking_url.includes('/t/undefined');
        const hasCopy =
          typeof synaptic?.suggestion === 'string' &&
          synaptic.suggestion.length > 20 &&
          synaptic.campaign?.name;
        if (synaptic?.match && hasCopy && hasValidLink) {
          sponsored = {
            suggestion: synaptic.suggestion,
            tracking_url: synaptic.tracking_url,
            cta_label: synaptic.cta_label || synaptic.campaign?.link_text || synaptic.campaign?.name,
            campaign_name: synaptic.campaign?.name,
            category_label: synaptic.campaign?.category_label,
          };
        }
      } catch {
        /* reklama ixtiyoriy */
      }

      const { text, ad } = buildBotMessage(answer, t('chat.moreInfo'), sponsored);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: 'bot', text, ad },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showWelcomeExtras = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <div className="flex flex-1 min-h-0 h-full bg-[var(--color-bg-subtle)]">
      <Helmet>
        <title>{t('chat.pageTitle')}</title>
        <meta
          name="description"
          content={t('chat.pageDesc')}
        />
      </Helmet>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-[280px] shrink-0 flex-col border-r border-[var(--color-border)] bg-white">
        <div className="p-4 border-b border-[var(--color-border)]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-4"
            aria-label={t('chat.back')}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('chat.homeLink')}
          </Link>
          <h2 className="text-lg font-bold text-[var(--color-text)]">{t('chat.sidebarTitle')}</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
            {t('chat.sidebarDesc')}
          </p>
        </div>
        <div className="synaptic-scroll flex-1 overflow-y-auto p-3 space-y-4" data-scrollable="true">
          {promptGroups.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 px-1 mb-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                <group.icon className="w-3.5 h-3.5" />
                {group.title}
              </div>
              <div className="space-y-1.5">
                {group.prompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={isTyping}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-icon-bg)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={resetChat}
            className="w-full flex items-center justify-center gap-2 min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t('chat.newChat')}
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 relative">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[var(--color-primary)]/8 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[var(--color-chart-fill)] blur-3xl" />
        </div>

        <header className="relative shrink-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-white/90 backdrop-blur-xl">
          <Link
            to="/"
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
            aria-label={t('chat.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="relative shrink-0">
            <Logo size="md" className="ring-2 ring-[var(--color-border)]" />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-[var(--color-text)] leading-tight">Synaptic AI</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {isTyping ? t('chat.writing') : t('chat.demoSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={resetChat}
            className="hidden sm:flex items-center gap-1.5 min-h-10 px-3 rounded-[var(--radius-md)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border)]"
          >
            <RotateCcw className="w-4 h-4" />
            {t('chat.new')}
          </button>
        </header>

        <div
          ref={messagesContainerRef}
          className="synaptic-scroll synaptic-scroll-lg relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-5"
          data-scrollable="true"
        >
          <div className="max-w-2xl mx-auto w-full space-y-5">
            {showWelcomeExtras && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 animate-fadeIn">
                {[
                  { icon: Building2, label: t('chat.categories.bank') },
                  { icon: Smartphone, label: t('chat.categories.phones') },
                  { icon: Coffee, label: t('chat.categories.delivery') },
                  { icon: Shirt, label: t('chat.categories.fashion') },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/80 p-3 text-center"
                  >
                    <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex w-full gap-2.5 animate-fadeIn',
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.sender === 'bot' && (
                  <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-icon-bg)] text-[var(--color-primary)] mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[min(88%,520px)] rounded-[var(--radius-xl)] px-4 py-3 shadow-[var(--shadow-sm)]',
                    msg.sender === 'user'
                      ? 'bg-[var(--color-primary)] text-white rounded-br-md'
                      : 'bg-white border border-[var(--color-border)] rounded-bl-md'
                  )}
                >
                  {msg.sender === 'user' ? (
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  ) : (
                    <MarkdownMessage text={msg.text} inverted={false} />
              )}

                {msg.sender === 'bot' && msg.ad?.match && msg.ad.tracking_url && (
                    <SponsoredCard
                      suggestion={msg.ad.suggestion}
                      campaignName={msg.ad.campaign_name}
                      categoryLabel={msg.ad.category_label}
                      trackingUrl={msg.ad.tracking_url}
                      ctaLabel={msg.ad.cta_label || t('chat.moreInfo')}
                      label={t('chat.adLabel')}
                    />
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 justify-start animate-fadeIn">
                <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-icon-bg)] text-[var(--color-primary)]">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-xl)] rounded-bl-md px-4 py-3.5 flex gap-1.5 shadow-[var(--shadow-xs)]">
                  {[0, 0.12, 0.24].map((delay) => (
                    <div
                      key={delay}
                      className="w-2 h-2 bg-[var(--color-primary)]/50 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="relative shrink-0 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex items-end gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] bg-white px-3 py-2 shadow-[var(--shadow-sm)] focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-muted)] transition-shadow">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.inputPlaceholder')}
                rows={1}
                disabled={isTyping}
                className="flex-1 bg-transparent text-[var(--color-text)] outline-none resize-none text-[15px] leading-[22px] py-2 placeholder:text-[var(--color-text-muted)] max-h-[140px] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="shrink-0 flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-40 transition-all active:scale-95 mb-0.5"
                aria-label={t('chat.send')}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <div className="md:hidden flex gap-2 mt-2 overflow-x-auto scrollbar-hide pb-0.5">
              {promptGroups.flatMap((g) => g.prompts.slice(0, 1)).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isTyping}
                  onClick={() => sendMessage(q)}
                  className="shrink-0 text-xs px-3 py-2 bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] rounded-[var(--radius-full)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
