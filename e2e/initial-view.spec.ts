import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Initial view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // wait until the app has rendered the initial route
    await expect(page.getByRole('heading', { level: 2, name: 'Tasks' })).toBeVisible();
  });

  test('has exactly one main landmark', async ({ page }) => {
    await expect(page.getByRole('main')).toHaveCount(1);
  });

  test('has a single main page heading (h1)', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });

    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Accessible Task Manager');
  });

  test('has a navigation with an accessible name that distinguishes it', async ({ page }) => {
    const navs = page.getByRole('navigation');
    const count = await navs.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

    // with more than one navigation every one needs a unique accessible name
    if (count > 1) {
      const names = await Promise.all(
        (await navs.all()).map((nav) => nav.evaluate((el) => el.getAttribute('aria-label') ?? '')),
      );
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(count);
    }
  });

  test('shows a list with three tasks', async ({ page }) => {
    const list = page.getByRole('main').getByRole('list');

    await expect(list).toHaveCount(1);
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(list.getByRole('heading', { level: 3 })).toHaveText([
      'Add a skip link',
      'Check colour contrast',
      'Test with a screen reader',
    ]);
  });

  test('has no violations detected by axe-core', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
});
