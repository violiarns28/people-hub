import { expect, test } from '@playwright/test';
import {
  chooseOption,
  fillEmployeeForm,
  groupSearch,
  login,
  pickGroup,
  revealAll,
  rows,
  searchBox,
  SAMPLE_EMPLOYEE,
  submitInvalidForm,
} from './utils';

const GROUPS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'People & Culture',
  'Operations',
  'Legal',
  'Customer Support',
];

test.describe('add employee', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Add employee' }).click();
    await expect(page).toHaveURL(/\/employees\/add$/);
  });

  test('blocks an empty save and shows every error', async ({ page }) => {
    await submitInvalidForm(page);

    const summary = page.getByRole('alert');
    await expect(summary).toContainText('Please fix 9 issues before saving');
    await expect(page).toHaveURL(/\/employees\/add$/);
    await expect(page.getByText('Username is required').first()).toBeVisible();
    await expect(page.getByText('Email is required').first()).toBeVisible();
    await expect(page.getByText('Birth date is required').first()).toBeVisible();
    await expect(page.getByText('Basic salary must be greater than 0').first()).toBeVisible();
    await expect(page.getByText('Group is required').first()).toBeVisible();
    await expect(page.getByLabel('Username', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('rejects an invalid email', async ({ page }) => {
    const email = page.getByLabel('Email', { exact: true });
    await email.fill('not-an-email');
    await email.blur();

    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await email.fill('ok@peoplehub.dev');
    await expect(page.getByText('Enter a valid email address')).toBeHidden();
  });

  test('accepts digits only in the salary and groups thousands', async ({ page }) => {
    const salary = page.getByLabel('Basic salary (IDR)');
    await salary.pressSequentially('12ab,3-4x5678');

    await expect(salary).toHaveValue('12.345.678');
  });

  test('group dropdown has a search box on top and filters the 10 groups', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Group', exact: true }).click();

    const search = groupSearch(page);
    const list = page.getByRole('listbox', { name: 'Select a group' });
    await expect(list.getByRole('option')).toHaveCount(10);
    await expect(list.getByRole('option')).toHaveText(GROUPS);

    const searchBox = await search.boundingBox();
    const listBox = await list.boundingBox();
    expect(searchBox && listBox && searchBox.y < listBox.y).toBeTruthy();

    await search.fill('eng');
    await expect(list.getByRole('option')).toHaveCount(1);
    await expect(list.getByRole('option', { name: 'Engineering' })).toBeVisible();

    await search.fill('zzz');
    await expect(page.getByText('No results')).toBeVisible();
  });

  test('uses custom selects only, no native select element', async ({ page }) => {
    await expect(page.locator('select')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Group', exact: true })).toBeVisible();
  });

  test('the status select lists the statuses and keeps the choice', async ({ page }) => {
    await chooseOption(page, 'Status', 'Contract');
    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    await expect(page.getByRole('option', { name: 'Contract', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
  });

  test('focuses the group search box as soon as the dropdown opens', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Group', exact: true }).click();

    await expect(groupSearch(page)).toBeFocused();
  });

  test('keyboard Enter selects the highlighted group', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: 'Group', exact: true });
    await combo.focus();
    await combo.press('ArrowDown');

    const search = groupSearch(page);
    await search.focus();
    await search.pressSequentially('sup');
    await search.press('Enter');

    await expect(combo).toContainText('Customer Support');
    await expect(page.getByRole('listbox', { name: 'Select a group' })).toBeHidden();
  });

  test('arrow keys move the highlight before Enter selects', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: 'Group', exact: true });
    await combo.focus();
    await combo.press('ArrowDown');

    const search = groupSearch(page);
    await search.focus();
    await search.press('ArrowDown');
    await search.press('ArrowDown');
    await search.press('Enter');

    await expect(combo).toContainText('Design');
  });

  test('shows an error for a username that is already taken', async ({ page }) => {
    const username = page.getByLabel('Username', { exact: true });
    await username.fill('andi.santoso1');
    await username.blur();

    await expect(page.getByText('Username is already taken')).toBeVisible();
    await username.fill('ANDI.SANTOSO1');
    await expect(page.getByText('Username is already taken')).toBeVisible();
    await username.fill('brand.new.person');
    await expect(page.getByText('Username is already taken')).toBeHidden();
  });

  test('saves a valid employee, toasts and finds it in the list', async ({ page }) => {
    await fillEmployeeForm(page);
    await page.getByRole('button', { name: 'Save employee' }).click();

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.locator('.toast-success')).toContainText('Employee E2E User added');
    await expect(page.getByTestId('count')).toHaveText('101 employees');

    await searchBox(page).fill(SAMPLE_EMPLOYEE.username);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('E2E User');
    await expect(rows(page).first()).toContainText('Engineering');

    // The stored birth date has no time part and shows as dd MMM yyyy.
    await revealAll(page);
    await expect(rows(page).first()).toContainText('15 May 1990');
    await expect(rows(page).first()).not.toContainText('10:30');
  });

  test('Cancel on a dirty form asks before discarding', async ({ page }) => {
    await page.getByLabel('Username', { exact: true }).fill('half.done');
    await page.getByRole('button', { name: 'Cancel' }).click();

    const dialog = page.getByRole('dialog', { name: 'Discard changes?' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/employees\/add$/);
    await expect(page.getByLabel('Username', { exact: true })).toHaveValue('half.done');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await dialog.getByRole('button', { name: 'Discard' }).click();
    await expect(page).toHaveURL(/\/employees$/);
  });

  test('Cancel on a clean form goes straight back', async ({ page }) => {
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('picking a group by clicking an option works too', async ({ page }) => {
    await pickGroup(page, 'Legal');
    await expect(page.getByRole('combobox', { name: 'Group', exact: true })).toContainText('Legal');
  });
});
