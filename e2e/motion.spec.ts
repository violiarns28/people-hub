import { expect, test } from '@playwright/test';
import { chooseOption, login, loginAndGo, rows } from './utils';

/** Converts a computed "0.15s, 1e-05s" list into milliseconds. */
function toMs(list: string): number[] {
  return list.split(',').map((part) => {
    const value = part.trim();
    return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
  });
}

test.describe('micro-interactions', () => {
  test('reduced motion removes button transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);

    const durations = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('button, a.btn'))
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => ({
          name: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20) ?? '',
          value: getComputedStyle(el).transitionDuration,
        })),
    );
    expect(durations.length).toBeGreaterThan(5);
    for (const { name, value } of durations) {
      for (const ms of toMs(value)) {
        expect(ms, `transition of "${name}"`).toBeLessThanOrEqual(0.01);
      }
    }
  });

  test('a toast has a progress bar', async ({ page }) => {
    await login(page);
    await rows(page)
      .first()
      .getByRole('button', { name: /^Delete / })
      .click();
    await page
      .getByRole('dialog', { name: 'Delete employee' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    const toast = page.locator('.toast-danger');
    await expect(toast).toBeVisible();
    const bar = toast.locator('.toast-progress');
    await expect(bar).toHaveCount(1);
    const box = (await bar.boundingBox())!;
    expect(box.height).toBeGreaterThan(0);
  });

  test('the select chevron rotates while the panel is open', async ({ page }) => {
    await login(page);
    const combo = page.getByRole('combobox', { name: 'Group', exact: true });
    const chevron = combo.locator('app-icon').first();
    const pose = () =>
      chevron.evaluate((el) => {
        const style = getComputedStyle(el);
        return `${style.transform}|${style.rotate}`;
      });

    const closed = await pose();
    await combo.click();
    await expect(combo).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(pose).not.toBe(closed);
    await page.keyboard.press('Escape');
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(pose).toBe(closed);
  });

  test('hovering the Edit action tilts its icon', async ({ page }) => {
    await loginAndGo(page, '/employees/citra.santoso3');
    const edit = page.getByRole('link', { name: 'Edit', exact: true });
    const icon = edit.locator('.ico');
    const transform = () => icon.evaluate((el) => getComputedStyle(el).transform);

    expect(await transform()).toBe('none');
    await edit.hover();
    await expect.poll(transform).not.toBe('none');
  });

  test('choosing a filter still works with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);
    await chooseOption(page, 'Status', 'Permanent');
    await expect(rows(page).first()).toContainText('Permanent');
  });
});
