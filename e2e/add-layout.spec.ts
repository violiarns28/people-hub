import { expect, test, type Page } from '@playwright/test';
import {
  birthTrigger,
  fillEmployeeForm,
  hasHorizontalScroll,
  login,
  loginAndGo,
  setWidth,
} from './utils';

const ORDER = ['Identity', 'Employment', 'Compensation', 'Notes'];

function section(page: Page, heading: string) {
  return page.locator('form section').filter({
    has: page.getByRole('heading', { name: heading, level: 2, exact: true }),
  });
}

async function expectStructure(page: Page): Promise<void> {
  await expect(page.locator('form section h2')).toHaveText(ORDER);

  const identity = section(page, 'Identity');
  const compensation = section(page, 'Compensation');
  await expect(identity.getByRole('combobox', { name: 'Birth date', exact: true })).toHaveCount(1);
  await expect(compensation.getByRole('combobox', { name: 'Birth date', exact: true })).toHaveCount(
    0,
  );
  await expect(birthTrigger(page)).toBeVisible();

  // The birth date trigger sits under the Identity heading in the DOM, not under Compensation.
  const owner = await birthTrigger(page).evaluate(
    (el) => el.closest('section')?.querySelector('h2')?.textContent?.trim() ?? '',
  );
  expect(owner).toBe('Identity');

  // Compensation holds only the basic salary.
  await expect(compensation.locator('label')).toHaveText(['Basic salary (IDR)']);
  await expect(compensation.locator('input, textarea, select, [role="combobox"]')).toHaveCount(1);
  await expect(compensation.getByLabel('Basic salary (IDR)')).toBeVisible();
}

for (const mode of ['add', 'edit'] as const) {
  const path = mode === 'add' ? '/employees/add' : '/employees/citra.santoso3/edit';

  test.describe(`${mode} form layout`, () => {
    test('sections are Identity, Employment, Compensation, Notes with Birth date in Identity', async ({
      page,
    }) => {
      await loginAndGo(page, path);
      await expect(
        page.getByRole('heading', {
          name: mode === 'add' ? 'Add employee' : 'Edit employee',
          level: 1,
        }),
      ).toBeVisible();
      await expectStructure(page);
    });

    for (const width of [360, 390, 768, 1024, 1280, 1440]) {
      test(`no horizontal overflow at ${width}px and the rail matches the breakpoint`, async ({
        page,
      }) => {
        await setWidth(page, width);
        await loginAndGo(page, path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        expect(await hasHorizontalScroll(page)).toBe(false);

        const rail = page.getByRole('complementary', { name: 'Form progress' });
        if (width >= 1024) {
          await expect(rail).toBeVisible();
          await expect(rail.locator('app-illustration svg')).toBeVisible();
          await expect(rail.getByText('Checklist')).toBeVisible();
          const form = (await page.locator('form').boundingBox())!;
          const box = (await rail.boundingBox())!;
          expect(box.x, 'rail beside the form').toBeGreaterThanOrEqual(form.x + form.width - 1);
          expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
        } else {
          await expect(rail).toBeHidden();
        }
      });
    }
  });
}

test.describe('add form rail and save', () => {
  test('checklist ticks as fields become valid', async ({ page }) => {
    await setWidth(page, 1280);
    await loginAndGo(page, '/employees/add');
    const rail = page.getByRole('complementary', { name: 'Form progress' });
    const rows = rail.locator('.check-row');
    await expect(rows).toHaveCount(9);
    await expect(rail.locator('.check-row.ok')).toHaveCount(0);
    await expect(rail.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    const username = rail.locator('.check-row', { hasText: 'Username' });
    await page.getByLabel('Username', { exact: true }).fill('rail.check');
    await expect(username).toHaveClass(/ok/);
    await expect(rail.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    const email = rail.locator('.check-row', { hasText: 'Email' });
    await page.getByLabel('Email', { exact: true }).fill('nope');
    await expect(email).not.toHaveClass(/ok/);
    await page.getByLabel('Email', { exact: true }).fill('rail.check@peoplehub.dev');
    await expect(email).toHaveClass(/ok/);

    await page.getByLabel('Username', { exact: true }).fill('');
    await expect(username).not.toHaveClass(/ok/);
  });

  test('a complete form shows the success state on save, then returns to the list', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/employees/add');
    await fillEmployeeForm(page);
    const save = page.getByRole('button', { name: 'Save employee' });
    await expect(save).toBeEnabled();

    // The success state is brief, so record it instead of polling for it.
    await page.evaluate(() => {
      const w = window as unknown as { __saved: boolean };
      w.__saved = false;
      new MutationObserver(() => {
        if (document.querySelector('button.is-success')) {
          w.__saved = true;
        }
      }).observe(document.body, { subtree: true, attributes: true, childList: true });
    });
    await save.click();
    await expect(page).toHaveURL(/\/employees(\?.*)?$/);
    expect(await page.evaluate(() => (window as unknown as { __saved: boolean }).__saved)).toBe(
      true,
    );
  });
});
