[![CI](https://github.com/violiarns28/people-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/violiarns28/people-hub/actions/workflows/ci.yml)

# PeopleHub

PeopleHub is an employee directory built with Angular 22 and Tailwind CSS v4. You can sign in, search and sort a list of employees, add, edit and delete them, and open a detail page. Personal data is masked until you choose to reveal it.

It is a frontend-only demo. There is no backend, and everything is stored in the browser.

## What it does

### Login
- Username and password, with the demo credentials listed below.
- A wrong login always says "Invalid username or password", so it never hints at which part was wrong.
- After 5 failed attempts the form locks for 30 seconds and shows a countdown.
- The login page has a split layout: form on one side, brand panel with an SVG illustration and dot grid on the other.

### Employee list
- 100 seeded employees with pagination and a page size selector.
- Columns sort in three clicks: ascending, descending, back to default.
- The toolbar fits on one row: search, group filter, status filter, clear, and a reveal switch. Selects have fixed widths so nothing jumps around.
- Search needs every term to match somewhere in the row.
- View, Edit and Delete are icon buttons. The label slides out on hover or focus. Delete asks first.
- On mobile the table becomes compact cards.
- A mask is exactly as long as the real value (monospace), so revealing never shifts or clips the layout.
- The empty state has its own illustration.
- Toasts come with a countdown bar: green after add, yellow after edit, red after delete.
- Search, sort, page and page size live in the URL query string.

### Add and edit
- Add lives at `/employees/add`. Edit reuses the same form at `/employees/:username/edit`, prefilled, with the username locked.
- On large screens a checklist rail shows which fields are done.
- Every field is required: username, first name, last name, email, birth date, basic salary, status, group and description.
- Birth date uses a custom date picker with year, month and day grids, typing, keyboard support, and a max of today. It is stored as `yyyy-MM-dd`.
- Email is format checked and salary only takes numbers.
- Group is a custom Select with 10 groups.
- Leaving with unsaved changes asks for confirmation.

### Employee detail
- One column on small screens, a side rail from the `xl` breakpoint.
- Identity holds the birth date, Compensation holds the salary (`Rp. 5.000.000,00`).
- Age is its own field, and its reveal is tied to the birth date. Show one and the other shows too.
- Copy buttons for values. Email can only be copied while it is revealed.
- A "Recent access" panel lists which sensitive fields were revealed or hidden.
- OK goes back to the list with the previous search, sort and page intact.

### User menu
- Sits at the bottom of the sidebar and follows the ARIA menu button pattern (arrows, Home, End, Escape).
- Switches between light and dark theme, and signs out.

### Graphics and 404
- All illustrations are inline SVG drawn for this app: team, org, skyline banner, document, empty, secure, notfound, success.
- The dot grid is solid, no gradients or blur.
- Unknown URLs land on a 404 page (`**` route).

### Motion
- Helpers in `src/styles.css`: `.press` (scale on active), `.lift` (raise on hover), `.nudge-r` and `.nudge-l` (nudge an icon right or left), `.tilt` (rotate on hover), `.pop` (scale in), `.slide-down` (fade and slide in), `.shake-once` (error shake), `.pulse-once` (notice pulse).
- All of it sits behind `prefers-reduced-motion: no-preference`.

## Security and privacy design

- PII is masked in the list and detail views. Each field has its own eye button.
- A revealed value hides itself again after 30 seconds.
- Every reveal and hide goes into an in-memory audit trail (action, field, record, time, no actor).
- The session lives in `sessionStorage` and expires after 8 hours.
- After 15 minutes of no activity the user is signed out, with a warning first.
- 5 failed logins block sign-in for 30 seconds.
- The login error is generic, so usernames cannot be guessed.
- A Content-Security-Policy meta tag limits what the page can load.
- No third-party requests. The system font stack is used, so there are no web fonts or CDNs.

Masking here is only a UI feature. There is no backend, employee data sits in `localStorage` in plain text, and the credentials are hardcoded. In a real system the server has to enforce masking and authorization, and the API should return masked values unless the caller is allowed the real ones.

## Tech stack

| Area | Technology | Version (package.json) |
| --- | --- | --- |
| Framework | Angular | ^22.2.0 |
| Language | TypeScript | ~6.0.2 |
| Styling | Tailwind CSS | ^4.1.12 |
| Reactive | RxJS | ~7.8.0 |
| Build | @angular/build | ^22.2.7 |
| Unit tests | Vitest, jsdom | ^5.0.0, ^30.0.0 |
| E2E tests | Playwright | ^1.65.1 |
| Linting | angular-eslint | ^22 |
| Fonts | System font stack (no web fonts) | n/a |

## Environment

- Node.js 22 or newer and npm 10 or newer.
- Last tested with Node.js v25.1.0 and npm 11.6.2.

## CI/CD

- `.github/workflows/ci.yml` runs lint, Prettier, unit tests and build on every pull request.
- `.github/workflows/deploy.yml` runs on push to `main` and `release/**`. It reruns CI, runs Playwright e2e, then deploys to GitHub Pages: https://violiarns28.github.io/people-hub/
- Other branches and PRs never deploy.
- Run the same checks locally with `npm run ci`.

One-time repo setup:

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Environments → `github-pages` → Deployment branches: **Selected branches** → `main` and `release/**`. This enforces the branch rule server-side.
3. Branch protection on `main`: require PR and the `lint`, `unit`, `build`, `e2e` checks.

## How to run

```bash
npm install
npm start
```

Open http://localhost:4200 and sign in with:

- Username: `admin`
- Password: `admin123`

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Start the dev server on port 4200 |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit tests with Vitest (watch mode) |
| `npm run test:coverage` | Single unit test run with coverage report |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run lint` | ESLint for TypeScript and templates (including accessibility rules) |

## Spec checklist

Everything in the brief is done:

- Login, lockout, generic error
- List with search, sort, paging, filters and URL state
- Add, edit and delete with validation and confirmation
- Detail page with masking and the audit panel
- Masked PII with matching width
- Responsive layout (table to cards, detail rail) and the 404 page

## Project structure

```
src/app/
  core/       auth, audit, employees (model, query, service, guard), privacy (masking), ui (theme, toast)
  layout/     shell, user-menu
  shared/     pipes, ui (confirm-dialog, currency-input, date-picker, icon, illustration, masked-value, pagination, select, toast-host)
  features/   login, employees (list, add, detail), not-found
e2e/          Playwright specs
```

## Design notes

- Colors, radii and spacing are CSS custom properties, used through Tailwind v4.
- The look is flat and solid: no gradients or blur, 8px radii, and at most one light shadow on popovers and dialogs. The dot grid only appears on the login panel and the empty state.
- System sans for text, system monospace for data. No web fonts.
- One green accent, in a light and a dark palette. Yellow and red are kept for status.
- Select and date picker are custom, with full keyboard support.
- Illustrations are inline SVG and follow the design tokens.
- Light and dark themes follow the system setting and can be switched from the user menu.
- Animations turn off under `prefers-reduced-motion`.
- Everything works from the keyboard, focus is always visible, and the template lint rules check ARIA usage.

## Testing

- Unit tests use Vitest with jsdom (`npm test`) and sit next to the code in `src/app`. They cover services, guards, pipes, query logic and components. For coverage run `npm run test:coverage`.
- End-to-end tests use Playwright (`npm run test:e2e`), live in `e2e/`, and run in two projects: `chromium` (desktop) and `mobile` (Pixel 7 emulation). The dev server starts by itself.

## Data persistence

Employees, including edits and deletes, are stored in `localStorage` under `peoplehub.employees.v2`. The first load seeds 100 records. Data from the old `peoplehub.employees` key is moved to v2 automatically, and birth dates are converted to `yyyy-MM-dd`.

Other keys: `peoplehub.theme` (localStorage), `peoplehub.session` and `peoplehub.lockout` (sessionStorage).

### Reset demo data

Clear every `peoplehub.*` key (DevTools, Application, Storage, or "Clear site data"). Or paste this in the console:

```js
Object.keys(localStorage).filter((k) => k.startsWith('peoplehub.')).forEach((k) => localStorage.removeItem(k));
Object.keys(sessionStorage).filter((k) => k.startsWith('peoplehub.')).forEach((k) => sessionStorage.removeItem(k));
```

Reload and the 100 sample records come back.
