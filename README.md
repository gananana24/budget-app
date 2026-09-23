# 家計簿アプリ

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/vite-react-template)

This template provides a minimal setup for building a React application with TypeScript and Vite, designed to run on Cloudflare Workers. It features hot module replacement, ESLint integration, and the flexibility of Workers deployments.

![React + TypeScript + Vite + Cloudflare Workers](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/fc7b4b62-442b-4769-641b-ad4422d74300/public)

<!-- dash-content-start -->

🚀 Supercharge your web development with this powerful stack:

- [**React**](https://react.dev/) - A modern UI library for building interactive interfaces
- [**Vite**](https://vite.dev/) - Lightning-fast build tooling and development server
- [**Hono**](https://hono.dev/) - Ultralight, modern backend framework
- [**Cloudflare Workers**](https://developers.cloudflare.com/workers/) - Edge computing platform for global deployment

### ✨ Key Features

- 🔥 Hot Module Replacement (HMR) for rapid development
- 📦 TypeScript support out of the box
- 🛠️ ESLint configuration included
- ⚡ Zero-config deployment to Cloudflare's global network
- 🎯 API routes with Hono's elegant routing
- 🔄 Full-stack development setup
- 🔎 Built-in Observability to monitor your Worker

Get started in minutes with local development or deploy directly via the Cloudflare dashboard. Perfect for building modern, performant web applications at the edge.

<!-- dash-content-end -->

## Getting Started

To start a new project with this template, run:

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/vite-react-template
```

A live deployment of this template is available at:
[https://react-vite-template.templates.workers.dev](https://react-vite-template.templates.workers.dev)

## Development

Install dependencies:

```bash
pnpm install
```

Start the development server with:

```bash
pnpm dev
```

Your application will be available at [http://localhost:5173](http://localhost:5173).

## Production

Build your project for production:

```bash
pnpm build
```

Preview your build locally:

```bash
pnpm preview
```

Deploy your project to Cloudflare Workers:

```bash
pnpm check && pnpm deploy
```

Monitor your workers:

```bash
npx wrangler tail
```

## Issue development workflow

Development work is managed with one `issue/<number>` branch per GitHub Issue.
The commands require [Task](https://taskfile.dev/) and authenticated
[GitHub CLI](https://cli.github.com/). They refuse to continue when the working
tree has uncommitted changes.

Start an Issue. This updates `main`, checks unresolved Issue dependencies, creates
a branch linked to the Issue, and checks it out:

```bash
task start:issue ISSUE=1
```

After committing the implementation, run the local quality checks, push the
branch, and create a Draft Pull Request:

```bash
task create:pr
```

When the Pull Request is ready, rerun the checks, mark it ready, and enable squash
auto-merge:

```bash
task ready:pr
```

After the Pull Request is merged, update `main` and delete the local Issue branch:

```bash
task clean:issue ISSUE=1
```

Pull Requests run `pnpm check` in GitHub Actions. Merging into `main` requires the
`quality` check and uses squash merge. A merged Pull Request closes its Issue
through the `Closes #<number>` reference added by `task create:pr`.

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://reactjs.org/)
- [Hono Documentation](https://hono.dev/)
