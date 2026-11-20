import { expect, type Locator, type Page } from '@playwright/test';

export const USERNAME = 'admin';
export const PASSWORD = 'admin123';

/** Fills the sign-in form. The password input is matched exactly because of the "Show password" button. */
export async function fillLogin(page: Page, username: string, password: string): Promise<void> {
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
}

/** Signs in with the hardcoded demo credentials and waits for the list. */
export async function login(page: Page, path = '/login'): Promise<void> {
  await page.goto(path);
  await fillLogin(page, USERNAME, PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/employees(\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible();
}

/** Signs in, then opens a deep link inside the already authenticated session. */
export async function loginAndGo(page: Page, path: string): Promise<void> {
  await login(page);
  await page.goto(path);
}

/**
 * Rows of the employee list as the user sees them: table rows on desktop, compact cards below 768px.
 * Both layouts exist in the DOM, so only the visible one is matched.
 */
export function rows(page: Page): Locator {
  return page
    .locator('tbody tr')
    .filter({ visible: true })
    .or(page.getByTestId('employee-card').filter({ visible: true }));
}

/** The visible list container (table on desktop, card list on mobile). */
export function listRoot(page: Page): Locator {
  return page
    .locator('table')
    .filter({ visible: true })
    .or(page.getByTestId('mobile-list').filter({ visible: true }));
}

/** The masked value box inside a row for one sensitive field ("email", "salary" or "birth date"). */
export function maskedCell(row: Locator, label: 'email' | 'salary' | 'birth date'): Locator {
  return row.locator('app-masked-value').filter({
    has: row.page().getByRole('button', { name: new RegExp(`^(Show|Hide) ${label}$`) }),
  });
}

/** The first row's name cell text, used to detect ordering changes. */
export async function rowNames(page: Page): Promise<string[]> {
  const links = await rows(page)
    .getByRole('link', { name: /^Detail / })
    .all();
  return Promise.all(
    links.map(async (link) =>
      ((await link.getAttribute('aria-label')) ?? '').replace('Detail ', ''),
    ),
  );
}

/** Opens the drawer on narrow screens; does nothing on desktop where the sidebar is always visible. */
export async function openNavIfCollapsed(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: 'Open menu' });
  if ((await menu.isVisible()) && (await menu.getAttribute('aria-expanded')) !== 'true') {
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
  }
}

/** The sidebar (desktop) or drawer (mobile) landmark. */
export function sidebar(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Primary' });
}

/** Opens the account menu from the sidebar footer (inside the drawer on mobile). */
export async function openUserMenu(page: Page): Promise<Locator> {
  await openNavIfCollapsed(page);
  await sidebar(page).locator('button[aria-haspopup="menu"]').click();
  const menu = page.getByRole('menu', { name: 'Account' });
  await expect(menu).toBeVisible();
  return menu;
}

