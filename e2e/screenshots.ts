/**
 * Standalone screenshot script, not part of the test run (the name has no .spec).
 *   1. start the app:   npm start -- --port 4201
 *   2. run this script: node e2e/screenshots.ts [outDir]
 * Override the target with BASE_URL.
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4201';
const OUT_DIR = process.argv[2] ?? 'shots';

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const themes = ['light', 'dark'];

mkdirSync(OUT_DIR, { recursive: true });

/** Waits for every finite CSS animation (rise-in, pop-enter, toast-enter) to end. */
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

const browser = await chromium.launch();

for (const [device, viewport] of Object.entries(viewports)) {
  for (const theme of themes) {
    const context = await browser.newContext({
      viewport,
      isMobile: device === 'mobile',
      hasTouch: device === 'mobile',
      deviceScaleFactor: 1,
      colorScheme: theme as 'light' | 'dark',
    });
    await context.addInitScript((mode: string) => {
      try {
        localStorage.setItem('peoplehub.theme', mode);
      } catch {
        // ignore
      }
    }, theme);
    const page = await context.newPage();
    const shoot = async (name: string, fullPage = true) => {
      await settle(page);
      await page.screenshot({ path: `${OUT_DIR}/${name}-${device}-${theme}.png`, fullPage });
    };
    const firstRow = () =>
      page
        .locator('tbody tr')
        .or(page.getByTestId('employee-card'))
        .filter({ visible: true })
        .first();

    await page.goto(`${BASE_URL}/login`);
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

    if (device === 'mobile') {
      await page.getByRole('button', { name: 'Open menu' }).click();
    }
    await page.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menu', { name: 'Account' }).waitFor();
    await shoot('usermenu', false);
    await page.keyboard.press('Escape');
    if (device === 'mobile') {
      await page.getByRole('button', { name: 'Close menu' }).click();
    }

    await page.getByRole('combobox', { name: 'Group', exact: true }).click();
    await shoot('list-group-open', false);
    await page.keyboard.press('Escape');

    if (device === 'desktop') {
      await firstRow()
        .getByRole('button', { name: /^Edit / })
        .hover();
      await shoot('list-action-hover');
      await page.mouse.move(0, 0);
    }

    // Empty state.
    await page.getByRole('searchbox', { name: 'Search' }).fill('zzzzzz-no-match');
    await page.getByText('No employees match your filters.').waitFor();
    await shoot('empty');
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await firstRow().waitFor();

    // Delete dialog.
    await firstRow()
      .getByRole('button', { name: /^Delete / })
      .click();
    await page.getByRole('dialog', { name: 'Delete employee' }).waitFor();
    await shoot('delete-dialog', false);

    // Red toast after confirming.
    await page
      .getByRole('dialog', { name: 'Delete employee' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await page.locator('.toast-danger').waitFor();
    await shoot('toast-danger', false);

    // Add form and the date picker.
    await page.goto(`${BASE_URL}/employees/add`);
    await page.getByRole('heading', { name: 'Add employee' }).waitFor();
    await shoot('add');
    await page.getByRole('combobox', { name: 'Group', exact: true }).click();
    await shoot('add-group-open', false);
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Birth date', exact: true }).click();
    await page.getByRole('dialog', { name: 'Choose date' }).waitFor();
    await shoot('add-date-picker', false);
    await page.keyboard.press('Escape');

    // Edit page, then the yellow toast after saving.
    await page.goto(`${BASE_URL}/employees/citra.santoso3/edit`);
    await page.getByRole('heading', { name: 'Edit employee' }).waitFor();
    await page.getByLabel('First name').waitFor();
    await shoot('edit');
    await page.getByLabel('Last name').fill('Santosa');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.locator('.toast-warning').waitFor();
    await shoot('toast-warning', false);

    // Detail.
    await page.goto(`${BASE_URL}/employees/citra.santoso3`);
    await page.getByRole('heading', { name: 'Citra Santosa' }).waitFor();
    await page.getByRole('button', { name: 'Show salary' }).click();
    await page.getByRole('button', { name: 'Show email' }).click();
    await shoot('detail');

    await context.close();
  }
}

await browser.close();
console.log(`Screenshots written to ${OUT_DIR}`);
