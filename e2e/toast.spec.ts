import { expect, test, type Locator, type Page } from '@playwright/test';
import { fillEmployeeForm, login, rows } from './utils';

/** Waits until the toast enter animation has finished so its position is final. */
async function settled(toast: Locator): Promise<void> {
  await expect(toast).toBeVisible();
  await toast.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

/** Triggers a yellow toast by saving an edit. */
async function warningToast(page: Page): Promise<Locator> {
  await page.goto('/employees/citra.santoso3/edit');
  await expect(page.getByLabel('First name')).toHaveValue('Citra');
  await page.getByLabel('Last name').fill('Santosa');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const toast = page.locator('.toast-warning');
  await expect(toast).toContainText('Updated Citra Santosa');
  await settled(toast);
  return toast;
}

/** Triggers a red toast by deleting the first row. */
async function dangerToast(page: Page): Promise<Locator> {
  const label = await rows(page)
    .first()
    .getByRole('link', { name: /^Detail / })
    .getAttribute('aria-label');
  const name = (label ?? '').replace('Detail ', '');
  await rows(page)
    .first()
    .getByRole('button', { name: `Delete ${name}` })
    .click();
  await page
    .getByRole('dialog', { name: 'Delete employee' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  const toast = page.locator('.toast-danger');
  await expect(toast).toContainText(`Deleted ${name}`);
  await settled(toast);
  return toast;
}

async function parts(toast: Locator): Promise<{
  toast: { x: number; y: number; width: number; height: number };
  icon: { y: number; height: number };
  message: { y: number; height: number };
  close: { y: number; height: number };
}> {
  const box = await toast.boundingBox();
  const icon = await toast.locator('app-icon').first().boundingBox();
  const message = await toast.locator('p').boundingBox();
  const close = await toast.getByRole('button', { name: 'Dismiss notification' }).boundingBox();
  expect(box && icon && message && close).toBeTruthy();
  return { toast: box!, icon: icon!, message: message!, close: close! };
}

const centre = (b: { y: number; height: number }) => b.y + b.height / 2;

async function expectAligned(toast: Locator): Promise<void> {
  const p = await parts(toast);
  // A single line message: icon, text and close button share one vertical centre.
  expect(p.message.height).toBeLessThan(30);
  expect(Math.abs(centre(p.icon) - centre(p.message)), 'icon vs message').toBeLessThanOrEqual(2);
  expect(Math.abs(centre(p.close) - centre(p.message)), 'close vs message').toBeLessThanOrEqual(2);
  expect(Math.abs(centre(p.icon) - centre(p.close)), 'icon vs close').toBeLessThanOrEqual(2);
}

async function expectPlacement(page: Page, toast: Locator): Promise<void> {
  const { toast: box } = await parts(toast);
  const viewport = await page.evaluate(() => document.documentElement.clientWidth);
  if (viewport >= 768) {
    expect(Math.abs(viewport - (box.x + box.width) - 16), 'right gutter').toBeLessThanOrEqual(1);
  } else {
    const left = box.x;
    const right = viewport - (box.x + box.width);
    expect(Math.abs(left - right), 'equal side gutters').toBeLessThanOrEqual(1);
    expect(left, 'gutter').toBeGreaterThanOrEqual(15);
    expect(left, 'gutter').toBeLessThanOrEqual(17);
  }
  expect(Math.abs(box.y - 16), 'top gutter').toBeLessThanOrEqual(1);
}

test.describe('toasts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('the yellow edit toast keeps icon, message and close button on one line', async ({
    page,
  }) => {
    const toast = await warningToast(page);
    await expectAligned(toast);
    await expectPlacement(page, toast);
  });

  test('the red delete toast keeps icon, message and close button on one line', async ({
    page,
  }) => {
    const toast = await dangerToast(page);
    await expectAligned(toast);
    await expectPlacement(page, toast);
  });

  test('the success toast is aligned too', async ({ page }) => {
    await page.getByRole('link', { name: 'Add employee' }).click();
    await fillEmployeeForm(page);
    await page.getByRole('button', { name: 'Save employee' }).click();
    const toast = page.locator('.toast-success');
    await expect(toast).toContainText('Employee E2E User added');
    await settled(toast);
    await expectAligned(toast);
    await expectPlacement(page, toast);
  });

  test('the close button dismisses the toast', async ({ page }) => {
    const toast = await dangerToast(page);
    await toast.getByRole('button', { name: 'Dismiss notification' }).click();
    await expect(toast).toHaveCount(0);
  });

  test('toasts use distinct yellow and red tones, not the neutral surface', async ({ page }) => {
    const warning = await warningToast(page);
    const warnBg = await warning.evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.goto('/employees');
    const danger = await dangerToast(page);
    const badBg = await danger.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(warnBg).not.toBe(badBg);
    expect(warnBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(badBg).not.toBe('rgba(0, 0, 0, 0)');
  });
});
