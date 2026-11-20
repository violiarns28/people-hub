import { expect, test, type Page } from '@playwright/test';
import {
  chooseOption,
  fillEmployeeForm,
  listRoot,
  login,
  loginAndGo,
  pickBirthDate,
  revealAll,
  rowNames,
  rows,
  searchBox,
} from './utils';

const CITRA = 'Citra Santoso';

/** Opens the list narrowed to one employee through the search box. */
async function findByUsername(page: Page, username: string): Promise<void> {
  await searchBox(page).fill(username);
  await expect(page).toHaveURL(/q=/);
  await expect(rows(page)).toHaveCount(1);
}

test.describe('edit', () => {
  test('row Edit opens a prefilled form and keeps the query params', async ({ page }) => {
    await login(page);
    await chooseOption(page, 'Group', 'Design');
    await findByUsername(page, 'citra.santoso3');

    await rows(page)
      .first()
      .getByRole('button', { name: `Edit ${CITRA}` })
      .click();

    await expect(page).toHaveURL(/\/employees\/citra\.santoso3\/edit\?/);
    await expect(page).toHaveURL(/q=citra\.santoso3/);
    await expect(page).toHaveURL(/group=Design/);
    await expect(page.getByRole('heading', { name: 'Edit employee', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save employee' })).toHaveCount(0);

    const username = page.getByLabel('Username', { exact: true });
    await expect(username).toHaveValue('citra.santoso3');
    await expect(username).toHaveAttribute('aria-readonly', 'true');
    await expect(username).not.toBeEditable();
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
      'citra.santoso3@peoplehub.dev',
    );
    await expect(page.getByLabel('First name')).toHaveValue('Citra');
    await expect(page.getByLabel('Last name')).toHaveValue('Santoso');
    await expect(page.getByRole('combobox', { name: 'Birth date', exact: true })).toContainText(
      '3 Mar 1967',
    );
    await expect(page.getByLabel('Basic salary (IDR)')).toHaveValue('4.700.000');
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).not.toContainText(
      'Select',
    );
    await expect(page.getByRole('combobox', { name: 'Group', exact: true })).toContainText(
      'Design',
    );
  });

  test('saving shows a yellow toast, returns to the list with the search kept and the new data', async ({
    page,
  }) => {
    await login(page);
    await findByUsername(page, 'citra.santoso3');
    await rows(page)
      .first()
      .getByRole('button', { name: `Edit ${CITRA}` })
      .click();
    await expect(page.getByLabel('First name')).toHaveValue('Citra');

    await page.getByLabel('First name').fill('Citrine');
    await pickBirthDate(page, '01/02/1985');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page).toHaveURL(/\/employees\?/);
    await expect(page).toHaveURL(/q=citra\.santoso3/);
    await expect(page.locator('.toast-warning')).toContainText('Updated Citrine Santoso');
    await expect(searchBox(page)).toHaveValue('citra.santoso3');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Citrine Santoso');

    await revealAll(page);
    await expect(rows(page).first()).toContainText('01 Feb 1985');
    await expect(page.getByTestId('count')).toHaveText('1 of 100 employees');
  });

  test('an unchanged edit can be cancelled without a discard prompt', async ({ page }) => {
    await loginAndGo(page, '/employees/citra.santoso3/edit?q=citra');
    await expect(page.getByLabel('First name')).toHaveValue('Citra');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/employees\?q=citra/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('an unknown username shows the not found state', async ({ page }) => {
    await loginAndGo(page, '/employees/nobody.here/edit');

    await expect(page.getByText('Employee not found')).toBeVisible();
    await page.getByRole('button', { name: 'Back to list' }).click();
    await expect(page).toHaveURL(/\/employees(\?.*)?$/);
  });

  test('the detail page has an Edit button that keeps the query params', async ({ page }) => {
    await loginAndGo(page, '/employees?q=citra');
    await rows(page)
      .first()
      .getByRole('link', { name: /^Detail / })
      .click();
    await page.getByRole('link', { name: 'Edit', exact: true }).click();

    await expect(page).toHaveURL(/\/employees\/[^/?]+\/edit\?q=citra/);
    await expect(page.getByRole('heading', { name: 'Edit employee', level: 1 })).toBeVisible();
  });
});

test.describe('delete', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('the confirm dialog names the employee, Cancel keeps the row', async ({ page }) => {
    const [name] = await rowNames(page);
    await rows(page)
      .first()
      .getByRole('button', { name: `Delete ${name}` })
      .click();

    const dialog = page.getByRole('dialog', { name: 'Delete employee' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(name);
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('count')).toHaveText('100 employees');
    expect((await rowNames(page))[0]).toBe(name);
    await expect(page.locator('.toast-danger')).toHaveCount(0);
  });

  test('Escape also cancels the delete dialog', async ({ page }) => {
    const [name] = await rowNames(page);
    await rows(page)
      .first()
      .getByRole('button', { name: `Delete ${name}` })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Delete employee' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('count')).toHaveText('100 employees');
  });

  test('Delete removes the row, shows a red toast and drops the total, also after reload', async ({
    page,
  }) => {
    const [name] = await rowNames(page);
    await rows(page)
      .first()
      .getByRole('button', { name: `Delete ${name}` })
      .click();
    await page
      .getByRole('dialog', { name: 'Delete employee' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();

    await expect(page.locator('.toast-danger')).toContainText(`Deleted ${name}`);
    await expect(page.getByTestId('count')).toHaveText('99 employees');
    await expect(page.getByText('Showing 1 to 10 of 99')).toBeVisible();
    await expect(rows(page)).toHaveCount(10);
    expect(await rowNames(page)).not.toContain(name);

    await page.reload();
    await expect(page.getByTestId('count')).toHaveText('99 employees');
    expect(await rowNames(page)).not.toContain(name);
  });

  test('deleting the only row of the last page clamps to the previous page', async ({ page }) => {
    // Eleven Design employees with five per page leave a single row on page 3.
    await page.goto('/employees/add');
    await fillEmployeeForm(page, {
      username: 'last.page',
      email: 'last.page@peoplehub.dev',
      firstName: 'Last',
      lastName: 'Page',
      birthDate: '1991-01-01',
      salaryDigits: '5000000',
      status: 'Intern',
      group: 'Design',
      description: 'Only row on the last page',
    });
    await page.getByRole('button', { name: 'Save employee' }).click();
    await expect(page).toHaveURL(/\/employees$/);

    await page.goto('/employees?group=Design&size=5&page=3&sort=firstName&dir=desc');
    await expect(page.getByText('Showing 11 to 11 of 11')).toBeVisible();
    await expect(rows(page)).toHaveCount(1);
    const [name] = await rowNames(page);

    await rows(page)
      .first()
      .getByRole('button', { name: `Delete ${name}` })
      .click();
    await page
      .getByRole('dialog', { name: 'Delete employee' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();

    await expect(page.locator('.toast-danger')).toContainText(`Deleted ${name}`);
    await expect(page.getByText('Showing 6 to 10 of 10')).toBeVisible();
    await expect(rows(page)).toHaveCount(5);
    await expect(page.getByTestId('count')).toHaveText('10 of 100 employees');
  });

  test('the detail page deletes too and returns to the list with the params', async ({ page }) => {
    await page.goto('/employees?q=citra&group=Design');
    await expect(rows(page)).toHaveCount(5);
    const [name] = await rowNames(page);
    await rows(page)
      .first()
      .getByRole('link', { name: /^Detail / })
      .click();
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete employee?' });
    await expect(dialog).toContainText(name);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/employees\/[^/?]+\?/);

    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page).toHaveURL(/\/employees\?/);
    await expect(page).toHaveURL(/q=citra/);
    await expect(page).toHaveURL(/group=Design/);
    await expect(page.locator('.toast-danger')).toContainText(`Deleted ${name}`);
    await expect(rows(page)).toHaveCount(4);
    await expect(page.getByTestId('count')).toHaveText('4 of 99 employees');
  });
});

test.describe('add, edit, delete flow', () => {
  test('a new employee can be edited and then deleted', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Add employee' }).click();
    await fillEmployeeForm(page);
    await page.getByRole('button', { name: 'Save employee' }).click();
    await expect(page.locator('.toast-success')).toContainText('Employee E2E User added');
    await expect(page.getByTestId('count')).toHaveText('101 employees');

    await findByUsername(page, 'e2e.user');
    await rows(page).first().getByRole('button', { name: 'Edit E2E User' }).click();
    await expect(page).toHaveURL(/\/employees\/e2e\.user\/edit\?q=e2e\.user/);
    await expect(page.getByLabel('Last name')).toHaveValue('User');
    await page.getByLabel('Last name').fill('Changed');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.locator('.toast-warning')).toContainText('Updated E2E Changed');
    await expect(rows(page).first()).toContainText('E2E Changed');
    await expect(page.getByTestId('count')).toHaveText('1 of 101 employees');

    await rows(page).first().getByRole('button', { name: 'Delete E2E Changed' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete employee' });
    await expect(dialog).toContainText('E2E Changed');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.locator('.toast-danger')).toContainText('Deleted E2E Changed');
    await expect(page.getByText('No employees match your filters.')).toBeVisible();
    await expect(page.getByTestId('count')).toHaveText('0 of 100 employees');

    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.getByTestId('count')).toHaveText('100 employees');
    await expect(listRoot(page).getByText('E2E Changed')).toHaveCount(0);
  });

  test('the stored birth date is yyyy-MM-dd with no time', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Add employee' }).click();
    await fillEmployeeForm(page);
    await page.getByRole('button', { name: 'Save employee' }).click();
    await expect(page).toHaveURL(/\/employees$/);

    const stored = await page.evaluate(() =>
      Object.keys(localStorage)
        .map((key) => localStorage.getItem(key) ?? '')
        .find((value) => value.includes('"e2e.user"')),
    );
    expect(stored).toBeDefined();
    const record = (JSON.parse(stored!) as { username: string; birthDate: string }[]).find(
      (item) => item.username === 'e2e.user',
    );
    expect(record?.birthDate).toBe('1990-05-15');
  });
});
