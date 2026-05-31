from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from app.utils.i18n import set_lang

class I18nMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Detect language from Accept-Language header
        accept_lang = request.headers.get("accept-language", "uz")
        
        # Simple parser for "uz-UZ,uz;q=0.9,en-US;q=0.8,en;q=0.7" -> "uz"
        lang = accept_lang.split(",")[0].split("-")[0].strip().lower()
        
        # Default to "uz" if not supported (you can add more logic here)
        if lang not in ["uz", "en"]:
            lang = "uz"
            
        set_lang(lang)
        
        response = await call_next(request)
        return response
