import { expect, test } from '@playwright/test';
import { loginAndGo, rows, searchBox } from './utils';

test.describe('employee detail', () => {
  test('masks values until revealed, then formats salary, birth date and age', async ({ page }) => {
    await loginAndGo(page, '/employees/citra.santoso3');
    await expect(page.locator('select')).toHaveCount(0);

    await expect(page.getByRole('heading', { name: 'Citra Santoso' })).toBeVisible();
    await expect(page.getByText('Rp. 4.700.000,00')).toHaveCount(0);

    await page.getByRole('button', { name: 'Show salary' }).click();
    await expect(page.getByText('Rp. 4.700.000,00')).toBeVisible();

    await page.getByRole('button', { name: 'Show birth date' }).click();
    await expect(page.getByText('03 March 1967', { exact: true })).toBeVisible();
    // Age is its own field and shares the reveal state of the birth date.
    await expect(page.getByText(/^\d+ years?$/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide age' })).toBeVisible();
    await expect(page.getByText('09:00')).toHaveCount(0);

    await page.getByRole('button', { name: 'Show email' }).click();
    await expect(page.getByText('citra.santoso3@peoplehub.dev')).toBeVisible();
  });

  test('shows a not found state for an unknown username', async ({ page }) => {
    await loginAndGo(page, '/employees/nobody.here');

    await expect(page.getByText('Employee not found')).toBeVisible();
    await page.getByRole('button', { name: 'Back to list' }).click();
    await expect(page).toHaveURL(/\/employees$/);
  });

  test('OK returns to the list with the previous query params', async ({ page }) => {
    await loginAndGo(
      page,
      '/employees?q=peoplehub&group=Design&sort=basicSalary&dir=desc&size=5&page=2',
    );

    await expect(searchBox(page)).toHaveValue('peoplehub');
    await expect(page.getByText('Showing 6 to 10 of 10')).toBeVisible();
    await expect(rows(page)).toHaveCount(5);

    await rows(page)
      .first()
      .getByRole('link', { name: /^Detail / })
      .click();
    await expect(page).toHaveURL(/\/employees\/[^/?]+\?/);
    await expect(page).toHaveURL(/q=peoplehub/);
    await expect(page.getByRole('button', { name: 'OK' })).toBeVisible();

    await page.getByRole('button', { name: 'OK' }).click();

    await expect(page).toHaveURL(/\/employees\?/);
    for (const param of [
      'q=peoplehub',
      'group=Design',
      'sort=basicSalary',
      'dir=desc',
      'size=5',
      'page=2',
    ]) {
      await expect(page).toHaveURL(new RegExp(param));
    }
    await expect(searchBox(page)).toHaveValue('peoplehub');
    await expect(page.getByText('Showing 6 to 10 of 10')).toBeVisible();
  });

  test('Back to employees link also keeps the query params', async ({ page }) => {
    await loginAndGo(page, '/employees?q=citra');
    await rows(page)
      .first()
      .getByRole('link', { name: /^Detail / })
      .click();
    await page.getByRole('link', { name: 'Back to employees' }).click();

    await expect(page).toHaveURL(/\/employees\?q=citra/);
    await expect(searchBox(page)).toHaveValue('citra');
  });
});
