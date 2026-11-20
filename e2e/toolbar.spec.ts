import { expect, test } from '@playwright/test';
import {
  boxesOf,
  chooseOption,
  expectSameBoxes,
  loginAndGo,
  settleAnimations,
  rows,
  searchBox,
  setWidth,
} from './utils';

test.describe('list toolbar stability', () => {
  for (const width of [768, 1280, 1440]) {
    test(`at ${width}px controls keep their boxes while filtering and clearing`, async ({
      page,
    }) => {
      await setWidth(page, width);
      await loginAndGo(page, '/employees');
      await expect(rows(page)).toHaveCount(10);

      const controls = {
        search: searchBox(page),
        group: page.getByRole('combobox', { name: 'Group', exact: true }),
        status: page.getByRole('combobox', { name: 'Status', exact: true }),
        clear: page.locator('button[aria-label="Clear filters"]'),
        reveal: page.getByRole('switch', { name: /Reveal sensitive data/ }),
      };
      await settleAnimations(page);
      const initial = await boxesOf(controls);

      // Clear is always rendered on desktop: invisible and disabled without a filter.
      await expect(controls.clear).toBeDisabled();
      await expect(controls.clear).toHaveCSS('visibility', 'hidden');

      await chooseOption(page, 'Group', 'Engineering');
      await expect(controls.clear).toBeEnabled();
      await expect(controls.clear).toHaveCSS('visibility', 'visible');
      await settleAnimations(page);
      expectSameBoxes(initial, await boxesOf(controls), 'after group');

      await chooseOption(page, 'Status', 'Permanent');
      await settleAnimations(page);
      expectSameBoxes(initial, await boxesOf(controls), 'after status');

      await controls.clear.click();
      await expect(controls.clear).toBeDisabled();
      await expect(controls.group).not.toContainText('Engineering');
      await settleAnimations(page);
      expectSameBoxes(initial, await boxesOf(controls), 'after clear');
    });
  }

  test('the rows per page select keeps its width when the size changes', async ({ page }) => {
    await loginAndGo(page, '/employees');
    const size = page.getByRole('combobox', { name: 'Rows per page', exact: true });
    const before = await size.boundingBox();

    for (const option of ['20', '5', '100']) {
      await size.click();
      await page.getByRole('option', { name: option, exact: true }).click();
      await expect(size).toContainText(option);
      const after = await size.boundingBox();
      expect(Math.abs(after!.width - before!.width), `width at ${option}`).toBeLessThanOrEqual(0.5);
    }
  });
});
