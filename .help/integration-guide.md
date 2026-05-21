# Integration Guide: Connecting Your Agent to Synaptic AI

This guide explains how to integrate the Synaptic AI monetization layer into your existing AI agents, chatbots, or Telegram bots using the production B2B endpoint.

---

## 1. The Core Concept

Synaptic AI acts as a "middleware" for your agent. When a user sends a message to your bot:
1. You forward the message to Synaptic.
2. Synaptic checks if the user has "purchase intent" (e.g., they want to buy a phone, order food, or find a service).
3. If a match is found, Synaptic returns a **soft suggestion** and a **tracking link**.
4. You append this suggestion to your agent's response.
5. If the user clicks, you earn commission.

**Crucially:** If no match is found, Synaptic returns `{ match: false }`. Your bot should then continue its conversation normally without showing anything extra. **The user experience remains seamless.**

---

## 2. API Specification

### Endpoint
`POST https://api.synaptic.uz/authorized/send_result`

### Authentication
You must provide your API Key in the headers or the request body.
- **Header:** `X-Synaptic-Key: sk-synaptic-...`
- **Body field:** `api_key: "sk-synaptic-..."`

### Request Body (JSON)
| Field    | Type   | Description                                     |
| -------- | ------ | ----------------------------------------------- |
| `prompt` | string | The user's last message/query.                  |
| `api_key`| string | (Optional if header is used) Your agent API Key. |

### Response (JSON)

**If a match is found:**
```json
{
  "match": true,
  "intent": "electronics",
  "suggestion": "By the way, if you're looking for a new smartphone, Uzum Market has great deals on the latest iPhones right now.",
  "sponsored_line": "Sponsored: Check out iPhones on Uzum Market",
  "tracking_url": "https://api.synaptic.uz/t/xyz123?a=your_username",
  "campaign": {
    "name": "Uzum iPhone Promo",
    "category": "electronics"
  }
}
```

**If NO match is found:**
```json
{ "match": false }
```

---

## 3. Integration Examples

### A. Generic Node.js Chatbot (Express/FastAPI/etc.)

The pattern is: **Call Synaptic → If match, append to response → Return to user.**

```javascript
async function handleUserMessage(userPrompt) {
  // 1. Get your agent's normal response (from GPT-4, Claude, etc.)
  const agentResponse = await myLLM.generate(userPrompt);

  try {
    // 2. Silently check for monetization opportunities
    const synapticRes = await fetch('https://api.synaptic.uz/authorized/send_result', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Synaptic-Key': process.env.SYNAPTIC_API_KEY 
      },
      body: JSON.stringify({ prompt: userPrompt })
    });

    const data = await synapticRes.json();

    // 3. If matched, append the suggestion and tracking link
    if (data.match) {
      return `${agentResponse}\n\n${data.suggestion}\n👉 Learn more: ${data.tracking_url}`;
    }
  } catch (err) {
    console.error("Synaptic integration error:", err);
  }

  // 4. Default: just return the original response
  return agentResponse;
}
```

### B. Telegram Bot (Node.js - Telegraf)

```javascript
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on('text', async (ctx) => {
  const userPrompt = ctx.message.text;

  // Start generating the main response (don't wait for Synaptic yet)
  const aiTask = generateAIResponse(userPrompt);
  
  // Simultaneously check Synaptic
  const synapticTask = fetch('https://api.synaptic.uz/authorized/send_result', {
    method: 'POST',
    headers: { 'X-Synaptic-Key': process.env.SYNAPTIC_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: userPrompt })
  }).then(r => r.json()).catch(() => ({ match: false }));

  // Wait for both
  const [aiResponse, synapticData] = await Promise.all([aiTask, synapticTask]);

  let finalMessage = aiResponse;
  
  if (synapticData.match) {
    // Elegant way to show the "ad" in Telegram
    finalMessage += `\n\n—\n💡 ${synapticData.suggestion}\n[Open Link](${synapticData.tracking_url})`;
  }

  ctx.replyWithMarkdown(finalMessage);
});
```

### C. Telegram Bot (Python - aiogram)

```python
import aiohttp
from aiogram import Bot, Dispatcher, types

async def get_synaptic_suggestion(prompt):
    url = "https://api.synaptic.uz/authorized/send_result"
    headers = {"X-Synaptic-Key": "YOUR_API_KEY"}
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json={"prompt": prompt}, headers=headers) as resp:
                data = await resp.json()
                return data if data.get("match") else None
        except:
            return None

@dp.message_handler()
async def echo(message: types.Message):
    user_prompt = message.text
    
    # Get your bot's answer
    bot_answer = await get_chatgpt_response(user_prompt)
    
    # Check for match
    suggestion = await get_synaptic_suggestion(user_prompt)
    
    if suggestion:
        full_text = f"{bot_answer}\n\nPS: {suggestion['suggestion']}\n{suggestion['tracking_url']}"
        await message.answer(full_text)
    else:
        await message.answer(bot_answer)
```

---

## 4. Best Practices

1.  **Silent Failure:** Always wrap the Synaptic call in a `try/catch`. If the API is slow or down, your bot should still function perfectly.
2.  **Parallel Execution:** Use `Promise.all` (Node) or `asyncio.gather` (Python) to call Synaptic at the same time you call your LLM. This ensures 0ms added latency for the user.
3.  **UI Integration:**
    *   **Telegram:** Use a separator like `—` or `PS:` to distinguish the suggestion from the main response.
    *   **Web Chat:** You can render the suggestion as a "Product Card" if your frontend supports it, using the `campaign.name` and `campaign.category` fields.
4.  **Privacy:** Synaptic only needs the prompt to match intent. We do not require user IDs or personal data.

---

## 5. Getting Your API Key

1.  Register your agent at the [Synaptic Dashboard](https://dashboard.synaptic.uz/register).
2.  Your API Key will be generated immediately.
3.  Start monetizing!
