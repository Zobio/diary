# diary — プロジェクトメモ

## 概要
- 日報（日記）を公開する静的サイト。URL: https://zobio.github.io/diary/
- リポジトリ: `Zobio/diary`（public）。既存のユーザーサイト `zobio.github.io`（別リポジトリ、素のHTML）には手を付けない。
- 技術: Astro（minimalテンプレートから構築）+ TypeScript strict。GitHub Actions でビルドし GitHub Pages に配置。

## オーナーの方針（重要）
- サイトの中身は全て自分で把握したい。依存やコードは最小限にし、追加したものは何をしているか説明すること。
- React / TypeScript は読める。
- 普段はメモ帳で日記を書いている。書き方はほぼ変えず、月1回メモ帳の内容を貼り付けて push するだけで反映される運用を崩さないこと。

## コンテンツの仕組み
- 元データ: `src/diary/YYYY-MM.txt`（メモ帳の生テキストをそのまま貼る）。ファイル名の先頭4桁が年。
- テキストの書式ルール:
  - 日付は `11/6` のように1行で書く
  - 節は空行で区切る。節の1行目が見出し、残りが本文
  - 節の途中に空行は入れない
  - 最初の日付より前の行は無視される。U+FFFC（画像の跡）は除去される
  - 12月→1月のように月が戻ったら年を自動で繰り上げる
- `src/lib/parseDiary.ts`: テキスト → `Section[]`（`{ date: 'YYYY-MM-DD', title, body }`）。行ごとの状態遷移で分解する。
- `src/pages/index.astro`: `import.meta.glob('../diary/*.txt', { query: '?raw', import: 'default', eager: true })` で全ファイルを読み、日付ごとにまとめて降順に表示する。
  - 本文中のURLは自動リンク化する。日本語が直後に続いても誤検出しないよう、URLの正規表現はASCII記号のみ（括弧は含めない）:
    `/(https?:\/\/[A-Za-z0-9\-._~:/?#\[\]@!$&'*+,;=%]+)/`

## デプロイ
- `.github/workflows/deploy.yml`: main への push で `withastro/action@v3`（`node-version: 24`。Astro が Node >=22.23.4 を要求するため）→ `actions/deploy-pages@v4`。
- Settings → Pages の Source は「GitHub Actions」。

## 制約・注意
- 静的サイトなので、処理は「ビルド時（Node）」か「閲覧時（ブラウザJS）」のどちらかに置く。
- APIキーなどの秘密情報はブラウザ側に絶対に置かない。必要なら Actions の Secrets から、ビルド時にだけ使う。
- `astro.config.mjs` は `site: 'https://zobio.github.io'`, `base: '/diary'`。サイト内リンクや画像は `import.meta.env.BASE_URL` を付ける（付けないと本番だけリンク切れになる）。画像は `public/` に置く。
- push 前に `npm run build && npm run preview` で本番相当の確認をする。
- 公開リポジトリなので、原文とGitの履歴も誰でも見られる。

## ロードマップ（未実装）
1. LLMによるカテゴリ分類
   - ビルド時に GitHub Actions のステップで実行する（APIキーは Secrets）。
   - 日単位ではなく節単位で、固定のカテゴリリストから主カテゴリを1つだけ選ばせる（構造化出力）。
   - 本文のハッシュをキーにした結果キャッシュ（例: `categories.json`）をリポジトリに保存し、変更・追加された節だけ再分類する。手動上書きもできるようにする。
2. 絞り込みUI（React Island, `client:load`）
   - アイデア段階: 除外したいカテゴリをチェックボックスで選ぶ方式。デフォルトは全表示。想定ユースケースは、プログラミングを知らない同級生が「プログラミング関連」にチェックを入れて非表示にする。
   - 日付範囲指定（プリセット＋開始日・終了日）。
   - 節単位でフィルタし、全節が消えた日は日付ごと非表示にする。
   - 状態をURLパラメータと同期する（リンク共有で同じ設定を再現できる）。前回の設定は localStorage に保存（try/catch で囲む）。
3. 見た目のリッチ化: Spotify / YouTube のURLを埋め込みプレーヤーに変換する（ビルド時）など。
4. 将来の案: 日ごとの個別ページ（`src/pages/[date].astro` + `getStaticPaths`）、スマホから更新できる自作PWAエディタ（GitHub API でコミット）。
