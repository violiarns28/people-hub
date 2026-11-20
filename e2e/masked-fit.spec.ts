import { expect, test } from '@playwright/test';
import {
  expectMaskedStable,
  hasHorizontalScroll,
  loginAndGo,
  maskedMetrics,
  revealAll,
  rows,
  setWidth,
} from './utils';

const BULLET = String.fromCharCode(0x2022);

test.describe('masked values are never clipped', () => {
  for (const width of [390, 768, 1280, 1440]) {
    test(`list at ${width}px: all 100 rows, masked and revealed have the same width`, async ({
      page,
    }) => {
      await setWidth(page, width);
      await loginAndGo(page, '/employees?size=100');
      await expect(rows(page)).toHaveCount(100);
      const root = page.locator('section[aria-label="Employee list"]');

      const masked = await maskedMetrics(root);
      // 3 masked values per row in both layouts.
      expect(masked.length).toBe(300);
      await revealAll(page);
      await expect(root.getByRole('button', { name: /^Hide email$/ })).toHaveCount(100);
      const revealed = await maskedMetrics(root);

      expectMaskedStable(masked, revealed, `list ${width}`);
      expect(await hasHorizontalScroll(page)).toBe(false);

      if (width >= 1440) {
        const wrap = page.locator('.table-wrap');
        const [scroll, client] = await wrap.evaluate((el) => [el.scrollWidth, el.clientWidth]);
        // 2px slack covers subpixel rounding and the vertical scrollbar in CI.
        expect(scroll, 'table scrolls inside its wrapper').toBeLessThanOrEqual(client + 2);
      } else {
        const overflow = await page.getByTestId('employee-card').evaluateAll((cards) =>
          cards.flatMap((card, index) => {
            const edge = card.getBoundingClientRect().right;
            return Array.from(card.querySelectorAll('.swap'))
              .filter((box) => box.getBoundingClientRect().right > edge + 0.5)
              .map(() => index);
          }),
        );
        expect(overflow, 'values leaving their card').toEqual([]);
      }
    });
  }

  test('at 1280px the table fits its wrapper without inner scroll', async ({ page }) => {
    await setWidth(page, 1280);
    await loginAndGo(page, '/employees?size=100');
    const [scroll, client] = await page
      .locator('.table-wrap')
      .evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(scroll).toBeLessThanOrEqual(client + 2);
  });

  test('the mask has the same length as the value and keeps the email shape', async ({ page }) => {
    await loginAndGo(page, '/employees?size=100');
    const root = page.locator('section[aria-label="Employee list"]');
    const emailText = async () =>
      root.evaluate((el) =>
        Array.from(el.querySelectorAll('app-masked-value'))
          .filter((host) =>
            host.querySelector('button')?.getAttribute('aria-label')?.endsWith('email'),
          )
          .filter((host) => host.getBoundingClientRect().width > 0)
          .map((host) => host.querySelector('.swap')!.textContent ?? ''),
      );
    const masked = await emailText();
    await revealAll(page);
    const revealed = await emailText();

    expect(masked.length).toBe(100);
    for (let i = 0; i < masked.length; i++) {
      expect(masked[i].length, `email ${i} length`).toBe(revealed[i].length);
      expect(masked[i][0]).toBe(revealed[i][0]);
      expect(masked[i]).toContain(BULLET);
      expect(masked[i]).toMatch(/@.\S*\.dev$/);
    }
  });

  test('the longest email and the largest salary fit on the detail page', async ({ page }) => {
    await loginAndGo(page, '/employees?size=100');
    await revealAll(page);
    const longest = await page.evaluate(() => {
      let best = { text: '', link: '' };
      for (const box of Array.from(document.querySelectorAll('.swap'))) {
        const text = box.textContent ?? '';
        const rect = box.getBoundingClientRect();
        if (rect.width > 0 && text.includes('@') && text.length > best.text.length) {
          const row = box.closest('tr, [data-testid="employee-card"]');
          const link = row?.querySelector('a[aria-label^="Detail "]')?.getAttribute('href') ?? '';
          best = { text, link };
        }
      }
      return best;
    });
    expect(longest.link).toMatch(/^\/employees\//);

    for (const width of [360, 1280]) {
      await setWidth(page, width);
      await page.goto(longest.link);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const main = page.locator('main');
      const masked = await maskedMetrics(main);
      for (const label of ['email', 'birth date', 'salary']) {
        await page
          .getByRole('button', { name: `Show ${label}` })
          .first()
          .click();
      }
      await expect(page.getByRole('button', { name: 'Hide email' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Hide salary' })).toBeVisible();
      await expect(page.getByText(longest.text, { exact: true })).toBeVisible();
      const revealed = await maskedMetrics(main);
      expectMaskedStable(masked, revealed, `detail ${width}`);
      expect(await hasHorizontalScroll(page)).toBe(false);
    }
  });
});
