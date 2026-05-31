from typing import Any, Generic, TypeVar, Union
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from pydantic import BaseModel

T = TypeVar("T")

class AppResponseDict(BaseModel, Generic[T]):
    status: bool
    status_code: Union[int, str]
    message: str | None = None
    data: T | None = None

class AppResponse:
    @staticmethod
    def success(
        data: Any = None,
        message: str | None = None,
        status_code: Union[int, str] = "ok",
        http_status: int = 200
    ) -> JSONResponse:
        return JSONResponse(
            content=jsonable_encoder({
                "status": True,
                "status_code": status_code,
                "message": message,
                "data": data,
            }, custom_encoder={ObjectId: str}),
            status_code=http_status,
        )

    @staticmethod
    def error(
        message: str | None = None,
        status_code: Union[int, str] = "error",
        http_status: int = 400,
        data: Any = None
    ) -> JSONResponse:
        return JSONResponse(
            content=jsonable_encoder({
                "status": False,
                "status_code": status_code,
                "message": message,
                "data": data,
            }, custom_encoder={ObjectId: str}),
            status_code=http_status,
        )

class AppException(Exception):
    def __init__(self, status_code: Union[int, str] = "error", message: str | None = None, http_status: int = 400, data: Any = None):
        self.status_code = status_code
        self.message = message
        self.http_status = http_status
        self.data = data
        super().__init__(message or str(status_code))
