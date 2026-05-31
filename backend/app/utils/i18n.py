import json
import logging
from contextvars import ContextVar
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Context variable to store the current language for the request
_current_lang: ContextVar[str] = ContextVar("current_lang", default="uz")

LOCALES_DIR = Path(__file__).parent.parent / "locales"
_translations: dict[str, dict[str, str]] = {}

def load_translations():
    """Load all JSON files from the locales directory."""
    if not LOCALES_DIR.exists():
        logger.warning(f"Locales directory not found: {LOCALES_DIR}")
        return

    for file_path in LOCALES_DIR.glob("*.json"):
        lang = file_path.stem
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                _translations[lang] = json.load(f)
            logger.info(f"Loaded translations for: {lang}")
        except Exception as e:
            logger.error(f"Failed to load translations for {lang}: {e}")

def set_lang(lang: str):
    """Set the current language for the context."""
    _current_lang.set(lang)

def get_lang() -> str:
    """Get the current language from the context."""
    return _current_lang.get()

def t(key: str, default: str | None = None, **kwargs: Any) -> str:
    """
    Translate a key into the current language.
    If key is not found, returns the default value or the key itself.
    Supports placeholders like {name}.
    """
    lang = get_lang()
    
    # Fallback order: current_lang -> "en" -> key/default
    translations = _translations.get(lang) or _translations.get("en") or {}
    
    message = translations.get(key)
    if message is None:
        return default if default is not None else key
    
    try:
        return message.format(**kwargs)
    except KeyError as e:
        logger.warning(f"Missing placeholder {e} in translation for key '{key}' in lang '{lang}'")
        return message

# Initial load
load_translations()
