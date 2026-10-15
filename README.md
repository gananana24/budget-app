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
| `pnpm format:check` | oxfmtの整形検査 |
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

## 家族向け検証版を workers.dev で公開する

現在の検証版: https://budget-app.yuto-urashima24.workers.dev/

独自ドメインを使わず、Clerk の Development インスタンスと Cloudflare の既定 `*.workers.dev` URL で公開する手順です。Google ログインを含む操作を家族の端末で確認できます。ただし、[Clerk は Development インスタンスを本番用途に適さないと説明しています](https://clerk.com/docs/guides/development/managing-environments)。利用者が２人でも認証環境の性質は変わりません。URL を共有相手にだけ伝えてもアクセス制御にはなりません。長期運用の本番受け入れ条件は、この公開だけでは満たしません。

1. Clerk Dashboard の Development インスタンスで Google ログインを有効にし、不要な認証方法を無効にします。[Access mode の Allowlist](https://clerk.com/docs/guides/secure/restricting-access)には本人と家族の Google メールアドレスを**個別に**追加し、Open モードのまま「Enable allowlist」を有効にして保存します。空の Allowlist を有効にすると全員の新規登録が止まるため、２件が登録済みか確認します。メールアドレスをリポジトリや作業ログへ書かないでください。
2. Neon の対象データベースに `db/migrations/` を適用します。接続 URL は Neon が示す**直接接続**の URL を使い、下の本番手順の `dbmate` コマンドで状態も確認します。Cloudflare Dashboard で同じ DB への Hyperdrive を作り、クエリキャッシュを無効にして、その ID を `wrangler.json` の `DATABASE` binding に設定します。
3. Wrangler の `pnpm exec wrangler whoami` でアカウントを確認します。Git 管理対象外の `.env` に `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` を、`.env.family.secrets` に同じ `CLERK_PUBLISHABLE_KEY=pk_test_...` と対応する `CLERK_SECRET_KEY=sk_test_...` を設定します。後者の権限は `chmod 600 .env.family.secrets` とします。シークレットをソース、`VITE_` 変数、ログへ置かないでください。
4. `pnpm check` を実行し、配信物に秘密鍵や DB 接続 URL がないことを確認します。初回は `pnpm exec wrangler deploy --secrets-file .env.family.secrets` で Worker と秘密値を同時に登録します。表示された `https://<worker名>.<サブドメイン>.workers.dev` を固定 URL として使います。更新時は `pnpm deploy` を使います。
5. 下の「公開後の確認」に沿って、両方の端末でログイン、支出・カテゴリー操作、ログアウト、ホーム画面からの起動を確認します。外部サービスの動作と実機表示は自動チェックだけでは保証できません。

以前のスキーマを適用した**未利用の**Neon DBを作り直す場合は、まず利用者・家計・支出・カテゴリーの行がすべて 0 件であることを確認します。データがある DB にはこの手順を使いません。Neon CLI で対象 project・branch・database を確かめてから `neon databases delete <database> --project-id <project> --branch <branch>`、続けて `neon databases create --name <database> --owner-name <owner> --project-id <project> --branch <branch>` を実行し、現行の `db/migrations/` を直接接続 URL で最初から適用します。同じ名前・所有者を使い、Hyperdrive が同じ DB を指していることも確認します。

## 本番環境の準備とデプロイ

このアプリはCloudflare Workersの静的アセットと同一オリジンの`/api`、Clerkの本番インスタンス、Neon PostgreSQL、Cloudflare Hyperdriveを使います。以下は新しい環境で再現する順序です。CloudflareとClerkの本番設定には所有するドメインを使います。

Cloudflare Worker自体は`<worker名>.<アカウントのサブドメイン>.workers.dev`で公開できます。ただし、[Clerkの本番インスタンスには所有するドメインとDNSレコードが必要](https://clerk.com/docs/guides/development/deployment/production)です。`workers.dev`だけを使う場合、この節のClerk本番設定と本番Googleログインの受け入れ条件は完了できません。Clerkの開発インスタンスを使った公開は検証用に限り、家計データを扱う本番運用として扱いません。

1. [Clerkの本番インスタンス](https://clerk.com/docs/guides/development/deployment/production)を作成し、本番ドメインとClerkが示すDNSレコードを設定します。[Google接続](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google)に本番用OAuthクライアントID・シークレットを登録し、Google以外のログイン方式を無効にします。Google側の公開状態と許可済みリダイレクトURIも確認します。Clerk本番の`pk_live_...`と`sk_live_...`を取得します。
2. Neonで本番用PostgreSQLデータベースを用意します。Neonの接続情報から、マイグレーション用の**直接接続**URLを安全な保管場所に置きます。`db/migrations/`は本番DBへ明示的に適用します。zshでは次のように一時的に読み込み、適用状態を確認します。入力時のURLは画面にもシェル履歴にも表示されません。`task db:migrate`はローカルDB専用です。

   ```zsh
   read -rs "DATABASE_URL?Neon direct URL: "
   echo
   export DATABASE_URL
   pnpm exec dbmate --no-dump-schema up
   pnpm exec dbmate --no-dump-schema status
   unset DATABASE_URL
   ```
3. Cloudflare DashboardでNeonへのHyperdrive接続を作成し、クエリキャッシュを無効にします。`wrangler.json`の`hyperdrive[0].id`をその接続IDに置き換え、binding名`DATABASE`を維持します。現行のIDは別環境で作られた接続を指すため、新しいCloudflareアカウントではそのまま使えません。HyperdriveにはNeonの接続情報をCloudflare側で登録し、DB接続文字列をソースへ置きません。
4. Cloudflareの対象アカウントへWranglerでログインし、`pnpm exec wrangler whoami`で対象を確認します。Git管理対象外の`.env.production.secrets`を`touch .env.production.secrets && chmod 600 .env.production.secrets`で作成し、`CLERK_PUBLISHABLE_KEY=pk_live_...`と`CLERK_SECRET_KEY=sk_live_...`を保存します。このファイルはWorkerへの登録にだけ使い、Viteのビルドには読み込ませません。`CLERK_SECRET_KEY`を`VITE_`付き変数、`wrangler.json`の`vars`、通常ログへ入れません。
5. ビルド環境にClerk本番の公開キーを`VITE_CLERK_PUBLISHABLE_KEY`として設定します。ローカルからデプロイする場合は、Git管理対象外の`.env.production.local`に`VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`を保存できます。`pnpm check`を実行し、`pnpm build`後に次の検査コマンドが何も出力しないことを確認します。初回デプロイは`pnpm exec wrangler deploy --secrets-file .env.production.secrets`でWorkerとsecretを同時に作成し、`pnpm exec wrangler secret list`で名前を確認します。その後、所有する本番ドメインをWorkerに割り当てます。CIを使う場合も、ビルド時の公開キーとWorkerの2つのsecretをそれぞれの工程へ設定します。

   ```bash
   rg -l 'sk_live_|postgres(ql)?://' dist/client
   ```

初回デプロイ後は`pnpm deploy`でコードを更新できます。`wrangler secret put`は即時にWorkerの新しいバージョンをデプロイするため、既存公開環境でキーを変更するときは対象環境と変更タイミングを先に確認してください。`wrangler.json`のHyperdrive IDやドメインを別環境へ合わせて変更した場合は、`pnpm cf-typegen`でbinding型を再生成します。

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
