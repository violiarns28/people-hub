import { expect, test } from '@playwright/test';
import { listRoot, login, loginAndGo, maskedCell, revealAll, rows } from './utils';

const FIELDS = ['email', 'birth date', 'salary'] as const;

/** Width of the value box before and after revealing one field. */
async function widthsAroundReveal(
  cell: ReturnType<typeof maskedCell>,
  label: (typeof FIELDS)[number],
): Promise<{ masked: number; revealed: number }> {
  const masked = await cell.locator('.swap').boundingBox();
  await cell.getByRole('button', { name: `Show ${label}` }).click();
  await expect(cell.getByRole('button', { name: `Hide ${label}` })).toBeVisible();
  const revealed = await cell.locator('.swap').boundingBox();
  expect(masked, label).not.toBeNull();
  expect(revealed, label).not.toBeNull();
  return { masked: masked!.width, revealed: revealed!.width };
}

test.describe('masked and revealed value boxes have equal width', () => {
  // Salaries run from Rp. 4.000.000,00 (short) up to Rp. 39.650.000,00 (long).
  const orders = [
    { name: 'shortest salaries first', query: 'sort=basicSalary&dir=asc' },
    { name: 'longest salaries first', query: 'sort=basicSalary&dir=desc' },
  ];

  for (const order of orders) {
    test(`list rows, ${order.name}`, async ({ page }) => {
      await loginAndGo(page, `/employees?${order.query}&size=20`);
      await expect(rows(page)).toHaveCount(20);

      for (const index of [0, 3, 9, 14, 19]) {
        const row = rows(page).nth(index);
        for (const label of FIELDS) {
          const { masked, revealed } = await widthsAroundReveal(maskedCell(row, label), label);
          expect(
            Math.abs(masked - revealed),
            `row ${index} ${label}: ${masked} vs ${revealed}`,
          ).toBeLessThanOrEqual(1);
        }
      }
    });
  }

  test('the salary mask is as wide as a long and a short revealed salary', async ({ page }) => {
    await loginAndGo(page, '/employees?sort=basicSalary&dir=asc&size=100');
    const short = maskedCell(rows(page).first(), 'salary').locator('.swap');
    const long = maskedCell(rows(page).last(), 'salary').locator('.swap');
    const shortBox = await short.boundingBox();
    const longBox = await long.boundingBox();
    expect(longBox!.width).toBeGreaterThan(shortBox!.width);

    await revealAll(page);
    await expect(short).toContainText('Rp. 4.000.000,00');
    await expect(long).toContainText(/Rp\. \d{2}\.\d{3}\.000,00/);
    expect(Math.abs((await short.boundingBox())!.width - shortBox!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs((await long.boundingBox())!.width - longBox!.width)).toBeLessThanOrEqual(1);
  });

  test('revealing everything at once does not move any value box', async ({ page }) => {
    await login(page);
    const boxes = () =>
      listRoot(page)
        .locator('.swap')
        .evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x, w: r.width };
          }),
        );
    const before = await boxes();
    expect(before).toHaveLength(30);

    await revealAll(page);
    await expect(listRoot(page).getByText(/@peoplehub\.dev/)).toHaveCount(10);
    const after = await boxes();
    after.forEach((box, i) => {
      expect(Math.abs(box.w - before[i].w), `box ${i} width`).toBeLessThanOrEqual(1);
      expect(Math.abs(box.x - before[i].x), `box ${i} x`).toBeLessThanOrEqual(1);
    });
  });

  for (const username of ['citra.santoso3', 'andi.santoso1', 'wulan.santoso20', 'andi.wijaya21']) {
    test(`detail page of ${username}`, async ({ page }) => {
      await loginAndGo(page, `/employees/${username}`);
      await expect(page.getByRole('button', { name: 'Show email' })).toBeVisible();

      for (const label of FIELDS) {
        const cell = maskedCell(page.locator('main'), label);
        const { masked, revealed } = await widthsAroundReveal(cell, label);
        expect(
          Math.abs(masked - revealed),
          `${label}: ${masked} vs ${revealed}`,
        ).toBeLessThanOrEqual(1);
      }
    });
  }

  test('a revealed birth date in the list uses the dd MMM yyyy format', async ({ page }) => {
    await login(page);
    const cell = maskedCell(rows(page).first(), 'birth date');
    await cell.getByRole('button', { name: 'Show birth date' }).click();
    await expect(cell.locator('.swap')).toHaveText(/^\d{2} [A-Z][a-z]{2} \d{4}$/);
  });
});
