from datetime import datetime
from typing import Any

from bson import ObjectId


def oid(value: str | ObjectId | None) -> ObjectId | None:
    if value is None:
        return None
    if isinstance(value, ObjectId):
        return value
    return ObjectId(str(value))


def serialize_doc(doc: dict | None) -> dict | None:
    if not doc:
        return doc
    out: dict[str, Any] = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, list):
            out[k] = [serialize_doc(x) if isinstance(x, dict) else x for x in v]
        elif isinstance(v, dict):
            out[k] = serialize_doc(v)
        else:
            out[k] = v
    if "_id" in out and isinstance(doc.get("_id"), ObjectId):
        out["id"] = out["_id"]
    return out


def serialize_many(docs: list[dict]) -> list[dict]:
    return [serialize_doc(d) for d in docs if d]
