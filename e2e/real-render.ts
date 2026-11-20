/**
 * Standalone real-browser render check, not part of the test run (the name has no .spec).
 *   1. start the app:   npm start -- --port 4201
 *   2. run this script: node e2e/real-render.ts [outDir]
 * Opens every page at seven widths in light and dark, saves screenshots and writes report.json with
 * console errors, page errors, failed requests, horizontal overflow and clipped-text candidates.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4201';
const OUT_DIR = process.argv[2] ?? 'real-render';
const WIDTHS = [360, 390, 768, 1024, 1280, 1440, 1920];
const THEMES = ['light', 'dark'] as const;
const DETAIL = '/employees/citra.santoso3';

mkdirSync(OUT_DIR, { recursive: true });

interface Finding {
  shot: string;
  kind: 'console' | 'pageerror' | 'requestfailed' | 'http' | 'overflow' | 'clipped';
  detail: string;
}
const findings: Finding[] = [];
const shots: string[] = [];

/** Waits for every finite CSS animation to end so screenshots are not mid-flight. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

async function audit(page: Page, shot: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth ? `${doc.scrollWidth} > ${doc.clientWidth}` : '';
  });
  if (overflow) {
    findings.push({ shot, kind: 'overflow', detail: overflow });
  }
  const clipped = await page.evaluate(() => {
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const style = getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.display === 'inline' ||
        el.clientWidth === 0 ||
        el.className.toString().includes('sr-only')
      ) {
        continue;
      }
      if (['hidden', 'clip'].includes(style.overflowX) && el.scrollWidth > el.clientWidth + 1) {
        const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const ellipsis = style.textOverflow === 'ellipsis' ? ' [ellipsis]' : '';
        found.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} ${el.scrollWidth}>${el.clientWidth}${ellipsis} "${text}"`,
        );
      }
    }
    return found;
  });
  for (const detail of clipped) {
    findings.push({ shot, kind: 'clipped', detail });
  }
}

const browser = await chromium.launch();

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const height = width >= 1024 ? 900 : 844;
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width, height },
      colorScheme: theme,
      deviceScaleFactor: 1,
    });
    await context.addInitScript((mode: string) => {
      try {
        localStorage.setItem('peoplehub.theme', mode);
      } catch {
        // ignore
      }
    }, theme);
    const page = await context.newPage();
    let current = 'setup';
    page.on('console', (message) => {
      if (message.type() === 'error') {
        findings.push({ shot: current, kind: 'console', detail: message.text().slice(0, 300) });
      }
    });
    page.on('pageerror', (error) =>
      findings.push({ shot: current, kind: 'pageerror', detail: String(error).slice(0, 300) }),
    );
    page.on('requestfailed', (request) =>
      findings.push({
        shot: current,
        kind: 'requestfailed',
        detail: `${request.url()} ${request.failure()?.errorText ?? ''}`,
      }),
    );
    page.on('response', (response) => {
      if (response.status() >= 400) {
        findings.push({
          shot: current,
          kind: 'http',
          detail: `${response.status()} ${response.url()}`,
        });
      }
    });

    const shoot = async (name: string): Promise<void> => {
      current = `${name}-${width}-${theme}`;
      await page.mouse.move(0, 0);
      await settle(page);
      // Staggered entrance animations can start a frame late; give them time to land.
      await page.waitForTimeout(450);
      await settle(page);
      await page.screenshot({ path: `${OUT_DIR}/${current}.png`, fullPage: true });
      shots.push(current);
      await audit(page, current);
    };
    const openNav = async (): Promise<void> => {
      const menu = page.getByRole('button', { name: 'Open menu' });
      if (await menu.isVisible()) {
        await menu.click();
      }
    };

    current = `login-${width}-${theme}`;
    await page.goto('/login');
    await page.getByRole('heading', { name: 'Sign in' }).waitFor();
    await shoot('login');

    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('heading', { name: 'Employees', level: 1 }).waitFor();
    await shoot('list');

    await page.getByRole('switch', { name: /Reveal sensitive data/ }).click();
    await shoot('list-revealed');
    await page.getByRole('switch', { name: /Reveal sensitive data/ }).click();

    await page.goto(DETAIL);
    await page.getByRole('heading', { name: 'Citra Santoso', level: 1 }).waitFor();
    await shoot('detail');
    for (const label of ['email', 'birth date', 'salary']) {
      await page.getByRole('button', { name: `Show ${label}` }).click();
    }
    await shoot('detail-revealed');

    await page.goto('/employees/add');
    await page.getByRole('heading', { name: 'Add employee', level: 1 }).waitFor();
    await shoot('add');
    await page.getByRole('combobox', { name: 'Birth date', exact: true }).click();
    await page.getByRole('dialog', { name: 'Choose date' }).waitFor();
    await shoot('datepicker');

    await page.goto('/employees/citra.santoso3/edit');
    await page.getByRole('heading', { name: 'Edit employee', level: 1 }).waitFor();
    await shoot('edit');

    await page.goto('/nope');
    await page.getByRole('heading', { name: 'Page not found' }).waitFor();
    await shoot('notfound');

    await page.goto('/employees');
    await page.getByRole('searchbox', { name: 'Search' }).fill('zzzzzz-no-match');
    await page.getByText('No employees match your filters.').waitFor();
    await shoot('empty');
    await page.getByRole('button', { name: 'Reset filters' }).click();

    if (width < 1024) {
      await openNav();
      await shoot('drawer');
      await page.getByRole('button', { name: 'Close menu' }).click();
    }

    await page
      .getByRole('button', { name: /^Delete / })
      .and(page.locator(':visible'))
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Delete employee' });
    await dialog.waitFor();
    await shoot('delete-dialog');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.locator('.toast-danger').waitFor();
    await shoot('toast');

    await context.close();
  }
}

await browser.close();

const summary: Record<string, number> = {};
for (const finding of findings) {
  summary[finding.kind] = (summary[finding.kind] ?? 0) + 1;
}
writeFileSync(
  `${OUT_DIR}/report.json`,
  JSON.stringify({ shots: shots.length, summary, findings }, null, 2),
);
console.log(`${shots.length} screenshots in ${OUT_DIR}`);
console.log('findings by kind:', JSON.stringify(summary));
