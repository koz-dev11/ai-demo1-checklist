export type Memo = {
  id: string;
  title: string;
  body: string;
  done: boolean;
  createdAt: string;
};

const API_BASE = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function listMemos(): Promise<Memo[]> {
  return fetch(apiUrl("/api/memos")).then((res) => parseJson<Memo[]>(res));
}

export function getMemo(id: string): Promise<Memo> {
  return fetch(apiUrl(`/api/memos/${id}`)).then((res) => parseJson<Memo>(res));
}

export function createMemo(title: string, body: string): Promise<Memo> {
  return fetch(apiUrl("/api/memos"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  }).then((res) => parseJson<Memo>(res));
}

export type MemoPatch = {
  title?: string;
  body?: string;
  done?: boolean;
};

export function patchMemo(id: string, payload: MemoPatch): Promise<Memo> {
  return fetch(apiUrl(`/api/memos/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => parseJson<Memo>(res));
}

export function patchMemoDone(id: string, done: boolean): Promise<Memo> {
  return patchMemo(id, { done });
}

export async function deleteMemo(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/memos/${id}`), { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
}
