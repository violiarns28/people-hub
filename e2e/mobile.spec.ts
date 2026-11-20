import { expect, test, type Page } from '@playwright/test';
import { fillLogin, hasHorizontalScroll, login, revealAll, rows, searchBox } from './utils';

const WIDTHS = [360, 390, 412];

async function open(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 800 });
}

test.describe('compact mobile list', () => {
  for (const width of WIDTHS) {
    test(`at ${width}px the list is a card list, the table is hidden`, async ({ page }) => {
      await open(page, width);
      await login(page);

      await expect(page.getByTestId('employee-card')).toHaveCount(10);
      await expect(page.getByTestId('employee-card').first()).toBeVisible();
      await expect(page.locator('table')).toBeHidden();
      await expect(page.locator('thead')).toBeHidden();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    test(`at ${width}px every card is shorter than 190px, masked and revealed`, async ({
      page,
    }) => {
      await open(page, width);
      await login(page);

      const heights = async () =>
        page
          .getByTestId('employee-card')
          .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));

      for (const height of await heights()) {
        expect(height).toBeLessThan(190);
        expect(height).toBeGreaterThan(80);
      }
      await revealAll(page);
      for (const height of await heights()) {
        expect(height).toBeLessThan(190);
      }
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    test(`at ${width}px the card actions are 44px touch targets`, async ({ page }) => {
      await open(page, width);
      await login(page);

      const card = rows(page).first();
      const actions = [
        card.getByRole('link', { name: /^Detail / }),
        card.getByRole('button', { name: /^Edit / }),
        card.getByRole('button', { name: /^Delete / }),
      ];
      for (const action of actions) {
        const box = await action.boundingBox();
        expect(box, 'card action').not.toBeNull();
        expect(Math.abs(box!.width - 44), 'action width').toBeLessThanOrEqual(0.5);
        expect(Math.abs(box!.height - 44), 'action height').toBeLessThanOrEqual(0.5);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
    });

    test(`at ${width}px the toolbar fits and the reveal switch label is on one line`, async ({
      page,
    }) => {
      await open(page, width);
      await login(page);

      const toggle = page.getByRole('switch', { name: /Reveal sensitive data/ });
      const label = toggle.getByText('Reveal sensitive data');
      const toggleBox = await toggle.boundingBox();
      const labelBox = await label.boundingBox();
      expect(toggleBox!.height).toBeLessThan(48);
      expect(labelBox!.height).toBeLessThan(30);

      const controls = [
        searchBox(page),
        page.getByRole('combobox', { name: 'Group', exact: true }),
        page.getByRole('combobox', { name: 'Status', exact: true }),
        page.getByRole('combobox', { name: 'Sort by', exact: true }),
        toggle,
      ];
      for (const control of controls) {
        const box = await control.boundingBox();
        expect(box, 'toolbar control').not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }

  test('a card shows name, username, status, email, salary, birth date and group', async ({
    page,
  }) => {
    await open(page, 390);
    await login(page);
    await searchBox(page).fill('citra.santoso3');
    const card = page.getByTestId('employee-card');
    await expect(card).toHaveCount(1);

    await expect(card).toContainText('Citra Santoso');
    await expect(card).toContainText('@citra.santoso3');
    await expect(card).toContainText('Salary');
    await expect(card).toContainText('Birth date');
    await expect(card).toContainText('Design');
    await expect(card.getByRole('button', { name: 'Show email' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Show salary' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Show birth date' })).toBeVisible();
  });
});

test.describe('no horizontal scroll on narrow screens', () => {
  for (const width of WIDTHS) {
    test(`at ${width}px login, list, add, edit and detail fit`, async ({ page }) => {
      await open(page, width);

      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      expect(await hasHorizontalScroll(page), 'login').toBe(false);

      await fillLogin(page, 'admin', 'wrong');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(await hasHorizontalScroll(page), 'login error').toBe(false);

      await login(page);
      expect(await hasHorizontalScroll(page), 'list').toBe(false);
      await revealAll(page);
      expect(await hasHorizontalScroll(page), 'list revealed').toBe(false);

      await page.goto('/employees/add');
      await expect(page.getByRole('heading', { name: 'Add employee', level: 1 })).toBeVisible();
      expect(await hasHorizontalScroll(page), 'add').toBe(false);

      await page.goto('/employees/citra.santoso3/edit');
      await expect(page.getByRole('heading', { name: 'Edit employee', level: 1 })).toBeVisible();
      await expect(page.getByLabel('First name')).toHaveValue('Citra');
      expect(await hasHorizontalScroll(page), 'edit').toBe(false);

      await page.goto('/employees/citra.santoso3');
      await expect(page.getByRole('heading', { name: 'Citra Santoso', level: 1 })).toBeVisible();
      await page.getByRole('button', { name: 'Show email' }).click();
      await page.getByRole('button', { name: 'Show birth date' }).click();
      await page.getByRole('button', { name: 'Show salary' }).click();
      expect(await hasHorizontalScroll(page), 'detail').toBe(false);
    });

    test(`at ${width}px the date picker popover and delete dialog fit`, async ({ page }) => {
      await open(page, width);
      await login(page, '/login');
      await page.goto('/employees/add');
      await page.getByRole('combobox', { name: 'Birth date', exact: true }).click();
      const popover = page.getByRole('dialog', { name: 'Choose date' });
      await expect(popover).toBeVisible();
      const box = await popover.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await hasHorizontalScroll(page), 'picker').toBe(false);

      await page.goto('/employees');
      await rows(page)
        .first()
        .getByRole('button', { name: /^Delete / })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Delete employee' });
      await expect(dialog).toBeVisible();
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(width);
    });
  }
});
