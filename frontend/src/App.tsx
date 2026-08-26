import { Link, Route, Routes } from "react-router-dom";
import { DetailPage } from "./pages/DetailPage";
import { ListPage } from "./pages/ListPage";
import { NewPage } from "./pages/NewPage";

function UnknownPage() {
  return (
    <section className="panel">
      <p>ページが見つかりません。</p>
      <p>
        <Link to="/">一覧へ</Link>
      </p>
    </section>
  );
}

export default function App() {
  return (
    <main>
      <h1>メモリスト</h1>
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/new" element={<NewPage />} />
        <Route path="/memos/:id" element={<DetailPage />} />
        <Route path="*" element={<UnknownPage />} />
      </Routes>
    </main>
  );
}
