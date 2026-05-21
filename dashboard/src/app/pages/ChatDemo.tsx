import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { api } from '../../lib/api';

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

/** Remove raw URLs from visible chat text — links live on the button only. */
function maskVisibleUrls(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const FALLBACK_ANSWER =
  "Savolingiz bo'yicha yordam bera olaman. Biroz batafsil yozsangiz, aniqroq javob beraman.";

function buildBotMessage(
  answer: string,
  sponsored?: { suggestion: string; tracking_url?: string; cta_label?: string }
) {
  const cleanAnswer = maskVisibleUrls(answer);
  if (!sponsored?.suggestion) {
    return { text: cleanAnswer };
  }
  const label = sponsored.cta_label || 'Batafsil';
  return {
    text: `${cleanAnswer}\n\n\n[SPONSORED]: ${sponsored.suggestion}`,
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
      text: 'Assalomu alaykum! Sizga qanday yordam bera olaman?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // 1. Bot's own answer (always) — via enrich
      let answer = FALLBACK_ANSWER;
      try {
        const enrich = await api.enrich(userMsg.text, { answerOnly: true });
        if (enrich?.text) answer = maskVisibleUrls(enrich.text);
      } catch {
        // Keep fallback answer; never show error-style text to the user
      }

      // 2. Sponsored slot (optional) — via B2B API; match:false means append nothing
      let sponsored: { suggestion: string; tracking_url?: string; cta_label?: string } | undefined;
      try {
        const synaptic = await api.sendResult(userMsg.text, 'sk-synaptic-demo');
        if (synaptic?.match && synaptic.suggestion) {
          sponsored = {
            suggestion: synaptic.suggestion,
            tracking_url: synaptic.tracking_url,
            cta_label: synaptic.cta_label || synaptic.campaign?.link_text,
          };
        }
      } catch {
        // Sponsored lookup failed — still show the bot answer only
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="size-full bg-[#e4ecef] overflow-hidden flex flex-col items-center">
      <div className="w-full max-w-2xl h-full bg-white shadow-xl flex flex-col">
        <div className="bg-[#17212b] px-4 py-3 flex items-center gap-4 text-white shrink-0">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-tight">Synaptic Demo Bot</h2>
            <p className="text-[#7f91a4] text-sm">bot</p>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 bg-[#0e1621] space-y-4"
          style={{
            backgroundImage: "url('https://web.telegram.org/a/chat-bg-pattern-dark.png')",
            backgroundBlendMode: 'overlay',
            backgroundColor: '#0e1621',
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.sender === 'user'
                    ? 'bg-[#2b5278] text-white rounded-br-none'
                    : 'bg-[#182533] text-white rounded-bl-none'
                }`}
              >
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                {msg.sender === 'bot' && msg.ad?.match && msg.ad.tracking_url && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <a
                      href={msg.ad.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center w-full bg-[#17212b] hover:bg-[#2b5278] border border-[#2b5278] transition-colors rounded-lg py-2.5 text-sm font-medium text-[#5eb5f7]"
                    >
                      {msg.ad.cta_label || "Batafsil ma'lumot"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex w-full justify-start">
              <div className="bg-[#182533] text-white rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                <div className="w-2 h-2 bg-[#7f91a4] rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-[#7f91a4] rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 bg-[#7f91a4] rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-[#17212b] p-4 shrink-0">
          <div className="flex items-end gap-2 bg-[#242f3d] rounded-xl px-4 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Write a message..."
              className="flex-1 bg-transparent text-white outline-none resize-none max-h-32 py-2 text-[15px] placeholder:text-[#7f91a4]"
              rows={1}
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="p-2 text-[#5eb5f7] hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setInput('iPhone 15 narxlari qancha?')}
              className="shrink-0 text-xs px-3 py-1.5 bg-[#242f3d] text-white/80 rounded-full hover:bg-[#2b5278] transition-colors border border-white/5"
            >
              iPhone 15 narxlari?
            </button>
            <button
              onClick={() => setInput('Kofe ichmoqchi edim')}
              className="shrink-0 text-xs px-3 py-1.5 bg-[#242f3d] text-white/80 rounded-full hover:bg-[#2b5278] transition-colors border border-white/5"
            >
              Kofe ichmoqchi edim
            </button>
            <button
              onClick={() => setInput('Sayohatga qayerga borsam boladi?')}
              className="shrink-0 text-xs px-3 py-1.5 bg-[#242f3d] text-white/80 rounded-full hover:bg-[#2b5278] transition-colors border border-white/5"
            >
              Sayohat qilish
            </button>
            <button
              onClick={() => setInput('Noutbuklar qanaqa?')}
              className="shrink-0 text-xs px-3 py-1.5 bg-[#242f3d] text-white/80 rounded-full hover:bg-[#2b5278] transition-colors border border-white/5"
            >
              Noutbuk so'rash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