/** Starts a sign out from the account menu and returns the confirmation dialog. */
export async function requestSignOut(page: Page): Promise<Locator> {
  const menu = await openUserMenu(page);
  await menu.getByRole('menuitem', { name: 'Sign out' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign out?' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Signs out through the account menu and the confirmation dialog. */
export async function signOut(page: Page): Promise<void> {
  const dialog = await requestSignOut(page);
  await dialog.getByRole('button', { name: 'Sign out' }).click();
}

/** Opens a custom select (button with role combobox) and picks an option by its visible name. */
export async function chooseOption(
  page: Page,
  comboboxName: string,
  optionName: string,
): Promise<void> {
  const combobox = page.getByRole('combobox', { name: comboboxName, exact: true });
  await combobox.click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
  await expect(combobox).toContainText(optionName);
}

/** True when the list shows the compact card layout (column headers hidden). */
export async function isCompactList(page: Page): Promise<boolean> {
  return !(await page.getByRole('button', { name: 'Basic salary', exact: true }).isVisible());
}

/**
 * Sorts by a column label. Desktop clicks the column header button, mobile uses the "Sort by" select
 * (always ascending first).
 */
export async function sortBy(page: Page, label: string): Promise<void> {
  if (await isCompactList(page)) {
    await chooseOption(page, 'Sort by', label);
  } else {
    await page.getByRole('button', { name: label, exact: true }).click();
  }
}

/** Parses "Rp. 1.234.000,00" into 1234000. */
export function parseRupiah(text: string): number {
  return Number(text.replace('Rp. ', '').replace(/\./g, '').replace(',00', ''));
}

/** Reveals every sensitive value through the global switch. */
export async function revealAll(page: Page): Promise<void> {
  const toggle = page.getByRole('switch', { name: /Reveal sensitive data/ });
  if ((await toggle.getAttribute('aria-checked')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
}

export interface NewEmployee {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  salaryDigits: string;
  status: string;
  group: string;
  description: string;
}

export const SAMPLE_EMPLOYEE: NewEmployee = {
  username: 'e2e.user',
  email: 'e2e.user@peoplehub.dev',
  firstName: 'E2E',
  lastName: 'User',
  birthDate: '1990-05-15',
  salaryDigits: '7500000',
  status: 'Permanent',
  group: 'Engineering',
  description: 'Created by Playwright',
};

/** The search input inside an open select panel (it is also a combobox, named "Search"). */
export function groupSearch(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Search', exact: true });
}

/** Picks a group in the searchable group select by typing and pressing Enter. */
export async function pickGroup(page: Page, group: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Group', exact: true }).click();
  const search = groupSearch(page);
  await search.fill(group);
  await search.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Group', exact: true })).toContainText(group);
}

/** The birth date trigger (a button with role combobox). */
export function birthTrigger(page: Page): Locator {
  return page.getByRole('combobox', { name: 'Birth date', exact: true });
}

/** The open date picker popover. */
export function datePopover(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Choose date' });
}

/** Opens the birth date picker and returns its popover. */
export async function openBirthPicker(page: Page): Promise<Locator> {
  await birthTrigger(page).click();
  const popover = datePopover(page);
  await expect(popover).toBeVisible();
  return popover;
}

/** Picks the birth date by typing it (dd/mm/yyyy or yyyy-MM-dd) into the picker's text field. */
export async function pickBirthDate(page: Page, value: string): Promise<void> {
  const popover = await openBirthPicker(page);
  const field = popover.getByLabel('Type a date');
  await field.fill(value);
  await field.press('Enter');
  await expect(popover).toBeHidden();
}

/** Completes the add employee form. */
export async function fillEmployeeForm(
  page: Page,
  employee: NewEmployee = SAMPLE_EMPLOYEE,
): Promise<void> {
  await page.getByLabel('Username', { exact: true }).fill(employee.username);
  await page.getByLabel('Email', { exact: true }).fill(employee.email);
  await page.getByLabel('First name').fill(employee.firstName);
  await page.getByLabel('Last name').fill(employee.lastName);
  await chooseOption(page, 'Status', employee.status);
  await pickGroup(page, employee.group);
  await pickBirthDate(page, employee.birthDate);
  await page.getByLabel('Basic salary (IDR)').pressSequentially(employee.salaryDigits);
  await page.getByLabel('Description').fill(employee.description);
}

/** True when the page body scrolls horizontally. */
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

/** The list search field (a searchbox; the select search inputs are comboboxes). */
export function searchBox(page: Page): Locator {
  return page.getByRole('searchbox', { name: 'Search' });
}

/**
 * Submits the add form while it is still invalid. The Save button carries aria-disabled then, which
 * Playwright treats as disabled, so the click event is dispatched directly.
 */
export async function submitInvalidForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save employee' }).dispatchEvent('click');
}

/**
 * Asserts that each menu item is a single line: its height stays under 56px and its text occupies
 * exactly one client rect (a wrapped text node reports one rect per line).
 */
export async function expectSingleLineItems(menu: Locator, labels: RegExp[]): Promise<void> {
  const items = menu.getByRole('menuitem');
  await expect(items).toHaveCount(labels.length);
  for (let index = 0; index < labels.length; index++) {
    const item = items.nth(index);
    await expect(item).toContainText(labels[index]);
    const box = await item.boundingBox();
    expect(box!.height, `menu item ${index} height`).toBeLessThan(56);

    const lines = await item.evaluate((el) => {
      const rects: number[] = [];
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) {
          const range = document.createRange();
          range.selectNodeContents(node);
          rects.push(range.getClientRects().length);
        }
      }
      return rects;
    });
    expect(lines.length, `menu item ${index} has text`).toBeGreaterThan(0);
    for (const count of lines) {
      expect(count, `menu item ${index} wraps`).toBe(1);
    }
  }
}

export interface MaskedMetric {
  index: number;
  label: string;
  width: number;
  scrollWidth: number;
  clientWidth: number;
  right: number;
}

/**
 * Measures the value box (.swap) of every visible masked value under `root`, in DOM order. Elements that
 * are not rendered (the other list layout) are skipped.
 */
export async function maskedMetrics(root: Locator): Promise<MaskedMetric[]> {
  return root.evaluate((el) =>
    Array.from(el.querySelectorAll('app-masked-value')).flatMap((host, index) => {
      const box = host.querySelector('.swap') as HTMLElement | null;
      if (!box) {
        return [];
      }
      const rect = box.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return [];
      }
      const button = host.querySelector('button');
      return [
        {
          index,
          label: (button?.getAttribute('aria-label') ?? '').replace(/^(Show|Hide) /, ''),
          width: rect.width,
          scrollWidth: box.scrollWidth,
          clientWidth: box.clientWidth,
          right: rect.right,
        },
      ];
    }),
  );
}

/** Asserts that masked and revealed value boxes have the same width and nothing is clipped. */
export function expectMaskedStable(
  masked: MaskedMetric[],
  revealed: MaskedMetric[],
  context: string,
): void {
  expect(masked.length, `${context}: masked values found`).toBeGreaterThan(0);
  expect(revealed.length, `${context}: same count after reveal`).toBe(masked.length);
  for (let i = 0; i < masked.length; i++) {
    const before = masked[i];
    const after = revealed[i];
    const name = `${context} #${i} ${before.label}`;
    expect(after.scrollWidth, `${name} clipped`).toBeLessThanOrEqual(after.clientWidth + 1);
    expect(before.scrollWidth, `${name} masked clipped`).toBeLessThanOrEqual(
      before.clientWidth + 1,
    );
    expect(Math.abs(after.width - before.width), `${name} width changed`).toBeLessThanOrEqual(1);
  }
}

/** Bounding boxes of locators, for "did not move or resize" assertions. */
export async function boxesOf(
  locators: Record<string, Locator>,
): Promise<Record<string, { x: number; y: number; width: number; height: number }>> {
  const out: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const [name, locator] of Object.entries(locators)) {
    // Document coordinates, so a scrolled page does not look like a layout shift.
    const box = await locator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    });
    out[name] = box;
  }
  return out;
}

