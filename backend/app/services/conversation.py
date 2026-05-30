import hashlib
import json

MAX_HISTORY_TURNS = 16
MAX_CONTENT_LEN = 2000


def normalize_chat_history(messages: list | None, max_turns: int = MAX_HISTORY_TURNS) -> list[dict]:
    if not isinstance(messages, list):
        return []

    out = []
    for m in messages:
        role_raw = m.get("role")
        if role_raw is None:
            sender = m.get("sender")
            if sender == "user":
                role_raw = "user"
            elif sender == "bot":
                role_raw = "assistant"
            else:
                role_raw = sender

        role = str(role_raw or "").lower()
        if role == "bot":
            role = "assistant"
        if role not in ("user", "assistant"):
            continue

        content = str(m.get("content") or m.get("text") or "")
        if "[REKLAMA]:" in content:
            content = content.split("[REKLAMA]:")[0]
        content = content.strip()[:MAX_CONTENT_LEN]
        if not content:
            continue
        out.append({"role": role, "content": content})

    return out[-max_turns:]


def build_matching_prompt(latest_user_prompt: str, messages: list | None) -> str:
    prompt = str(latest_user_prompt or "").strip()
    history = normalize_chat_history(messages)

    if not history:
        return prompt

    prior = [
        m
        for i, m in enumerate(history)
        if not (i == len(history) - 1 and m["role"] == "user" and m["content"] == prompt)
    ]

    lines = [f"{'Foydalanuvchi' if m['role'] == 'user' else 'Yordamchi'}: {m['content']}" for m in prior]
    if prompt:
        lines.append(f"Foydalanuvchi: {prompt}")

    joined = "\n".join(lines).strip()
    return joined or prompt


def history_cache_key(prompt: str, messages: list | None, answer_only: bool = False) -> str:
    payload = json.dumps({"a": answer_only, "p": prompt, "h": normalize_chat_history(messages, 8)}, ensure_ascii=False)
    return hashlib.sha256(payload.encode()).hexdigest()[:24]


MARKDOWN_SYSTEM_HINT = """Javobni Telegram Markdown (parse_mode Markdown) formatida yozing:
- *qalin* va _kursiv_ ishlating
- Ro'yxatlar uchun "-" yoki raqamli punktlar
- Kod uchun `backtick`
- Havolalarni matnga qo'shmang (URL yozmang)
- Qisqa va o'qilishi oson bo'lsin"""
