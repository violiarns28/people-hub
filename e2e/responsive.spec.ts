import { expect, test } from '@playwright/test';
import {
  fillLogin,
  expectSingleLineItems,
  hasHorizontalScroll,
  login,
  openUserMenu,
  requestSignOut,
  revealAll,
  rows,
  sidebar,
  submitInvalidForm,
} from './utils';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('narrow screens', () => {
  test('login has no horizontal scroll', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('login with an error and lockout banner has no horizontal scroll', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'admin', 'bad');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('list has no horizontal scroll, even with everything revealed', async ({ page }) => {
    await login(page);
    await expect(rows(page)).toHaveCount(10);
    expect(await hasHorizontalScroll(page)).toBe(false);

    await revealAll(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('add form has no horizontal scroll, with errors showing', async ({ page }) => {
    await login(page);
    await page.goto('/employees/add');
    await expect(page.getByRole('heading', { name: 'Add employee' })).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);

    await submitInvalidForm(page);
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('detail has no horizontal scroll', async ({ page }) => {
    await login(page);
    await page.goto('/employees/citra.santoso3');
    await expect(page.getByRole('heading', { name: 'Citra Santoso' })).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.getByRole('button', { name: 'Show email' }).click();
    await page.getByRole('button', { name: 'Show birth date' }).click();
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('the drawer nav opens from the menu button and closes again', async ({ page }) => {
    await login(page);

    const menu = page.getByRole('button', { name: 'Open menu' });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');

    const drawer = page.getByRole('complementary', { name: 'Primary' });
    await expect(drawer.getByRole('link', { name: 'Employees' })).toBeVisible();
    await expect(drawer.locator('button[aria-haspopup="menu"]')).toBeVisible();

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer.getByRole('link', { name: 'Employees' })).toBeHidden();
  });

  test('the drawer closes with Escape and when a link is chosen', async ({ page }) => {
    await login(page);
    const menu = page.getByRole('button', { name: 'Open menu' });

    await menu.click();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');

    await menu.click();
    await page
      .getByRole('complementary', { name: 'Primary' })
      .getByRole('link', { name: 'Employees' })
      .click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  test('the account menu opens inside the drawer and signs out', async ({ page }) => {
    await login(page);

    const menu = await openUserMenu(page);
    await expect(sidebar(page).getByRole('menu', { name: 'Account' })).toBeVisible();
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(await hasHorizontalScroll(page)).toBe(false);

    await expectSingleLineItems(menu, [/^\s*(Dark|Light) theme\s*$/, /^\s*Sign out\s*$/]);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    const dialog = await requestSignOut(page);
    await dialog.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the filters and sort controls fit without horizontal scroll', async ({ page }) => {
    await login(page);
    for (const name of ['Group', 'Status', 'Sort by']) {
      const box = await page.getByRole('combobox', { name, exact: true }).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(390);
    }
    await page.getByRole('combobox', { name: 'Group', exact: true }).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
