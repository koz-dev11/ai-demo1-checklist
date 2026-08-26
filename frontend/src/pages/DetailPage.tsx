import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteMemo, getMemo, patchMemo, patchMemoDone, type Memo } from "../api";

export function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const savingRef = useRef(false);

  useEffect(() => {
    setError("");
    setEditing(false);
    if (!id) {
      setMemo(null);
      setError("メモが見つかりません。");
      return;
    }
    getMemo(id)
      .then((data) => {
        setMemo(data);
        setError("");
      })
      .catch((err: Error) => {
        setMemo(null);
        setError(err.message.startsWith("404") ? "メモが見つかりません。" : "詳細の取得に失敗しました。");
      });
  }, [id]);

  function startEdit() {
    if (!memo || savingRef.current) {
      return;
    }
    setTitle(memo.title);
    setBody(memo.body);
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    if (savingRef.current) {
      return;
    }
    setEditing(false);
    setError("");
  }

  async function onToggle() {
    if (!memo || editing || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const updated = await patchMemoDone(memo.id, !memo.done);
      setMemo(updated);
      setError("");
    } catch {
      setError("完了フラグの更新に失敗しました。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!memo || savingRef.current) {
      return;
    }
    if (!title.trim()) {
      setError("タイトルは必須です。");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const updated = await patchMemo(memo.id, { title: title.trim(), body });
      setMemo(updated);
      setEditing(false);
      setError("");
    } catch {
      setError("保存に失敗しました。");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!memo || editing || savingRef.current) {
      return;
    }
    if (!window.confirm("このメモを削除しますか？")) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await deleteMemo(memo.id);
      navigate("/");
    } catch {
      setError("削除に失敗しました。");
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <p>
        <Link to="/">一覧へ</Link>
      </p>
      {error ? <p className="error">{error}</p> : null}
      {memo ? (
        editing ? (
          <form onSubmit={onSave}>
            <p>
              <label>
                タイトル（必須）
                <br />
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  disabled={saving}
                />
              </label>
            </p>
            <p>
              <label>
                本文（任意）
                <br />
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={6}
                  disabled={saving}
                />
              </label>
            </p>
            <p className="actions">
              <button type="submit" disabled={saving}>
                保存
              </button>
              <button type="button" className="secondary" onClick={cancelEdit} disabled={saving}>
                キャンセル
              </button>
            </p>
          </form>
        ) : (
          <>
            <h2>{memo.title}</h2>
            <p>
              <button
                type="button"
                className={memo.done ? "status-pill done" : "status-pill"}
                aria-pressed={memo.done}
                disabled={saving}
                onClick={onToggle}
              >
                {memo.done ? "完了" : "未完了"}
              </button>
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{memo.body || "（本文なし）"}</p>
            <p className="actions">
              <button type="button" onClick={startEdit} disabled={saving}>
                編集
              </button>
              <button type="button" className="secondary" onClick={onDelete} disabled={saving}>
                削除
              </button>
            </p>
          </>
        )
      ) : null}
    </section>
  );
}
