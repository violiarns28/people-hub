import { expect, test, type Page } from '@playwright/test';
import { login, openBirthPicker, rows } from './utils';

const SYSTEM_STACK =
  /^(system-ui|ui-sans-serif|-apple-system|blinkmacsystemfont|"?segoe ui|roboto)/i;

/** Selectors of elements whose computed style (or pseudo element) paints a gradient. */
async function gradientPainters(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      for (const pseudo of [null, '::before', '::after']) {
        const image = getComputedStyle(el, pseudo).backgroundImage;
        if (image.includes('gradient')) {
          found.push(`${el.tagName.toLowerCase()}.${el.className}${pseudo ?? ''}`);
        }
      }
    }
    return found;
  });
}

async function expectFlat(page: Page): Promise<void> {
  expect(await gradientPainters(page)).toEqual([]);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toMatch(SYSTEM_STACK);
  await expect(page.locator('select')).toHaveCount(0);
}

test.describe('flat visual guard', () => {
  test('no web font files are requested on any screen', async ({ page }) => {
    const fonts: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url) || request.resourceType() === 'font') {
        fonts.push(url);
      }
    });

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await login(page);
    await page.goto('/employees/add');
    await expect(page.getByRole('heading', { name: 'Add employee' })).toBeVisible();
    await page.goto('/employees/citra.santoso3');
    await expect(page.getByRole('heading', { name: 'Citra Santoso' })).toBeVisible();

    expect(fonts).toEqual([]);
  });

  test('login is flat, system font, no native select', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expectFlat(page);
  });

  test('list is flat, system font, no native select', async ({ page }) => {
    await login(page);
    await expectFlat(page);
  });

  test('add form is flat, system font, no native select, also with the group panel open', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/employees/add');
    await expect(page.getByRole('heading', { name: 'Add employee' })).toBeVisible();
    await expectFlat(page);

    await page.getByRole('combobox', { name: 'Group', exact: true }).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await expectFlat(page);
  });

  test('detail is flat, system font, no native select', async ({ page }) => {
    await login(page);
    await page.goto('/employees/citra.santoso3');
    await expect(page.getByRole('heading', { name: 'Citra Santoso' })).toBeVisible();
    await expectFlat(page);
  });

  test('edit form and the date picker popover are flat', async ({ page }) => {
    await login(page);
    await page.goto('/employees/citra.santoso3/edit');
    await expect(page.getByRole('heading', { name: 'Edit employee', level: 1 })).toBeVisible();
    await expectFlat(page);

    await openBirthPicker(page);
    await expectFlat(page);
  });

  test('empty state, delete dialog and toast are flat', async ({ page }) => {
    await login(page);
    await page.getByRole('searchbox', { name: 'Search' }).fill('zzzzzz-no-match');
    await expect(page.getByText('No employees match your filters.')).toBeVisible();
    await expectFlat(page);
    await page.getByRole('button', { name: 'Reset filters' }).click();

    await rows(page)
      .first()
      .getByRole('button', { name: /^Delete / })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Delete employee' });
    await expect(dialog).toBeVisible();
    await expectFlat(page);

    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('.toast-danger')).toBeVisible();
    await expectFlat(page);
  });

  test('login shows a flat svg illustration in the brand panel on desktop', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    const width = page.viewportSize()!.width;
    const art = page.locator('.brand-panel app-illustration svg').first();
    if (width >= 1024) {
      await expect(art).toBeVisible();
      const box = await art.boundingBox();
      expect(box!.width).toBeGreaterThan(200);
      expect(box!.height).toBeGreaterThan(150);
      // The panel is a solid colour and the artwork is inline svg, not an image file.
      await expect(page.locator('.brand-panel img')).toHaveCount(0);
      const panelImage = await page
        .locator('.brand-panel')
        .evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(panelImage).not.toContain('gradient');
    } else {
      await expect(page.locator('.brand-panel')).toBeHidden();
    }
    await expectFlat(page);
  });
});
