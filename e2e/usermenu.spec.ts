import { expect, test } from '@playwright/test';
import { expectSingleLineItems, login, openUserMenu, requestSignOut, sidebar } from './utils';

test.describe('account menu', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('the sidebar footer button opens a menu with theme and sign out items', async ({ page }) => {
    const menu = await openUserMenu(page);
    const trigger = sidebar(page).locator('button[aria-haspopup="menu"]');

    await expect(trigger).toContainText('admin');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('menuitem')).toHaveCount(2);
    await expect(menu.getByRole('menuitem', { name: /theme$/ })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
  });

  test('the theme item switches the theme and closes the menu', async ({ page }) => {
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    const target = before === 'dark' ? 'light' : 'dark';

    const menu = await openUserMenu(page);
    await menu.getByRole('menuitem', { name: `Switch to ${target} theme` }).click();

    await expect(html).toHaveAttribute('data-theme', target);
    await expect(menu).toBeHidden();
  });

  test('Escape closes the menu and returns focus to the button', async ({ page }) => {
    const menu = await openUserMenu(page);
    const trigger = sidebar(page).locator('button[aria-haspopup="menu"]');

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('Sign out asks for confirmation, then leads to the login page', async ({ page }) => {
    const dialog = await requestSignOut(page);
    await expect(page).toHaveURL(/\/employees/);

    await dialog.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('menu items are single line: Dark or Light theme, and Sign out', async ({ page }) => {
    const menu = await openUserMenu(page);
    await expectSingleLineItems(menu, [/^\s*(Dark|Light) theme\s*$/, /^\s*Sign out\s*$/]);

    const [theme, signOut] = await menu.getByRole('menuitem').all();
    const a = await theme.boundingBox();
    const b = await signOut.boundingBox();
    expect(Math.abs(a!.height - b!.height)).toBeLessThanOrEqual(1);
  });

  test('the theme item label follows the theme and stays a single line', async ({ page }) => {
    const menu = await openUserMenu(page);
    const item = menu.getByRole('menuitem').first();
    const before = (await item.innerText()).trim();
    await item.click();

    const again = await openUserMenu(page);
    const after = (await again.getByRole('menuitem').first().innerText()).trim();
    expect(new Set([before, after])).toEqual(new Set(['Dark theme', 'Light theme']));
    await expectSingleLineItems(again, [/^\s*(Dark|Light) theme\s*$/, /^\s*Sign out\s*$/]);
  });
});
