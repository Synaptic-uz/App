import crypto from 'crypto';

const MAX_HISTORY_TURNS = 16;
const MAX_CONTENT_LEN = 2000;

/**
 * Normalize client chat history for LLM + matching.
 * Accepts { role, content } or { sender, text } shapes.
 */
export function normalizeChatHistory(messages, maxTurns = MAX_HISTORY_TURNS) {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((m) => {
      const roleRaw = m.role ?? (m.sender === 'user' ? 'user' : m.sender === 'bot' ? 'assistant' : m.sender);
      let role = String(roleRaw || '').toLowerCase();
      if (role === 'bot') role = 'assistant';
      if (role !== 'user' && role !== 'assistant') return null;

      const content = String(m.content ?? m.text ?? '')
        .replace(/\n+\[REKLAMA\]:[\s\S]*$/i, '')
        .trim()
        .slice(0, MAX_CONTENT_LEN);

      if (!content) return null;
      return { role, content };
    })
    .filter(Boolean)
    .slice(-maxTurns);
}

/** Build a single string for embedding / keyword match using recent turns. */
export function buildMatchingPrompt(latestUserPrompt, messages) {
  const prompt = String(latestUserPrompt || '').trim();
  const history = normalizeChatHistory(messages);

  if (!history.length) return prompt;

  const prior = history.filter(
    (m, i) => !(i === history.length - 1 && m.role === 'user' && m.content === prompt)
  );

  const lines = prior.map((m) => `${m.role === 'user' ? 'Foydalanuvchi' : 'Yordamchi'}: ${m.content}`);
  if (prompt) lines.push(`Foydalanuvchi: ${prompt}`);

  return lines.join('\n').trim() || prompt;
}

export function historyCacheKey(prompt, messages, answerOnly = false) {
  const payload = JSON.stringify({
    a: answerOnly,
    p: prompt,
    h: normalizeChatHistory(messages, 8),
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

export const MARKDOWN_SYSTEM_HINT = `Javobni Telegram Markdown (parse_mode Markdown) formatida yozing:
- *qalin* va _kursiv_ ishlating
- Ro'yxatlar uchun "-" yoki raqamli punktlar
- Kod uchun \`backtick\`
- Havolalarni matnga qo'shmang (URL yozmang)
- Qisqa va o'qilishi oson bo'lsin`;
