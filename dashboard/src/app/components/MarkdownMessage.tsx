import ReactMarkdown from 'react-markdown';
import { cn } from './ui/utils';

/** Strip bare URLs but keep Telegram-style Markdown markers. */
export function sanitizeBotMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(?<![(\[])\bhttps?:\/\/\S+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function MarkdownMessage({
  text,
  className,
  inverted,
}: {
  text: string;
  className?: string;
  inverted?: boolean;
}) {
  const content = sanitizeBotMarkdown(text);

  return (
    <div
      className={cn(
        'text-[15px] leading-relaxed break-words markdown-body',
        inverted ? 'text-white [&_a]:text-white/90' : 'text-[var(--color-text)]',
        className
      )}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ children }) => (
            <code
              className={cn(
                'rounded px-1.5 py-0.5 text-sm font-mono',
                inverted ? 'bg-white/15' : 'bg-[var(--color-icon-bg)] text-[var(--color-primary)]'
              )}
            >
              {children}
            </code>
          ),
          a: () => null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
