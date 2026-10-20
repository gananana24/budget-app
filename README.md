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
| `pnpm lint` | oxlintとoxfmtの検査 |
| `pnpm lint:fix` | oxlintの安全な自動修正とoxfmtで整形 |
| `pnpm format` | oxfmtで整形 |

### サブスクの自動登録をローカルで確認する

サブスクの支出は毎日 00:10（日本時間）に登録します。Cron 設定は UTC の `10 15 * * *` です。定期実行を待たずに確認するときは、開発 DB にマイグレーションを適用した後、別のターミナルで次を実行します。

```bash
pnpm build
pnpm exec wrangler dev --test-scheduled --port 8787
```

起動後に次の URL を呼びます。ローカルで到来済みのサブスクがある場合、開発 DB の通常の支出に登録されます。再度呼んでも同じ発生回は増えません。

```bash
curl 'http://localhost:8787/__scheduled?cron=10+15+*+*+*'
```

処理結果は Worker のログに `subscription_posting` と登録件数として出力されます。アプリを開いていなくても Cron が処理し、停止期間の未処理回は次の実行で補完します。実際の決済確認は行いません。
| `pnpm format:check` | oxfmtの整形検査 |
| `pnpm typecheck` | TypeScriptの型検査 |
| `pnpm build` | プロダクションビルド |
| `pnpm check` | Lint、型検査、テスト、ビルド、Workers dry-run |
| `pnpm preview` | ビルド結果をローカルで確認 |
| `pnpm cf-typegen` | Cloudflare Workersの型定義を生成 |
| `pnpm run deploy` | 本番DBのmigrationを確認・適用してからCloudflare Workersへデプロイ |

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

## 家族向け検証版を workers.dev で公開する

現在の検証版: https://budget-app.yuto-urashima24.workers.dev/

