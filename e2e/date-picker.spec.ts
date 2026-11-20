import { expect, test, type Page } from '@playwright/test';
import { birthTrigger, datePopover, login, openBirthPicker, pickBirthDate } from './utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today as the browser sees it, in yyyy-MM-dd (local time, like the app). */
async function todayIso(page: Page): Promise<string> {
  return page.evaluate(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function display(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

test.describe('birth date picker', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Add employee' }).click();
    await expect(page).toHaveURL(/\/employees\/add$/);
  });

  test('is a custom button combobox, not a native date input', async ({ page }) => {
    await expect(page.locator('input[type="date"], input[type="datetime-local"]')).toHaveCount(0);
    const trigger = birthTrigger(page);
    await expect(trigger).toHaveAttribute('id', 'birthDate');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toContainText('Select date');

    const popover = await openBirthPicker(page);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(popover.getByLabel('Type a date')).toBeVisible();
    await expect(popover.getByRole('grid').first()).toBeVisible();
    await expect(popover.getByRole('button', { name: 'Today' })).toBeVisible();
    await expect(popover.getByRole('button', { name: 'Clear' })).toBeVisible();
  });

  test('typing dd/mm/yyyy picks the date and shows it as 15 May 1990', async ({ page }) => {
    await pickBirthDate(page, '15/05/1990');

    await expect(birthTrigger(page)).toContainText('15 May 1990');
    await expect(birthTrigger(page)).toBeFocused();
    await expect(page.getByText('Birth date is required')).toHaveCount(0);
  });

  test('typing an ISO date works too and has no time part', async ({ page }) => {
    await pickBirthDate(page, '1985-12-01');

    await expect(birthTrigger(page)).toContainText('1 Dec 1985');
    await expect(birthTrigger(page)).not.toContainText(':');
  });

  test('invalid typed text shows an error and keeps the popover open', async ({ page }) => {
    const popover = await openBirthPicker(page);
    const field = popover.getByLabel('Type a date');

    await field.fill('hello');
    await field.press('Enter');
    await expect(popover.getByText('Enter a valid date as dd/mm/yyyy')).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');

    await field.fill('31/02/2000');
    await field.press('Enter');
    await expect(popover.getByText('Enter a valid date as dd/mm/yyyy')).toBeVisible();
    await expect(popover).toBeVisible();
    await expect(birthTrigger(page)).toContainText('Select date');
  });

  test('year grid, month grid, then a day click picks 15 May 1990', async ({ page }) => {
    const popover = await openBirthPicker(page);

    // Day view title -> month grid -> year grid.
    await popover.getByRole('button', { name: /, choose month$/ }).click();
    await expect(popover.getByRole('grid', { name: 'Choose month' })).toBeVisible();
    await popover.getByRole('button', { name: /, choose year$/ }).click();
    const years = popover.getByRole('grid', { name: 'Choose year' });
    await expect(years).toBeVisible();
    await expect(years.getByRole('gridcell')).toHaveCount(12);

    // The year grid pages by 12 years.
    const thisYear = new Date().getFullYear();
    const pages = Math.floor(thisYear / 12) - Math.floor(1990 / 12);
    for (let i = 0; i < pages; i++) {
      await popover.getByRole('button', { name: 'Previous years' }).click();
    }
    await years.getByRole('gridcell', { name: '1990', exact: true }).click();

    // Choosing a year opens the month grid for that year.
    const monthGrid = popover.getByRole('grid', { name: 'Choose month' });
    await expect(monthGrid).toBeVisible();
    await expect(popover.getByRole('button', { name: '1990, choose year' })).toBeVisible();
    await monthGrid.getByRole('gridcell', { name: 'May', exact: true }).click();

    // Choosing a month opens the day grid.
    const days = popover.getByRole('grid', { name: 'May 1990' });
    await expect(days).toBeVisible();
    await days.getByRole('gridcell', { name: '15 May 1990' }).click();

    await expect(popover).toBeHidden();
    await expect(birthTrigger(page)).toContainText('15 May 1990');
  });

  test('previous and next month buttons move the day grid', async ({ page }) => {
    await pickBirthDate(page, '15/05/1990');
    const popover = await openBirthPicker(page);
    await expect(popover.getByRole('grid', { name: 'May 1990' })).toBeVisible();
    await expect(popover.getByRole('gridcell', { name: '15 May 1990' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await popover.getByRole('button', { name: 'Next month' }).click();
    await expect(popover.getByRole('grid', { name: 'June 1990' })).toBeVisible();
    await popover.getByRole('button', { name: 'Previous month' }).click();
    await popover.getByRole('button', { name: 'Previous month' }).click();
    await expect(popover.getByRole('grid', { name: 'April 1990' })).toBeVisible();
    await popover.getByRole('button', { name: 'Next year' }).click();
    await expect(popover.getByRole('grid', { name: 'April 1991' })).toBeVisible();
  });

  test('future days are disabled and future dates are refused', async ({ page }) => {
    const today = await todayIso(page);
    const tomorrow = addDaysIso(today, 1);
    const popover = await openBirthPicker(page);

    await expect(popover.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await expect(popover.getByRole('button', { name: 'Next year' })).toBeDisabled();
    const future = popover.locator(`[role="gridcell"][data-iso="${tomorrow}"]`);
    await expect(future).toHaveAttribute('aria-disabled', 'true');
    await future.click({ force: true });
    await expect(popover).toBeVisible();
    await expect(birthTrigger(page)).toContainText('Select date');

    const field = popover.getByLabel('Type a date');
    await field.fill(tomorrow);
    await field.press('Enter');
    await expect(popover.getByText(/^Date must be between/)).toBeVisible();
    await expect(popover).toBeVisible();

    await field.fill('01/01/2999');
    await field.press('Enter');
    await expect(popover.getByText(/^Date must be between/)).toBeVisible();

    // Today itself is allowed.
    const todayCell = popover.locator(`[role="gridcell"][data-iso="${today}"]`);
    await expect(todayCell).not.toHaveAttribute('aria-disabled', 'true');
    await expect(todayCell).toHaveAttribute('aria-current', 'date');
  });

  test('the year grid disables future years', async ({ page }) => {
    const popover = await openBirthPicker(page);
    await popover.getByRole('button', { name: /, choose month$/ }).click();
    await popover.getByRole('button', { name: /, choose year$/ }).click();

    const years = popover.getByRole('grid', { name: 'Choose year' });
    await expect(popover.getByRole('button', { name: 'Next years' })).toBeDisabled();
    const thisYear = new Date().getFullYear();
    await expect(
      years.getByRole('gridcell', { name: String(thisYear), exact: true }),
    ).not.toHaveAttribute('aria-disabled', 'true');
    await expect(years.locator('[aria-disabled="true"]')).toHaveCount(11 - (thisYear % 12));
  });

  test('Today picks today, Clear empties the field', async ({ page }) => {
    const today = await todayIso(page);
    const popover = await openBirthPicker(page);
    await popover.getByRole('button', { name: 'Today' }).click();
    await expect(popover).toBeHidden();
    await expect(birthTrigger(page)).toContainText(display(today));

    const again = await openBirthPicker(page);
    await again.getByRole('button', { name: 'Clear' }).click();
    await expect(again).toBeHidden();
    await expect(birthTrigger(page)).toContainText('Select date');
  });

  test('keyboard: arrows, Home/End, PageUp/PageDown, Enter and Escape', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'keyboard navigation is a desktop interaction');
    await pickBirthDate(page, '15/05/1990'); // a Tuesday
    const popover = await openBirthPicker(page);
    const focused = popover.locator('[role="gridcell"]:focus');

    await expect(focused).toHaveAttribute('data-iso', '1990-05-15');
    await page.keyboard.press('ArrowRight');
    await expect(focused).toHaveAttribute('data-iso', '1990-05-16');
    await page.keyboard.press('ArrowDown');
    await expect(focused).toHaveAttribute('data-iso', '1990-05-23');
    await page.keyboard.press('ArrowUp');
    await expect(focused).toHaveAttribute('data-iso', '1990-05-16');
    await page.keyboard.press('ArrowLeft');
    await expect(focused).toHaveAttribute('data-iso', '1990-05-15');

    await page.keyboard.press('PageDown');
    await expect(focused).toHaveAttribute('data-iso', '1990-06-15');
    await expect(popover.getByRole('grid', { name: 'June 1990' })).toBeVisible();
    await page.keyboard.press('PageUp');
    await expect(focused).toHaveAttribute('data-iso', '1990-05-15');

    await page.keyboard.press('Home');
    await expect(focused).toHaveAttribute('data-iso', '1990-05-14');
    await page.keyboard.press('End');
    await expect(focused).toHaveAttribute('data-iso', '1990-05-20');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(popover).toBeHidden();
    await expect(birthTrigger(page)).toContainText('21 May 1990');

    await openBirthPicker(page);
    await page.keyboard.press('Escape');
    await expect(datePopover(page)).toBeHidden();
    await expect(birthTrigger(page)).toBeFocused();
    await expect(birthTrigger(page)).toContainText('21 May 1990');
  });

  test('Escape from the typing field also refocuses the trigger', async ({ page }) => {
    const popover = await openBirthPicker(page);
    await popover.getByLabel('Type a date').focus();
    await page.keyboard.press('Escape');

    await expect(popover).toBeHidden();
    await expect(birthTrigger(page)).toBeFocused();
  });

  test('clicking outside closes the popover without changing the value', async ({ page }) => {
    await pickBirthDate(page, '15/05/1990');
    const popover = await openBirthPicker(page);
    await page.getByRole('heading', { name: 'Add employee', level: 1 }).click();

    await expect(popover).toBeHidden();
    await expect(birthTrigger(page)).toContainText('15 May 1990');
  });

  test('stays inside the viewport width', async ({ page }) => {
    const popover = await openBirthPicker(page);
    const box = await popover.boundingBox();
    const width = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  });
});
