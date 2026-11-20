import { expect, test } from '@playwright/test';
import { fillLogin, login, requestSignOut, signOut } from './utils';

test.describe('authentication', () => {
  test('login uses no native select', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('select')).toHaveCount(0);
  });

  test('redirects guests to the login page', async ({ page }) => {
    await page.goto('/employees');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('rejects wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'admin', 'nope');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid username or password');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('locks the form for a while after 5 failed attempts', async ({ page }) => {
    await page.goto('/login');

    for (let attempt = 1; attempt <= 5; attempt++) {
      await fillLogin(page, 'admin', `wrong-${attempt}`);
      await page.getByRole('button', { name: 'Sign in' }).click();
      // The app clears the password after a failure; wait for that before the next attempt.
      await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
    }

    const lockedButton = page.getByRole('button', { name: /^Locked/ });
    await expect(lockedButton).toBeDisabled();
    await expect(page.getByText('Too many failed attempts')).toBeVisible();

    const seconds = page.getByTestId('lock-seconds');
    const first = Number(await seconds.textContent());
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThanOrEqual(30);

    // The countdown keeps ticking down.
    await expect
      .poll(async () => Number(await seconds.textContent()), { timeout: 10_000 })
      .toBeLessThan(first);

    // Even the right password is refused while locked.
    await expect(lockedButton).toBeDisabled();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('signs in with the demo credentials and lands on the list', async ({ page }) => {
    await login(page);

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('link', { name: 'Add employee' })).toBeVisible();
  });

  test('signs out through the confirmation dialog', async ({ page }) => {
    await login(page);
    await signOut(page);

    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('cancelling the sign out dialog keeps the session', async ({ page }) => {
    await login(page);
    const dialog = await requestSignOut(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/employees$/);
  });

  test('redirects /login to the list when already signed in', async ({ page }) => {
    await login(page);
    await page.goto('/login');

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible();
  });
});
