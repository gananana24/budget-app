# 家計簿アプリ

React、TypeScript、Vite、Hono、Cloudflare Workersで開発する家計簿Webアプリです。
スマートフォンでの利用を中心に、Googleログイン、支出の手入力、月次集計をMVPの対象にします。

## 必要な環境

- Node.js 24以上
- pnpm 10以上
- Docker DesktopまたはColimaなど、Docker Composeを実行できる環境
- 接続先と同じメジャーバージョンのPostgreSQLクライアントツール（スキーマダンプを更新する場合）
- GitHub CLI（Issue開発ワークフローを使う場合）
- Task（Issue開発ワークフローを使う場合）

## セットアップ

依存関係をインストールします。

```bash
pnpm install
```

ブラウザ・ローカルHyperdrive・結合テスト用の環境変数と、Worker用のsecretをそれぞれサンプルから作成します。

```bash
cp .env.example .env
cp .dev.vars.example .dev.vars
```

`.env.example`と`.dev.vars.example`には変数名と用途だけを記載しています。実値はコミットしないでください。

Clerk DashboardのDevelopment環境からPublishable KeyとSecret Keyを取得し、次のように設定します。Google以外の認証方法はClerk Dashboardで無効にしてください。

```dotenv
# .env: Viteがブラウザへ公開する値
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# .dev.vars: Workerだけが読む値
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

`CLERK_SECRET_KEY`を`VITE_`で始まる変数へ設定しないでください。`VITE_`の値はブラウザへ組み込まれます。

ローカルDBはDocker上のPostgreSQLを使います。`wrangler.json`の`localConnectionString`は開発DBを`budget_app_dev`へ向け、`.env.example`の`TEST_DATABASE_URL`は結合テストDBを`budget_app_test`へ向けています。既存のローカルPostgreSQLと衝突しないよう、ホスト側ではポート`54322`を使用します。

## 開発

DBの起動とmigrationを行ってから開発サーバーを起動します。

```bash
task dev
```

ブラウザで <http://localhost:5173> を開きます。

主なコマンドは次のとおりです。

| コマンド | 用途 |
| --- | --- |
| `task db:start` | ローカルPostgreSQLを起動 |
| `task db:stop` | データを残してローカルPostgreSQLを停止 |
| `task db:reset` | 開発・テストDBを作り直してmigrationを適用（保存データを削除） |
| `task db:migrate` | 開発DBへmigrationを適用 |
| `task db:migrate:test` | テストDBへmigrationを適用 |
| `task db:status` | 開発DBのmigration状態を確認 |
| `task db:dump` | 開発DBから`db/schema.sql`を再生成 |
| `task dev` | DB起動・migration・開発サーバー起動を順に実行 |
| `pnpm dev` | 開発サーバーを起動 |
| `pnpm test` | テストを一度実行 |
| `pnpm test:watch` | テストを監視モードで実行 |
| `pnpm lint` | BiomeのLint・フォーマット検査 |
| `pnpm lint:fix` | Biomeで自動修正 |
| `pnpm typecheck` | TypeScriptの型検査 |
| `pnpm build` | プロダクションビルド |
| `pnpm check` | Lint、型検査、テスト、ビルド、Workers dry-run |
| `pnpm preview` | ビルド結果をローカルで確認 |
| `pnpm cf-typegen` | Cloudflare Workersの型定義を生成 |
| `pnpm deploy` | Cloudflare Workersへデプロイ |

## データベース

マイグレーションはdbmate、ローカルDB操作はTaskで管理します。Taskはリポジトリの`.env`にある別接続先を読まず、Dockerの開発DBを明示的に使用します。

適用状態を確認します。

```bash
task db:status
```

未適用のマイグレーションを適用します。

```bash
task db:migrate
```

開発・テストDBを空から作り直す場合は次を実行します。保存データとDocker volumeが削除されるため、必要な場合だけ使ってください。

```bash
task db:reset
```

`--no-dump-schema`は、マイグレーション後の自動ダンプを無効にします。`db/schema.sql`を更新するときは、接続先と同じメジャーバージョンの`pg_dump`を用意して次を実行します。

```bash
task db:dump
```

マイグレーションは開発時またはデプロイ工程で明示的に実行します。Cloudflare Workerの起動時やリクエスト処理中には実行しません。

本番Workerは`DATABASE` Hyperdrive bindingを通してNeonへ接続します。Hyperdriveのクエリキャッシュは無効にし、書き込み直後の認可・家計データを常にDBから取得します。ローカルでは`wrangler.json`の`localConnectionString`が同じbindingをDocker PostgreSQLへ向けます。別の接続先を一時的に使う場合は、公式の`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_DATABASE`環境変数で上書きできます。

## デプロイ

Cloudflareへデプロイする前に、品質チェックを実行します。

```bash
pnpm check
pnpm deploy
```

Cloudflareには`CLERK_PUBLISHABLE_KEY`と`CLERK_SECRET_KEY`をSecretsとして登録し、作成済みのHyperdriveを`DATABASE` bindingへ設定します。`VITE_CLERK_PUBLISHABLE_KEY`はフロントエンドのビルド環境へ設定します。
秘密値をソースコードや`.env.example`へ書き込まないでください。

## Issue開発ワークフロー

Issueごとに`issue/<number>`ブランチを作成して開発します。
以下のコマンドには、認証済みのGitHub CLIとTaskが必要です。

Issueを開始します。番号を省略すると対話形式で入力できます。

```bash
task start:issue
task start:issue -- 1
```

実装後、チェック・push・Draft PR作成を行います。

```bash
task create:pr
```

レビュー可能になったら、チェック・Ready化・squash auto-merge設定を行います。

```bash
task ready:pr
```

PRマージ後にmainを更新し、ローカルブランチを削除します。

```bash
task clean:issue -- 1
```

## ドキュメント

- [MVP要件](docs/mvp-spec.md)
- [バックエンド設計](docs/backend-architecture.md)
- [技術構成](docs/tech-stack.md)
- [プログラミング思想](docs/programming-philosophy.md)
- [テスト戦略](docs/testing-strategy.md)
- [MVP開発計画](docs/development-plan.md)