独自ドメインを使わず、Clerk の Development インスタンスと Cloudflare の既定 `*.workers.dev` URL で公開する手順です。Google ログインを含む操作を家族の端末で確認できます。ただし、[Clerk は Development インスタンスを本番用途に適さないと説明しています](https://clerk.com/docs/guides/development/managing-environments)。利用者が２人でも認証環境の性質は変わりません。URL を共有相手にだけ伝えてもアクセス制御にはなりません。長期運用の本番受け入れ条件は、この公開だけでは満たしません。

1. Clerk Dashboard の Development インスタンスで Google ログインを有効にし、不要な認証方法を無効にします。[Access mode の Allowlist](https://clerk.com/docs/guides/secure/restricting-access)には本人と家族の Google メールアドレスを**個別に**追加し、Open モードのまま「Enable allowlist」を有効にして保存します。空の Allowlist を有効にすると全員の新規登録が止まるため、２件が登録済みか確認します。メールアドレスをリポジトリや作業ログへ書かないでください。
2. Neon の対象データベースへの**直接接続**URLを用意します。Cloudflare Dashboard で同じ DB への Hyperdrive を作り、クエリキャッシュを無効にして、その ID を `wrangler.json` の `DATABASE` binding に設定します。migration は手順4の `pnpm run deploy` が適用します。
3. Wrangler の `pnpm exec wrangler whoami` でアカウントを確認します。Git 管理対象外の `.env` に `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` を、`.env.family.secrets` に同じ `CLERK_PUBLISHABLE_KEY=pk_test_...` と対応する `CLERK_SECRET_KEY=sk_test_...` を設定します。後者の権限は `chmod 600 .env.family.secrets` とします。シークレットをソース、`VITE_` 変数、ログへ置かないでください。
4. 下の「DBを含むデプロイ」に従って `.env.deploy.local` を用意し、`pnpm check` の後に `pnpm run deploy` を実行します。初回は`WORKER_SECRETS_FILE=.env.family.secrets pnpm run deploy`でWorkerのsecretも同時に登録します。公開URLで動作を確認します。
5. 下の「公開後の確認」に沿って、両方の端末でログイン、支出・カテゴリー操作、ログアウト、ホーム画面からの起動を確認します。外部サービスの動作と実機表示は自動チェックだけでは保証できません。

以前のスキーマを適用した**未利用の**Neon DBを作り直す場合は、まず利用者・家計・支出・カテゴリーの行がすべて 0 件であることを確認します。データがある DB にはこの手順を使いません。Neon CLI で対象 project・branch・database を確かめてから `neon databases delete <database> --project-id <project> --branch <branch>`、続けて `neon databases create --name <database> --owner-name <owner> --project-id <project> --branch <branch>` を実行し、現行の `db/migrations/` を直接接続 URL で最初から適用します。同じ名前・所有者を使い、Hyperdrive が同じ DB を指していることも確認します。

## 本番環境の準備とデプロイ

このアプリはCloudflare Workersの静的アセットと同一オリジンの`/api`、Clerkの本番インスタンス、Neon PostgreSQL、Cloudflare Hyperdriveを使います。以下は新しい環境で再現する順序です。CloudflareとClerkの本番設定には所有するドメインを使います。

Cloudflare Worker自体は`<worker名>.<アカウントのサブドメイン>.workers.dev`で公開できます。ただし、[Clerkの本番インスタンスには所有するドメインとDNSレコードが必要](https://clerk.com/docs/guides/development/deployment/production)です。`workers.dev`だけを使う場合、この節のClerk本番設定と本番Googleログインの受け入れ条件は完了できません。Clerkの開発インスタンスを使った公開は検証用に限り、家計データを扱う本番運用として扱いません。

1. [Clerkの本番インスタンス](https://clerk.com/docs/guides/development/deployment/production)を作成し、本番ドメインとClerkが示すDNSレコードを設定します。[Google接続](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google)に本番用OAuthクライアントID・シークレットを登録し、Google以外のログイン方式を無効にします。Google側の公開状態と許可済みリダイレクトURIも確認します。Clerk本番の`pk_live_...`と`sk_live_...`を取得します。
2. Neonで本番用PostgreSQLデータベースを用意します。Neonの**直接接続**URLを用意し、下の「DBを含むデプロイ」でmigrationを適用します。`task db:migrate`はローカルDB専用です。
3. Cloudflare DashboardでNeonへのHyperdrive接続を作成し、クエリキャッシュを無効にします。`wrangler.json`の`hyperdrive[0].id`をその接続IDに置き換え、binding名`DATABASE`を維持します。現行のIDは別環境で作られた接続を指すため、新しいCloudflareアカウントではそのまま使えません。HyperdriveにはNeonの接続情報をCloudflare側で登録し、DB接続文字列をソースへ置きません。
4. Cloudflareの対象アカウントへWranglerでログインし、`pnpm exec wrangler whoami`で対象を確認します。Git管理対象外の`.env.production.secrets`を`touch .env.production.secrets && chmod 600 .env.production.secrets`で作成し、`CLERK_PUBLISHABLE_KEY=pk_live_...`と`CLERK_SECRET_KEY=sk_live_...`を保存します。このファイルはWorkerへの登録にだけ使い、Viteのビルドには読み込ませません。`CLERK_SECRET_KEY`を`VITE_`付き変数、`wrangler.json`の`vars`、通常ログへ入れません。
5. ビルド環境にClerk本番の公開キーを`VITE_CLERK_PUBLISHABLE_KEY`として設定します。ローカルからデプロイする場合は、Git管理対象外の`.env.production.local`に`VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`を保存できます。`pnpm check`を実行し、下の「DBを含むデプロイ」でDBとWorkerを更新します。初回は`WORKER_SECRETS_FILE=.env.production.secrets pnpm run deploy`でWorkerのsecretも同時に登録します。`pnpm exec wrangler secret list`で名前を確認し、所有する本番ドメインをWorkerに割り当てます。CIを使う場合も、ビルド時の公開キーとWorkerの2つのsecretをそれぞれの工程へ設定します。

   ```bash
   rg -l 'sk_live_|postgres(ql)?://' dist/client
   ```

### DBを含むデプロイ

Neonの**直接接続**URLをGit管理外の`.env.deploy.local`へ保存します。`wrangler.json`の`DATABASE` Hyperdrive bindingが**同じNeonデータベース**を参照していることをCloudflare Dashboardで確認してください。接続URLはコマンド引数やチャットに貼らないでください。

```bash
cp .env.deploy.local.example .env.deploy.local
chmod 600 .env.deploy.local
# .env.deploy.local の PRODUCTION_DATABASE_URL に直接接続URLを設定
pnpm run deploy
```

`pnpm run deploy`は接続先を検査し、Wranglerログイン確認、ビルド、Worker dry-run、本番DBの未適用migration、migration状態確認、Worker公開の順に実行します。Worker公開前の工程で失敗した場合はWorkerを更新しません。ローカルDB、Neonのpooler、SSL無効のURLは受け付けません。`PRODUCTION_DATABASE_URL`を環境変数で渡すこともできます。ViteのビルドやWorker公開の子プロセスにはDB URLを渡しません。既存DBにのみ適用し、DBの自動作成はしません。

`pnpm deploy`はpnpm自身の別コマンドなので、アプリのデプロイには必ず`pnpm run deploy`を使います。

`pnpm run deploy`は既存Workerのsecretを保持します。初回のsecret登録やキー更新時は、権限600のsecretファイルを`WORKER_SECRETS_FILE`で指定できます。WorkerをロールバックしてもDB migrationは戻りません。migrationは旧Workerでも動く互換性を保って追加し、公開後はログインと主要操作を確認します。`wrangler.json`のHyperdrive IDやドメインを別環境へ合わせて変更した場合は、`pnpm cf-typegen`でbinding型を再生成します。

`wrangler secret put`は即時にWorkerの新しいバージョンをデプロイするため、既存公開環境でキーを変更するときは対象環境と変更タイミングを先に確認してください。

### 公開後の確認

本番URLをiPhoneのSafariとAndroidのChromeで開き、Googleログイン、初期化、今月の合計と一覧、支出の追加・編集・削除、カテゴリー管理、ログアウトを確認します。幅320px、375px、390px、412px相当でも横スクロール、入力時の拡大、下部操作の重なりがないか確認します。Safariの共有メニュー「ホーム画面に追加」とChromeの「アプリをインストール」から起動し、ブラウザのアドレスバーがない単独表示になることを確認します。PWAはオフライン利用を提供しません。

`/manifest.webmanifest`、`/icon-192.png`、`/icon-512.png`、`/apple-touch-icon.png`が本番URLから取得できることも確認します。アイコンを変更した場合は`python3 scripts/generate-pwa-icons.py`でPNGを再生成します。ブラウザに古いアイコンが残る場合は、ホーム画面の追加をやり直します。

### 障害の確認

Cloudflare DashboardのWorker「Observability」でリクエスト、Logs、Tracesを確認します。APIログの`requestId`（レスポンスの`X-Request-Id`と同じ）、`route`、`status`、`durationMs`を使って失敗を追います。想定外エラーは`unhandled_error`としてエラー種別を記録し、本文、認証トークン、DB接続文字列、メモ、例外メッセージは通常ログへ記録しません。Clerkログイン失敗はClerkの本番インスタンスとGoogle OAuth設定、APIの5xxはCloudflareのログとHyperdrive接続、DBエラーはNeonの接続状態とmigration状態を順に確認します。

本番への実際のGoogleログインとデータ操作は、Cloudflare・Clerk・Neonの本番アカウントと端末を使って公開後に確認する必要があります。`pnpm check`とWranglerのdry-runだけでは外部サービスの接続と端末でのホーム画面起動は保証できません。

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