export function expectSameBoxes(
  before: Record<string, { x: number; y: number; width: number; height: number }>,
  after: Record<string, { x: number; y: number; width: number; height: number }>,
  context: string,
  tolerance = 0.5,
): void {
  for (const name of Object.keys(before)) {
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(
        Math.abs(after[name][key] - before[name][key]),
        `${context}: ${name}.${key} (${before[name][key]} -> ${after[name][key]})`,
      ).toBeLessThanOrEqual(tolerance);
    }
  }
}

/** Collects elements whose text is clipped: overflow hidden/clip (or ellipsis) with scrollWidth > clientWidth. */
export async function clippedElements(page: Page, scope = 'body'): Promise<string[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector) ?? document.body;
    const found: string[] = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.display === 'inline') {
        continue;
      }
      const hidden = ['hidden', 'clip'].includes(style.overflowX);
      if (hidden && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        const text = (el.textContent ?? '').trim().slice(0, 30);
        found.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} "${text}"`);
      }
    }
    return found;
  }, scope);
}

export const SWEEP_VIEWPORTS = [360, 390, 768, 820, 1024, 1280, 1440, 1920] as const;

export async function setWidth(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
}

/** Waits for every finite CSS animation and transition to finish, so measurements are not mid-flight. */
export async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
  });
}
