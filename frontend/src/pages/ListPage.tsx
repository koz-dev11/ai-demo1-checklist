import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listMemos, patchMemoDone, type Memo } from "../api";

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ListPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const togglingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    listMemos()
      .then((data) => {
        setMemos(data);
        setError("");
      })
      .catch(() => setError("一覧の取得に失敗しました。backend が起動しているか確認してください。"))
      .finally(() => setLoading(false));
  }, []);

  async function onToggle(memo: Memo) {
    if (togglingRef.current.has(memo.id)) {
      return;
    }
    togglingRef.current.add(memo.id);
    setTogglingIds(new Set(togglingRef.current));
    setError("");
    try {
      const updated = await patchMemoDone(memo.id, !memo.done);
      setMemos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError("完了フラグの更新に失敗しました。");
    } finally {
      togglingRef.current.delete(memo.id);
      setTogglingIds(new Set(togglingRef.current));
    }
  }

  return (
    <section>
      <p className="toolbar">
        <Link className="button" to="/new">
          追加
        </Link>
      </p>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>読み込み中</p> : null}
      {!loading && memos.length === 0 && !error ? <p className="empty">メモはまだありません。</p> : null}
      {memos.length > 0 ? (
        <ul className="memo-list">
          {memos.map((memo) => (
            <li key={memo.id} className={memo.done ? "memo-card done" : "memo-card"}>
              <input
                type="checkbox"
                checked={memo.done}
                disabled={togglingIds.has(memo.id)}
                onClick={(event) => event.stopPropagation()}
                onChange={() => onToggle(memo)}
                aria-label={`${memo.title} を完了`}
              />
              <div>
                <div className="memo-title">{memo.title}</div>
                <div className="created-at">{formatCreatedAt(memo.createdAt)}</div>
              </div>
              <Link className="memo-card-hit" to={`/memos/${memo.id}`} aria-label={`${memo.title}の詳細`}>
                {memo.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
