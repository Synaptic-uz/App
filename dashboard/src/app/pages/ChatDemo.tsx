import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot } from 'lucide-react';
import { api } from '../../lib/api';
import { uz } from '../../lib/uz';

type Message = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  ad?: {
    match: boolean;
    suggestion?: string;
    tracking_url?: string;
    cta_label?: string;
  };
};

const MAX_INPUT_HEIGHT = 120;

/** Remove raw URLs from visible chat text — links live on the button only. */
function maskVisibleUrls(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const FALLBACK_ANSWER = uz.chat.fallback;

function buildBotMessage(
  answer: string,
  sponsored?: { suggestion: string; tracking_url?: string; cta_label?: string }
) {
  const cleanAnswer = maskVisibleUrls(answer);
  if (!sponsored?.suggestion) {
    return { text: cleanAnswer };
  }
  const label = sponsored.cta_label || uz.chat.details;
  return {
    text: `${cleanAnswer}\n\n\n${uz.chat.sponsored}: ${sponsored.suggestion}`,
    ad: {
      match: true,
      suggestion: sponsored.suggestion,
      tracking_url: sponsored.tracking_url,
      cta_label: label,
    },
  };
}

export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: uz.chat.greeting,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsTyping(true);

    try {
      let answer = FALLBACK_ANSWER;
      try {
        const enrich = await api.enrich(userMsg.text, { answerOnly: true });
        if (enrich?.text) answer = maskVisibleUrls(enrich.text);
      } catch {
        /* keep fallback */
      }

      let sponsored: { suggestion: string; tracking_url?: string; cta_label?: string } | undefined;
      try {
        const synaptic = await api.sendResult(userMsg.text, 'sk-synaptic-demo');
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
          };
        }
      } catch {
        /* sponsored optional */
      }

      const { text, ad } = buildBotMessage(answer, sponsored);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text,
          ad,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    'iPhone 15 narxlari qancha?',
    'Noutbuk sotib olmoqchiman',
    'Kofe ichmoqchi edim',
    'Muddatli tolov bilan xarid',
    'Kiyim-kechak qayerdan olsam boladi?',
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full h-full bg-[#f0f2f5]">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-black/10 px-5 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 bg-[#3390ec] rounded-full flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-base text-black leading-tight">{uz.chat.botName}</h2>
          <p className="text-black/45 text-sm">{isTyping ? uz.chat.typing : uz.chat.online}</p>
        </div>
      </div>

      {/* Messages — fixed height region, scroll inside */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 bg-[#f0f2f5]"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[min(85%,520px)] rounded-2xl px-4 py-2.5 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-[#3390ec] text-white rounded-br-md'
                  : 'bg-white text-black border border-black/5 rounded-bl-md'
              }`}
            >
              <div
                className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                  msg.sender === 'user' ? 'text-white' : 'text-black/90'
                }`}
              >
                {msg.text}
              </div>

              {msg.sender === 'bot' && msg.ad?.match && msg.ad.tracking_url && (
                <div className="mt-3 pt-3 border-t border-black/10">
                  <a
                    href={msg.ad.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center w-full bg-[#3390ec] hover:bg-[#2b7fd4] transition-colors rounded-lg py-2.5 text-sm font-medium text-white"
                  >
                    {msg.ad.cta_label || uz.chat.details}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex w-full justify-start">
            <div className="bg-white border border-black/5 text-black/70 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1 shadow-sm">
              <div className="w-2 h-2 bg-black/30 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-black/30 rounded-full animate-bounce"
                style={{ animationDelay: '0.15s' }}
              />
              <div
                className="w-2 h-2 bg-black/30 rounded-full animate-bounce"
                style={{ animationDelay: '0.3s' }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
      </div>

      {/* Input — pinned bottom, does not grow the page */}
      <div className="shrink-0 bg-white border-t border-black/10 px-4 py-3">
        <div className="flex items-end gap-2 max-w-4xl mx-auto w-full">
          <div className="flex-1 flex items-end gap-2 bg-[#f0f2f5] rounded-2xl px-3 py-1.5 border border-black/5 min-h-[44px]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={uz.chat.placeholder}
              rows={1}
              className="flex-1 bg-transparent text-black outline-none resize-none overflow-y-auto text-[15px] leading-[22px] py-2 placeholder:text-black/40 max-h-[120px]"
              style={{ minHeight: '22px' }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="shrink-0 p-2 text-[#3390ec] hover:bg-black/5 rounded-full transition-colors disabled:opacity-40 mb-0.5"
              aria-label={uz.chat.send}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5 max-w-4xl mx-auto w-full scrollbar-hide">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="shrink-0 text-xs px-3 py-1.5 bg-white text-black/70 rounded-full hover:bg-[#3390ec]/10 hover:text-[#3390ec] transition-colors border border-black/10"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
