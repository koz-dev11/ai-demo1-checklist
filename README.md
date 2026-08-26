# ai-demo1-checklist

AI利用開発の練習実績。チェック付きメモリスト（チケット管理の簡易版）。
認証なしの公開ボード。個人情報・業務データは入れない。

## 成功条件

メモの追加・一覧・詳細・編集・完了フラグ切替ができ、再読み込み後も CloudFront 配下でデータが残る。

## やらないこと

ログイン、管理者機能、モバイルアプリ、検索、ソフト削除、一覧からの削除、タグ、添付、リアルタイム同期。

## 構成

フロント: React ＋ TypeScript（ビルド成果を S3 + CloudFront）
API: Python on AWS Lambda
入口: API Gateway (HTTP API)
データ: Amazon DynamoDB（使う場合）
インフラ定義: AWS SAM (template.yaml)

## デプロイ

Cursor の Serverless MCP で sam build / deploy を実行
構成の確認と承認は自分で実施

## 動いているURL

フロント: https://d23o394el9vqa2.cloudfront.net
API: https://9hx4xcsdc7.execute-api.ap-northeast-1.amazonaws.com/prod

## 画面 / API

| パス | 内容 |
|------|------|
| `/` | 一覧（カード：完了、タイトル＋作成日時。カードで詳細へ） |
| `/new` | 新規（タイトル必須、本文任意） |
| `/memos/:id` | 詳細（本文、編集、完了ピル、削除） |

| メソッド | パス | 用途 |
|----------|------|------|
| GET | `/api/memos` | 一覧 |
| POST | `/api/memos` | 追加 |
| GET | `/api/memos/{id}` | 詳細 |
| PATCH | `/api/memos/{id}` | 部分更新（title / body / done） |
| DELETE | `/api/memos/{id}` | ハード削除（204 / 404） |

メモの項目: `id`（UUID）, `title`, `body`, `done`, `createdAt`。  
DynamoDB テーブル `Memos`、PK は `id`。一覧は Scan、件数は少ない前提。

## 進捗

ローカルは FastAPI + React。本番は SAM デプロイ済み（CloudFront が SPA、API は execute-api の別 URL、データは DynamoDB）。本番 API URL は `frontend/.env.production` の `VITE_API_URL`（git 対象外）。

### 実装済み

- `backend/` … FastAPI の 5 API（一覧・追加・詳細・部分更新・ハード削除）。`MEMOS_TABLE` があるときは DynamoDB（PK `id`、Scan、`createdAt` 降順）、無いとき（および `AWS_SAM_LOCAL`）はメモリ dict。Lambda は `main.handler`（Mangum、`lifespan=off`、base path `prod`）。CORS は FastAPI ではなく API Gateway 側。デプロイ後に `…/prod/api/memos` が 404 なら、まずこの prefix を疑う
- `frontend/` … 3 画面（`/` `/new` `/memos/:id`）。詳細の閲覧モードから削除（confirm 後に一覧へ）。ローカルは `VITE_API_URL` なしで相対パス `/api/memos`（Vite が `http://127.0.0.1:8000` にプロキシ）。本番ビルドは `frontend/.env.production` の `VITE_API_URL`＝SAM Output の `ApiUrl`（`/prod` は落とさない）
- ブラウザで追加 → 一覧 → 詳細 → 編集 → 完了切替 → 削除ができる。ローカルは backend 起動中ならフロント再読み込み後も残る（メモリ。backend 再起動で消える）。本番は CloudFront 再読み込み後も DynamoDB に残る
- 詳細のエラー残留解消、一覧の読み込み中表示、新規の二重投稿防止、未知 URL、完了トグル連打防止、POST/PATCH title の strip（空白のみは 422）
- 一覧はカード形式。画面は中央寄せ。ソフトなミント系の見た目

### 未着手

- 認証、検索、ソフト削除、一覧からの削除

## リポジトリ

`frontend/`（React）、`backend/`（FastAPI）、`template.yaml`（SAM）。`frontend/.env.example` はリポジトリに含む。`frontend/.env.production` は git 対象外。

### バックエンドのローカル起動

Docker は不要。Python 3 があれば動く。PowerShell では `Activate.ps1` を使わず、venv の `python.exe` を直接指定する。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

API は http://127.0.0.1:8000 で起動する。ローカルは `MEMOS_TABLE` 無しのためメモリ上に保持し、再起動すると消える。本番の DynamoDB とは別。

8000 番が使用中で `WinError 10013` になるときは、別ポートにする。

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001
```

この場合の URL は http://127.0.0.1:8001 。フロントと併用するときは Vite のプロキシ先が 8000 なので、backend は 8000 で起動する。

### フロントエンドのローカル起動

Node.js が必要（Vite 7 は 20.19+ または 22.12+）。先に backend を 8000 番で起動する。ローカルは `VITE_API_URL` を空のまま（`.env` に本番 URL を書かない）。相対パス `/api/memos` を Vite が `http://127.0.0.1:8000` へプロキシする（CORS は使わない）。本番ビルドは `frontend/.env.production` に SAM Output の `ApiUrl` を書く（末尾スラッシュなし、`/prod` は残す。形は `https://xxxx.execute-api.ap-northeast-1.amazonaws.com/prod`）。`VITE_API_URL` に入れるのは `ApiUrl`。`MemosEndpoint` は使わない。`VITE_API_URL` はビルド時に JS へ埋め込まれる。デプロイ後に S3 上のファイルを書き換えても変わらない。API URL を変えるときは `.env.production` を直して `npm run build` し直す。

```powershell
cd frontend
npm install
npm run dev
```

ブラウザで http://127.0.0.1:5173 を開く。追加・一覧・詳細・編集・完了切替はフロントから操作する。backend が起動中なら、フロントを再読み込みしてもデータは残る。

本番フロントの載せ直し: `frontend/.env.production` に SAM Output の `ApiUrl`（`…/prod`）を書き、`npm run build` する。`dist` を SAM Output の `FrontendBucketName` へ同期し、CloudFront を `/*` で無効化する。
