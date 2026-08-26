import { FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createMemo } from "../api";

export function NewPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    if (!title.trim()) {
      setError("タイトルは必須です。");
      return;
    }
    setError("");
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await createMemo(title.trim(), body);
      navigate("/");
    } catch {
      setError("追加に失敗しました。backend が起動しているか確認してください。");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <p>
        <Link to="/">一覧へ</Link>
      </p>
      <form onSubmit={onSubmit}>
        <p>
          <label>
            タイトル（必須）
            <br />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
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
            />
          </label>
        </p>
        {error ? <p className="error">{error}</p> : null}
        <p className="actions">
          <button type="submit" disabled={submitting}>
            追加
          </button>
        </p>
      </form>
    </section>
  );
}
