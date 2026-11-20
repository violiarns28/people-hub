import { expect, test, type Page } from '@playwright/test';
import { listRoot, login, maskedCell, revealAll, rows } from './utils';

const BULLET = String.fromCharCode(0x2022);
const EMAIL = /@peoplehub\.dev/;
const SALARY = /Rp\. \d/;
const BIRTH = /\b\d{2} [A-Z][a-z]{2} \d{4}\b/;

async function bodyText(page: Page): Promise<string> {
  return page.locator('main').innerText();
}

test.describe('sensitive data privacy', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('masks email, salary and birth date by default', async ({ page }) => {
    const first = rows(page).first();
    await expect(first).toContainText(BULLET);
    await expect(first.getByRole('button', { name: 'Show email' })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Show salary' })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Show birth date' })).toBeVisible();

    const text = await bodyText(page);
    expect(text).not.toMatch(EMAIL);
    expect(text).not.toMatch(SALARY);
    expect(text).not.toMatch(BIRTH);
    await expect(page.getByRole('switch', { name: /Reveal sensitive data/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('the eye button reveals only its own cell', async ({ page }) => {
    const first = rows(page).first();
    await first.getByRole('button', { name: 'Show email' }).click();

    await expect(first.getByText(EMAIL)).toBeVisible();
    await expect(first.getByRole('button', { name: 'Hide email' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(listRoot(page).getByText(EMAIL)).toHaveCount(1);

    // The same row's other fields and every other row stay masked.
    await expect(first.getByRole('button', { name: 'Show salary' })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Show birth date' })).toBeVisible();
    const text = await bodyText(page);
    expect(text).not.toMatch(SALARY);
    expect(text).not.toMatch(BIRTH);

    await first.getByRole('button', { name: 'Hide email' }).click();
    await expect(listRoot(page).getByText(EMAIL)).toHaveCount(0);
  });

  test('the global switch reveals everything and hides it again', async ({ page }) => {
    await revealAll(page);

    const list = listRoot(page);
    await expect(list.getByText(EMAIL)).toHaveCount(10);
    await expect(list.getByText(/^Rp\. [\d.]+,\d{2}$/)).toHaveCount(10);
    await expect(list.getByText(BIRTH)).toHaveCount(10);

    await page.getByRole('switch', { name: /Reveal sensitive data/ }).click();
    await expect(list.getByText(EMAIL)).toHaveCount(0);
    await expect(rows(page).first()).toContainText(BULLET);
  });

  test('reveals are audited and listed under Recent access on the detail page', async ({
    page,
  }) => {
    const first = rows(page).first();
    await first.getByRole('button', { name: 'Show email' }).click();
    await first.getByRole('button', { name: 'Show salary' }).click();
    await first.getByRole('link', { name: /^Detail / }).click();

    await expect(page).toHaveURL(/\/employees\/[^/?]+/);
    const panel = page.getByRole('complementary', { name: 'Recent access' });
    await expect(panel).toContainText('Revealed email');
    await expect(panel).toContainText('Revealed salary');
    await expect(panel).not.toContainText('Revealed birth date');

    await page.getByRole('button', { name: 'Show birth date' }).click();
    await expect(panel).toContainText('Revealed birth date');
  });

  test('shows an empty Recent access panel when nothing was revealed', async ({ page }) => {
    await rows(page)
      .first()
      .getByRole('link', { name: /^Detail / })
      .click();

    await expect(page.getByRole('complementary', { name: 'Recent access' })).toContainText(
      'No sensitive fields revealed yet',
    );
  });

  test('revealing keeps the value box the same width in the list', async ({ page }) => {
    const first = rows(page).first();
    for (const label of ['email', 'birth date', 'salary'] as const) {
      const cell = maskedCell(first, label);
      const before = await cell.locator('.swap').boundingBox();
      const cellBefore = await cell.boundingBox();

      await cell.getByRole('button', { name: `Show ${label}` }).click();
      await expect(cell.getByRole('button', { name: `Hide ${label}` })).toBeVisible();
      const after = await cell.locator('.swap').boundingBox();
      const cellAfter = await cell.boundingBox();

      expect(before, label).not.toBeNull();
      expect(Math.abs(after!.width - before!.width), `${label} value width`).toBeLessThanOrEqual(1);
      expect(
        Math.abs(cellAfter!.width - cellBefore!.width),
        `${label} cell width`,
      ).toBeLessThanOrEqual(1);
      expect(Math.abs(after!.x - before!.x), `${label} value x`).toBeLessThanOrEqual(1);
    }
  });

  test('the global switch does not change the list width either', async ({ page }) => {
    const width = () => listRoot(page).evaluate((el) => el.getBoundingClientRect().width);
    const before = await width();
    expect(before).toBeGreaterThan(100);
    await revealAll(page);
    await expect(listRoot(page).getByText(EMAIL)).toHaveCount(10);
    expect(Math.abs((await width()) - before)).toBeLessThanOrEqual(1);
  });

  test('revealing keeps the value box the same width on the detail page', async ({ page }) => {
    await page.goto('/employees/citra.santoso3');
    // Age shares its reveal state with the birth date: one toggle flips both boxes.
    for (const label of ['email', 'birth date', 'salary'] as const) {
      const linked = label === 'birth date' ? 2 : 1;
      const cell = maskedCell(page.locator('main'), label);
      const before = await cell.locator('.swap').boundingBox();
      await cell.getByRole('button', { name: `Show ${label}` }).click();
      await expect(cell.getByRole('button', { name: `Hide ${label}` })).toBeVisible();
      const after = await cell.locator('.swap').boundingBox();
      expect(Math.abs(after!.width - before!.width), label).toBeLessThanOrEqual(1);
      if (linked === 2) {
        await expect(page.getByRole('button', { name: 'Hide age' })).toBeVisible();
      }
    }
    // Age: toggling it hides it and the birth date together.
    await page.getByRole('button', { name: 'Hide age' }).click();
    await expect(page.getByRole('button', { name: 'Show birth date' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show age' })).toBeVisible();
  });
});
