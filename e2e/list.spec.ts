import { expect, test, type Page } from '@playwright/test';
import {
  chooseOption,
  isCompactList,
  listRoot,
  login,
  parseRupiah,
  revealAll,
  rows,
  searchBox,
  sortBy,
} from './utils';

const columnLabels = ['Name', 'Email', 'Birth date', 'Basic salary', 'Group', 'Status'];

/** Bounding boxes of the column header cells, used to detect any layout shift. */
async function headerBoxes(page: Page): Promise<{ x: number; width: number }[]> {
  return page.locator('thead th').evaluateAll((els) =>
    els.map((el) => ({
      x: el.getBoundingClientRect().x,
      width: el.getBoundingClientRect().width,
    })),
  );
}

async function tableWidth(page: Page): Promise<number> {
  return page.locator('table').evaluate((el) => el.getBoundingClientRect().width);
}

test.describe('employee list', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('shows 100 employees and 10 rows by default', async ({ page }) => {
    await expect(page.getByTestId('count')).toHaveText('100 employees');
    await expect(page.getByText('Showing 1 to 10 of 100')).toBeVisible();
    await expect(rows(page)).toHaveCount(10);
  });

  test('has no native select, no filter chips and no stat cards', async ({ page }) => {
    await expect(page.locator('select')).toHaveCount(0);
    for (const name of ['Group', 'Status', 'Rows per page']) {
      await expect(page.getByRole('combobox', { name, exact: true })).toBeVisible();
    }

    await searchBox(page).fill('citra');
    await expect(page).toHaveURL(/q=citra/);
    await chooseOption(page, 'Group', 'Design');
    await expect(page.getByText('Search:')).toHaveCount(0);
    await expect(page.getByText('Group:')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
    await expect(page.getByTestId('stat-total')).toHaveCount(0);
  });

  test('keeps search, Group, Status, Clear and the reveal switch in one row', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'the toolbar wraps on narrow screens');

    await chooseOption(page, 'Status', 'Permanent');
    await expect(page).toHaveURL(/status=Permanent/);
    const items = [
      searchBox(page),
      page.getByRole('combobox', { name: 'Group', exact: true }),
      page.getByRole('combobox', { name: 'Status', exact: true }),
      page.getByRole('button', { name: 'Clear filters' }),
      page.getByRole('switch', { name: /Reveal sensitive data/ }),
    ];
    const centers: number[] = [];
    for (const item of items) {
      await expect(item).toBeVisible();
      const box = await item.boundingBox();
      expect(box).not.toBeNull();
      centers.push(box!.y + box!.height / 2);
    }
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(4);
  });

  test('shows Clear only while a filter is active', async ({ page }) => {
    const clear = page.getByRole('button', { name: 'Clear filters' });
    await expect(clear).toBeHidden();

    await chooseOption(page, 'Group', 'Design');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(clear).toBeHidden();
  });

  test('changes the page size and moves to the next page', async ({ page }) => {
    await chooseOption(page, 'Rows per page', '20');
    await expect(rows(page)).toHaveCount(20);
    await expect(page.getByText('Showing 1 to 20 of 100')).toBeVisible();

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText('Showing 21 to 40 of 100')).toBeVisible();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/size=20/);

    await chooseOption(page, 'Rows per page', '50');
    await expect(rows(page)).toHaveCount(50);
    await expect(page.getByText('Showing 1 to 50 of 100')).toBeVisible();
  });

  test('sorts by basic salary ascending, then descending', async ({ page, isMobile }) => {
    await chooseOption(page, 'Rows per page', '50');
    await expect(rows(page)).toHaveCount(50);
    await revealAll(page);

    const salaries = async () =>
      (
        await listRoot(page)
          .getByText(/^Rp\. [\d.]+,\d{2}$/)
          .allTextContents()
      ).map(parseRupiah);

    await sortBy(page, 'Basic salary');
    await expect(page).toHaveURL(/sort=basicSalary/);
    await expect(page).toHaveURL(/dir=asc/);
    await expect(async () => {
      const values = await salaries();
      expect(values).toHaveLength(50);
      expect(values).toEqual([...values].sort((a, b) => a - b));
      expect(values[0]).toBe(4_000_000);
    }).toPass();

    if (isMobile) {
      await page.getByRole('button', { name: /^Sorted ascending/ }).click();
    } else {
      await sortBy(page, 'Basic salary');
    }
    await expect(page).toHaveURL(/dir=desc/);
    await expect(async () => {
      const values = await salaries();
      expect(values).toEqual([...values].sort((a, b) => b - a));
      expect(values[0]).toBeGreaterThan(values[values.length - 1]);
    }).toPass();
  });

  test('header sort is tri-state: ascending, descending, then cleared', async ({ page }) => {
    test.skip(await isCompactList(page), 'cards have no column headers');
    const header = page.getByRole('columnheader', { name: 'Basic salary' });
    await expect(header).toHaveAttribute('aria-sort', 'none');

    await page.getByRole('button', { name: 'Basic salary', exact: true }).click();
    await expect(page).toHaveURL(/sort=basicSalary/);
    await expect(page).toHaveURL(/dir=asc/);
    await expect(header).toHaveAttribute('aria-sort', 'ascending');

    await page.getByRole('button', { name: 'Basic salary', exact: true }).click();
    await expect(page).toHaveURL(/dir=desc/);
    await expect(header).toHaveAttribute('aria-sort', 'descending');

    await page.getByRole('button', { name: 'Basic salary', exact: true }).click();
    await expect(page).not.toHaveURL(/sort=/);
    await expect(page).not.toHaveURL(/dir=/);
    await expect(header).toHaveAttribute('aria-sort', 'none');
  });

  test('compact sort: Default order, a column, and a direction button', async ({ page }) => {
    test.skip(!(await isCompactList(page)), 'desktop sorts from the column headers');
    const sortSelect = page.getByRole('combobox', { name: 'Sort by', exact: true });
    const direction = page.getByRole('button', { name: /^Sort direction/ });
    await expect(sortSelect).toContainText('Default order');
    await expect(direction).toBeDisabled();

    await chooseOption(page, 'Sort by', 'Basic salary');
    await expect(page).toHaveURL(/sort=basicSalary/);
    await expect(page).toHaveURL(/dir=asc/);
    const flip = page.getByRole('button', { name: /^Sorted ascending/ });
    await expect(flip).toBeEnabled();

    await flip.click();
    await expect(page).toHaveURL(/dir=desc/);
    await page.getByRole('button', { name: /^Sorted descending/ }).click();
    await expect(page).not.toHaveURL(/sort=/);
    await expect(page).not.toHaveURL(/dir=/);
    await expect(sortSelect).toContainText('Default order');
    await expect(page.getByRole('button', { name: /^Sort direction/ })).toBeDisabled();

    await chooseOption(page, 'Sort by', 'Basic salary');
    await chooseOption(page, 'Sort by', 'Default order');
    await expect(page).not.toHaveURL(/sort=/);
  });

  test('sorts by name from the header', async ({ page }) => {
    const names = async () =>
      await rows(page)
        .getByRole('link', { name: /^Detail / })
        .evaluateAll((els) =>
          els.map((el) => (el.getAttribute('aria-label') ?? '').replace('Detail ', '')),
        );

    await sortBy(page, 'Name');
    await expect(page).toHaveURL(/sort=firstName/);
    await expect(async () => {
      const firstNames = (await names()).map((name) => name.split(' ')[0]);
      expect(firstNames).toEqual([...firstNames].sort((a, b) => a.localeCompare(b)));
    }).toPass();
    const firstAscending = (await names())[0];

    if (!(await isCompactList(page))) {
      await sortBy(page, 'Name');
      await expect(page).toHaveURL(/dir=desc/);
      await expect(async () => {
        expect((await names())[0]).not.toBe(firstAscending);
      }).toPass();
    }
  });

  test('combines search and group filter with AND, and Clear resets everything', async ({
    page,
  }) => {
    await searchBox(page).fill('citra');
    await expect(page).toHaveURL(/q=citra/);
    await expect(rows(page)).toHaveCount(5);

    await chooseOption(page, 'Group', 'Design');
    await expect(page).toHaveURL(/group=Design/);
    await expect(page).toHaveURL(/q=citra/);
    await expect(rows(page)).toHaveCount(5);

    await chooseOption(page, 'Group', 'Engineering');
    await expect(page).toHaveURL(/group=Engineering/);
    await expect(page.getByText('No employees match your filters.')).toBeVisible();
    await expect(page.getByText('Showing 0 to 0 of 0')).toBeVisible();
    await expect(page.getByTestId('count')).toHaveText('0 of 100 employees');

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).not.toHaveURL(/q=|group=|status=/);
    await expect(searchBox(page)).toHaveValue('');
    await expect(page.getByRole('combobox', { name: 'Group', exact: true })).toContainText(
      'All groups',
    );
    await expect(page.getByText('Showing 1 to 10 of 100')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeHidden();
  });

  test('filters by status and combines it with group', async ({ page }) => {
    await chooseOption(page, 'Status', 'Intern');
    await expect(page).toHaveURL(/status=Intern/);
    await expect(rows(page).first()).toBeVisible();
    await expect(async () => {
      const texts = await rows(page).allTextContents();
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.every((text) => text.includes('Intern'))).toBe(true);
    }).toPass();

    await chooseOption(page, 'Group', 'Design');
    await expect(page).toHaveURL(/group=Design/);
    await expect(page).toHaveURL(/status=Intern/);
  });

  test('Detail link keeps the query params', async ({ page }) => {
    await searchBox(page).fill('citra');
    await expect(page).toHaveURL(/q=citra/);
    await chooseOption(page, 'Group', 'Design');
    await expect(page).toHaveURL(/group=Design/);

    await rows(page)
      .first()
      .getByRole('link', { name: /^Detail / })
      .click();
    await expect(page).toHaveURL(/\/employees\/[^/?]+\?/);
    await expect(page).toHaveURL(/q=citra/);
    await expect(page).toHaveURL(/group=Design/);
  });

  test('row actions are icon only at rest and show their label on hover and focus', async ({
    page,
  }) => {
    test.skip(await isCompactList(page), 'cards always show the action labels');
    const edit = rows(page)
      .first()
      .getByRole('button', { name: /^Edit / });
    const label = edit.locator('.act-label');

    await expect(edit).toBeVisible();
    // The icon button is a fixed square and the label is an overlay that fades and slides in.
    expect((await edit.boundingBox())?.width ?? 0).toBeLessThan(40);
    await expect(label).toHaveCSS('opacity', '0');

    await edit.hover();
    await expect(label).toHaveCSS('opacity', '1');
    expect((await edit.boundingBox())?.width ?? 0).toBeLessThan(40);

    await page.mouse.move(0, 0);
    await expect(label).toHaveCSS('opacity', '0');

    await edit.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(label).toHaveCSS('opacity', '1');
  });

  test('hovering a row action does not move the table or its columns', async ({ page }) => {
    test.skip(await isCompactList(page), 'cards have no column headers');
    const headersBefore = await headerBoxes(page);
    const widthBefore = await tableWidth(page);
    expect(headersBefore).toHaveLength(columnLabels.length + 1);

    const row = rows(page).first();
    const actions = [
      row.getByRole('link', { name: /^Detail / }),
      row.getByRole('button', { name: /^Edit / }),
      row.getByRole('button', { name: /^Delete / }),
    ];
    for (const action of actions) {
      await action.hover();
      await expect(action.locator('.act-label')).toHaveCSS('opacity', '1');

      expect(await tableWidth(page)).toBeCloseTo(widthBefore, 0);
      const after = await headerBoxes(page);
      after.forEach((box, i) => {
        expect(Math.abs(box.x - headersBefore[i].x)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(box.width - headersBefore[i].width)).toBeLessThanOrEqual(0.5);
      });
    }
  });

  test('Detail, Edit and Delete are tiles of one family: grey, yellow and red', async ({
    page,
  }) => {
    const row = rows(page).first();
    const colorOf = (locator: ReturnType<typeof row.getByRole>) =>
      locator.evaluate((el) => getComputedStyle(el).backgroundColor);
    const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 4).map(Number);

    const detail = parse(await colorOf(row.getByRole('link', { name: /^Detail / })));
    const edit = parse(await colorOf(row.getByRole('button', { name: /^Edit / })));
    const del = parse(await colorOf(row.getByRole('button', { name: /^Delete / })));

    for (const [, , , alpha = 1] of [detail, edit, del]) {
      expect(alpha).toBeGreaterThan(0.9);
    }
    // Detail is a neutral grey; Edit and Delete carry a hue.
    expect(Math.max(...detail.slice(0, 3)) - Math.min(...detail.slice(0, 3))).toBeLessThanOrEqual(
      12,
    );
    expect(Math.max(...edit.slice(0, 3)) - Math.min(...edit.slice(0, 3))).toBeGreaterThan(12);
    expect(Math.max(...del.slice(0, 3)) - Math.min(...del.slice(0, 3))).toBeGreaterThan(12);
    // And it is visibly a tile, not the white card behind it.
    expect(detail.slice(0, 3).some((channel) => channel < 250)).toBe(true);
  });

  test('Add employee navigates to the add form', async ({ page }) => {
    await page.getByRole('link', { name: 'Add employee' }).click();

    await expect(page).toHaveURL(/\/employees\/add$/);
    await expect(page.getByRole('heading', { name: 'Add employee' })).toBeVisible();
  });

  test('table body cells line up under their column headers', async ({ page }) => {
    test.skip(await isCompactList(page), 'cards have no column headers');

    const headerX = (await headerBoxes(page)).map((box) => Math.round(box.x));
    const cellX = await rows(page)
      .first()
      .locator('td')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
    expect(cellX).toEqual(headerX);
  });

  test('the empty state shows an svg illustration and a reset button', async ({ page }) => {
    await searchBox(page).fill('zzzzzz-no-match');
    await expect(page.getByText('No employees match your filters.')).toBeVisible();

    const art = page.getByRole('region', { name: 'Employee list' }).locator('svg').first();
    await expect(art).toBeVisible();
    const box = await art.boundingBox();
    expect(box!.width).toBeGreaterThan(80);
    await expect(page.locator('tbody tr')).toHaveCount(0);
    await expect(page.getByTestId('employee-card')).toHaveCount(0);

    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(rows(page)).toHaveCount(10);
  });

  test('salary is a left aligned column, its cells start where the header starts', async ({
    page,
  }) => {
    test.skip(await isCompactList(page), 'cards have no column headers');
    await expect(page.getByRole('columnheader', { name: 'Basic salary' })).toHaveCSS(
      'text-align',
      /^(left|start)$/,
    );
    const header = await page.getByRole('columnheader', { name: 'Basic salary' }).boundingBox();
    const cell = await rows(page).first().locator('app-masked-value').nth(2).boundingBox();
    expect(Math.abs(cell!.x - header!.x)).toBeLessThanOrEqual(12);
  });
});
