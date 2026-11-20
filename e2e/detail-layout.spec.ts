import { expect, test } from '@playwright/test';
import {
  clippedElements,
  hasHorizontalScroll,
  loginAndGo,
  maskedMetrics,
  SWEEP_VIEWPORTS,
  setWidth,
} from './utils';

const DETAIL = '/employees/citra.santoso3';

test.describe('detail responsiveness', () => {
  for (const width of SWEEP_VIEWPORTS) {
    test(`at ${width}px nothing overflows or clips and the layout matches the breakpoint`, async ({
      page,
    }) => {
      await setWidth(page, width);
      await loginAndGo(page, DETAIL);
      await expect(page.getByRole('heading', { name: 'Citra Santoso', level: 1 })).toBeVisible();

      for (const label of ['email', 'birth date', 'salary']) {
        await page.getByRole('button', { name: `Show ${label}` }).click();
      }
      await expect(page.getByRole('button', { name: 'Hide age' })).toBeVisible();

      expect(await hasHorizontalScroll(page)).toBe(false);
      expect(await clippedElements(page, 'dl')).toEqual([]);
      for (const metric of await maskedMetrics(page.locator('dl'))) {
        expect(metric.scrollWidth, `${metric.label} clipped`).toBeLessThanOrEqual(
          metric.clientWidth + 1,
        );
      }

      const card = page.locator('section.card').first();
      const aside = page.getByRole('complementary', { name: 'Recent access' });
      const cardBox = (await card.boundingBox())!;
      const asideBox = (await aside.boundingBox())!;
      if (width >= 1280) {
        expect(asideBox.x, 'aside right of the card').toBeGreaterThanOrEqual(
          cardBox.x + cardBox.width - 1,
        );
        expect(asideBox.y, 'aside starts beside the card').toBeLessThan(cardBox.y + cardBox.height);
      } else {
        expect(asideBox.y, 'aside below the card').toBeGreaterThanOrEqual(
          cardBox.y + cardBox.height - 1,
        );
        expect(Math.abs(asideBox.x - cardBox.x)).toBeLessThanOrEqual(1);
      }
      expect(asideBox.x + asideBox.width).toBeLessThanOrEqual(width + 0.5);

      // Banner artwork is visible and the avatar overlaps the banner edge.
      const skyline = card.locator('app-illustration svg').first();
      await expect(skyline).toBeVisible();
      const skyBox = (await skyline.boundingBox())!;
      expect(skyBox.width).toBeGreaterThan(100);
    });
  }

  for (const width of SWEEP_VIEWPORTS) {
    test(`at ${width}px the avatar overlaps the banner`, async ({ page }) => {
      // KNOWN APP BUG: the header uses items-end, so the -mt-9 on the avatar has no effect when the
      // title block is taller than the avatar (every width except 360 where the avatar wraps onto its
      // own row). Fix: employee-detail.html header class items-end -> items-start (or self-start on
      // the avatar div). Remove this annotation once fixed.
      await setWidth(page, width);
      await loginAndGo(page, DETAIL);
      const card = page.locator('section.card').first();
      const banner = (await card.locator('> div').first().boundingBox())!;
      const avatar = (await card.locator('header > div').first().boundingBox())!;
      expect(avatar.y, 'avatar starts inside the banner').toBeLessThan(banner.y + banner.height);
      expect(avatar.y + avatar.height, 'avatar ends below the banner').toBeGreaterThan(
        banner.y + banner.height,
      );
    });
  }

  test('Edit and Delete buttons carry icons, Edit has the pencil', async ({ page }) => {
    await loginAndGo(page, DETAIL);
    const edit = page.getByRole('link', { name: 'Edit', exact: true });
    const del = page.getByRole('button', { name: 'Delete', exact: true });
    await expect(edit.locator('svg')).toHaveCount(1);
    await expect(del.locator('svg')).toHaveCount(1);
    // The pencil and trash icons are different drawings.
    const [pencil, trash] = await Promise.all([
      edit.locator('svg').innerHTML(),
      del.locator('svg').innerHTML(),
    ]);
    expect(pencil).not.toBe(trash);
    await expect(edit.locator('svg')).toBeVisible();
    await expect(del.locator('svg')).toBeVisible();
  });

  test('Age is linked to Birth date in both directions', async ({ page }) => {
    await loginAndGo(page, DETAIL);
    await expect(page.getByText(/^\d+ years?$/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Show age' }).click();
    await expect(page.getByRole('button', { name: 'Hide birth date' })).toBeVisible();
    await expect(page.getByText('03 March 1967', { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+ years$/)).toBeVisible();

    await page.getByRole('button', { name: 'Hide birth date' }).click();
    await expect(page.getByRole('button', { name: 'Show age' })).toBeVisible();
    await expect(page.getByText('03 March 1967')).toHaveCount(0);

    await page.getByRole('button', { name: 'Show birth date' }).click();
    await expect(page.getByRole('button', { name: 'Hide age' })).toBeVisible();
    await expect(page.getByText(/^\d+ years$/)).toBeVisible();
  });

  test('the Recent access empty state shows an illustration', async ({ page }) => {
    await loginAndGo(page, DETAIL);
    const aside = page.getByRole('complementary', { name: 'Recent access' });
    await expect(aside).toContainText('No sensitive fields revealed yet');
    await expect(aside.locator('app-illustration svg')).toBeVisible();

    await page.getByRole('button', { name: 'Show email' }).click();
    await expect(aside).toContainText('Revealed email');
    await expect(aside.locator('app-illustration')).toHaveCount(0);
  });
});

test.describe('detail copy buttons', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('username copy is always enabled, email copy needs a reveal', async ({ page }) => {
    await loginAndGo(page, DETAIL);
    const username = page.getByRole('button', { name: 'Copy username' });
    const email = page.getByRole('button', { name: 'Copy email' });

    await expect(username).toBeEnabled();
    await expect(email).toBeDisabled();

    await username.click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('citra.santoso3');

    await page.getByRole('button', { name: 'Show email' }).click();
    await expect(email).toBeEnabled();
    await email.click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('citra.santoso3@peoplehub.dev');

    await page.getByRole('button', { name: 'Hide email' }).click();
    await expect(email).toBeDisabled();
  });
});
