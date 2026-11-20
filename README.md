[![CI](https://github.com/violiarns28/people-hub/actions/workflows/ci.yml/badge.svg?event=pull_request)](https://github.com/violiarns28/people-hub/actions/workflows/ci.yml) [![Deploy](https://github.com/violiarns28/people-hub/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/violiarns28/people-hub/actions/workflows/deploy.yml)

# PeopleHub

Employee directory built with Angular 22 and Tailwind CSS v4. Sign in, search and sort employees, add, edit and delete them, and open a detail page. Personal data is masked until you reveal it.

It is a frontend-only demo: no backend, and all data lives in the browser.

**Live demo:** https://violiarns28.github.io/people-hub/

## Quick start

Requires Node.js 22+ and npm 10+.

```bash
npm install
npm start
```

Open http://localhost:4200 and sign in with `admin` / `admin123`.

## Features

- **Login:** generic error message, 30 second lockout after 5 failed attempts.
- **List:** 100 seeded employees with search, sort, group and status filters, and paging. State lives in the URL. On mobile the table becomes cards.
- **Add and edit:** validated form, custom date picker and select, prompt before leaving with unsaved changes.
- **Detail:** masked fields, copy buttons and a recent-access panel.
- **Extras:** light and dark theme, full keyboard support, inline SVG illustrations, 404 page.

## Privacy and security

- Personal data is masked in the list and detail views. Each field has its own reveal button, and a revealed value hides again after 30 seconds.
- Every reveal and hide is recorded in an in-memory audit trail.
- The session expires after 8 hours, and after 15 minutes of inactivity the user is signed out with a warning first.
- A Content-Security-Policy meta tag limits what the page can load. There are no third-party requests, web fonts or CDNs.

Masking is a UI feature only. Employee data is plain text in `localStorage` and the credentials are hardcoded. A real system must enforce masking and authorization on the server.

## Scripts

| Script                  | What it does                               |
| ----------------------- | ------------------------------------------ |
| `npm start`             | Dev server on port 4200                    |
| `npm run build`         | Production build into `dist/`              |
| `npm test`              | Unit tests (Vitest, watch mode)            |
| `npm run test:coverage` | Unit tests once, with coverage             |
| `npm run test:e2e`      | Playwright end-to-end tests                |
| `npm run lint`          | ESLint for code and templates (incl. a11y) |
| `npm run ci`            | Lint, unit tests and build, as CI runs     |

## Tech stack

Angular 22, TypeScript, Tailwind CSS v4, RxJS, Vitest with jsdom, Playwright, angular-eslint. Exact versions are in `package.json`.

## Project structure

```
src/app/
  core/       auth, audit, employees, privacy (masking), ui (theme, toast)
  layout/     shell, user menu
  shared/     pipes and reusable UI (date picker, select, dialogs, icons, ...)
  features/   login, employees (list, add, detail), not-found
e2e/          Playwright specs
```

## Testing

- **Unit:** Vitest with jsdom. Specs sit next to the code in `src/app`.
- **E2E:** Playwright in two projects, `chromium` (desktop) and `mobile` (Pixel 7). The dev server starts by itself.

## Data and reset

Employees are stored in `localStorage` under `peoplehub.employees.v2`. The first load seeds 100 records. Other keys: `peoplehub.theme`, `peoplehub.session` and `peoplehub.lockout`.

To reset, clear every `peoplehub.*` key (DevTools, Application, Storage), or run this in the console and reload:

```js
[localStorage, sessionStorage].forEach((s) =>
  Object.keys(s)
    .filter((k) => k.startsWith('peoplehub.'))
    .forEach((k) => s.removeItem(k)),
);
```

## CI/CD

- `ci.yml` runs lint, Prettier, unit tests and build on every pull request.
- `deploy.yml` runs on push to `main` and `release/**`. It reruns CI, runs Playwright e2e, then deploys to GitHub Pages.
- Other branches and pull requests never deploy.

One-time repo setup:

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Environments → `github-pages` → Deployment branches: **Selected branches** → `main` and `release/**`. This enforces the branch rule on the server.
3. Branch protection on `main`: require a PR and the `lint`, `unit`, `build` and `e2e` checks.
