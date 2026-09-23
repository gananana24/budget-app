# 家計簿アプリ

React、TypeScript、Vite、Hono、Cloudflare Workersで開発する家計簿Webアプリです。
スマートフォンでの利用を中心に、Googleログイン、支出の手入力、月次集計をMVPの対象にします。

## 必要な環境

- Node.js 24以上
- pnpm 10以上
- 接続先と同じメジャーバージョンのPostgreSQLクライアントツール（スキーマダンプを更新する場合）
- GitHub CLI（Issue開発ワークフローを使う場合）
- Task（Issue開発ワークフローを使う場合）

## セットアップ

依存関係をインストールします。

```bash
pnpm install
```

環境変数を使う場合は、サンプルをコピーして値を設定します。

```bash
cp .env.example .env
```

`.env.example`には変数名と用途だけを記載しています。秘密値はコミットしないでください。
現時点では認証・DB連携が未実装のため、ローカル起動に環境変数は必須ではありません。

Neonを使う場合は、通常のアプリ接続にpooler URL、マイグレーションにdirect URLを設定します。

```dotenv
DATABASE_URL=postgresql://...-pooler.../neondb
DATABASE_URL_UNPOOLED=postgresql://.../neondb
```

ローカルPostgreSQLでは、両方に同じdirect URLを設定して構いません。

## 開発

開発サーバーを起動します。

```bash
pnpm dev
```

ブラウザで <http://localhost:5173> を開きます。

主なコマンドは次のとおりです。

| コマンド | 用途 |
| --- | --- |
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

マイグレーションはdbmateで管理します。Neonでは必ずホスト名に`-pooler`を含まない`DATABASE_URL_UNPOOLED`を使用してください。

適用状態を確認します。

```bash
pnpx dbmate --env DATABASE_URL_UNPOOLED --no-dump-schema status
```

未適用のマイグレーションを適用します。

```bash
pnpx dbmate --env DATABASE_URL_UNPOOLED --no-dump-schema up
```

最新のマイグレーションをロールバックします。対象テーブルのデータも削除されるため、実行前に接続先を確認してください。

```bash
pnpx dbmate --env DATABASE_URL_UNPOOLED --no-dump-schema down
```

`--no-dump-schema`は、マイグレーション後の自動ダンプを無効にします。`db/schema.sql`を更新するときは、接続先と同じメジャーバージョンの`pg_dump`を用意して次を実行します。

```bash
pnpx dbmate --env DATABASE_URL_UNPOOLED dump
```

マイグレーションは開発時またはデプロイ工程で明示的に実行します。Cloudflare Workerの起動時やリクエスト処理中には実行しません。

## デプロイ

Cloudflareへデプロイする前に、品質チェックを実行します。

```bash
pnpm check
pnpm deploy
```

認証やNeonを使う構成では、秘密値をCloudflareのSecretsへ登録します。
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
- [技術構成](docs/tech-stack.md)
- [MVP開発計画](docs/development-plan.md)
