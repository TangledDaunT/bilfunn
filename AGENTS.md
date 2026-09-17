# Repository Guidelines

## Project Structure & Module Organization

The root `src/` fragments and generated `index.html` form the standalone Bilfunn prototype. Keep that prototype separate from the production Skiltnummeret.no application in `bilfunn-prod/`.

Within the production app, `src/app/` contains Next.js pages and HTTP routes, `src/components/` holds React components, and `src/lib/` contains authentication, billing, jobs, and vehicle adapters. `prisma/` holds schema, migrations, and seed configuration. Public assets live in `public/`; unpublished editorial Markdown lives in `content/`. Tests are divided into `tests/unit/`, `tests/integration/`, `tests/e2e/`, and `tests/load/`.

## Build, Test, and Development Commands

Use Node.js 22 or newer and run these commands from `bilfunn-prod/`:

- `npm ci`: install the locked dependency tree and generate Prisma types.
- `npm run db:migrate` and `npm run seed`: apply committed migrations and initialize configuration.
- `npm run dev`: start local development.
- `npm run build` and `npm start`: build and serve production output.
- `npm run typecheck` and `npm run lint`: check types and ESLint rules.
- `npm test`: run unit tests; `npm run test:integration`: run PostgreSQL integration tests.
- `npm run test:e2e`: run Playwright browser tests.
- `npm run config:check`: report configuration status without displaying secrets.

## Coding Style & Naming Conventions

Follow `.editorconfig`: two spaces, UTF-8, LF, and a final newline. Use strict TypeScript, double quotes, semicolons, PascalCase components, camelCase functions, and `@/` imports. Follow Next.js 16 asynchronous request APIs and `proxy.ts` conventions. Public cacheable HTML handlers must not read sessions.

## Testing Guidelines

Name Vitest files `*.test.ts` and browser tests `*.spec.ts`. Use an isolated database named `sk_test`; integration tests delete test records. Cover authorization, concurrency, payment replay, privacy, and failure behavior. No numerical coverage target is configured. Run production browser tests after a build; see `DEPLOYMENT.md`. Never load-test production or real providers.

## Commit & Pull Request Guidelines

Use short imperative subjects, following history: `Add vehicle provider integrations`. PRs should explain behavior changes, linked issues, verification results, schema/configuration changes, and screenshots for UI changes. State unverified release gates explicitly.

## Security & Configuration

Keep credentials in ignored environment files or the hosting secret manager. Never print secrets or raw provider payloads. Persist only approved public vehicle fields after permissions are configured. Retain payment idempotency, atomic quotas, recent authentication, and administrator MFA.
