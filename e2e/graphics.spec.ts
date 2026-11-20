import { expect, test } from '@playwright/test';
import { login, loginAndGo, openNavIfCollapsed, searchBox, setWidth } from './utils';

test.describe('graphics and polish', () => {
  test('login brand panel has an illustration and three value props', async ({ page }) => {
    await setWidth(page, 1440);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    const panel = page.locator('.brand-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('app-illustration svg').first()).toBeVisible();
    const props = panel.locator('.value-props li');
    await expect(props).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(props.nth(i).locator('svg')).toBeVisible();
      await expect(props.nth(i)).toContainText(/\w{4}/);
    }
  });

  test('an unknown route shows the 404 page inside the shell when signed in', async ({ page }) => {
    await login(page);
    await page.goto('/nope');

    await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
    await expect(page.locator('main app-illustration svg').first()).toBeVisible();
    await expect(page).toHaveURL(/\/nope$/);

    await page.getByRole('link', { name: 'Back to employees' }).click();
    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible();
  });

  test('an unknown route sends a guest to the login page', async ({ page }) => {
    await page.goto('/nope');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('the sidebar shows the workspace card', async ({ page }) => {
    await login(page);
    await openNavIfCollapsed(page);
    const card = page.locator('.workspace-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('PeopleHub workspace');
    await expect(card.locator('svg')).toBeVisible();
  });

  test('the list empty state shows an illustration', async ({ page }) => {
    await login(page);
    await searchBox(page).fill('zzzzzz-no-match');
    const empty = page.locator('section[aria-label="Employee list"]');
    await expect(empty).toContainText('No employees match your filters.');
    await expect(empty.locator('app-illustration svg')).toBeVisible();
  });

  test('no native select and no gradient on the 404 page and the detail banner', async ({
    page,
  }) => {
    await loginAndGo(page, '/employees/citra.santoso3');
    await expect(page.getByRole('heading', { name: 'Citra Santoso', level: 1 })).toBeVisible();
    await expect(page.locator('select')).toHaveCount(0);
    const banner = await page
      .locator('section.card > div')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(banner).not.toContain('gradient');

    await page.goto('/nope');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.locator('select')).toHaveCount(0);
    const gradients = await page.evaluate(
      () =>
        Array.from(document.querySelectorAll('*')).filter((el) =>
          getComputedStyle(el).backgroundImage.includes('gradient'),
        ).length,
    );
    expect(gradients).toBe(0);
  });
});
