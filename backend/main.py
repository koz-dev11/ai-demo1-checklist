import os
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from mangum import Mangum
from pydantic import BaseModel, Field, field_validator

app = FastAPI()
handler = Mangum(app, lifespan="off", api_gateway_base_path="prod")

memos: dict[str, dict] = {}


class MemoCreate(BaseModel):
    title: str = Field(min_length=1)
    body: str = ""

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class MemoPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    body: str | None = None
    done: bool | None = None

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _use_memory() -> bool:
    return (not os.environ.get("MEMOS_TABLE")) or bool(os.environ.get("AWS_SAM_LOCAL"))


def _table():
    import boto3

    return boto3.resource("dynamodb").Table(os.environ["MEMOS_TABLE"])


def _from_item(item: dict) -> dict:
    return {
        "id": item["id"],
        "title": item["title"],
        "body": item.get("body") or "",
        "done": bool(item.get("done", False)),
        "createdAt": item["createdAt"],
    }


def _list_memos_store() -> list[dict]:
    if _use_memory():
        return sorted(memos.values(), key=lambda m: m["createdAt"], reverse=True)

    items = _table().scan().get("Items") or []
    items.sort(key=lambda m: m.get("createdAt", ""), reverse=True)
    return [_from_item(item) for item in items]


def _create_memo_store(title: str, body: str) -> dict:
    memo = {
        "id": str(uuid4()),
        "title": title,
        "body": body,
        "done": False,
        "createdAt": _now_iso(),
    }
    if _use_memory():
        memos[memo["id"]] = memo
        return memo

    _table().put_item(Item=memo)
    return memo


def _get_memo_store(memo_id: str) -> dict | None:
    if _use_memory():
        return memos.get(memo_id)

    item = _table().get_item(Key={"id": memo_id}).get("Item")
    if item is None:
        return None
    return _from_item(item)


def _apply_patch(memo: dict, payload: MemoPatch) -> dict:
    if payload.title is not None:
        memo["title"] = payload.title
    if payload.body is not None:
        memo["body"] = payload.body
    if payload.done is not None:
        memo["done"] = payload.done
    return memo


def _patch_memo_store(memo_id: str, payload: MemoPatch) -> dict | None:
    if _use_memory():
        memo = memos.get(memo_id)
        if memo is None:
            return None
        return _apply_patch(memo, payload)

    table = _table()
    item = table.get_item(Key={"id": memo_id}).get("Item")
    if item is None:
        return None
    memo = _apply_patch(_from_item(item), payload)
    table.put_item(Item=memo)
    return memo


def _delete_memo_store(memo_id: str) -> bool:
    if _use_memory():
        if memo_id not in memos:
            return False
        del memos[memo_id]
        return True

    table = _table()
    item = table.get_item(Key={"id": memo_id}).get("Item")
    if item is None:
        return False
    table.delete_item(Key={"id": memo_id})
    return True


@app.get("/api/memos")
def list_memos():
    return _list_memos_store()


@app.post("/api/memos", status_code=201)
def create_memo(payload: MemoCreate):
    return _create_memo_store(payload.title, payload.body)


@app.get("/api/memos/{memo_id}")
def get_memo(memo_id: str):
    memo = _get_memo_store(memo_id)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    return memo


@app.patch("/api/memos/{memo_id}")
def patch_memo(memo_id: str, payload: MemoPatch):
    memo = _patch_memo_store(memo_id, payload)
    if memo is None:
        raise HTTPException(status_code=404, detail="Memo not found")
    return memo


@app.delete("/api/memos/{memo_id}", status_code=204)
def delete_memo(memo_id: str):
    if not _delete_memo_store(memo_id):
        raise HTTPException(status_code=404, detail="Memo not found")
    return None
