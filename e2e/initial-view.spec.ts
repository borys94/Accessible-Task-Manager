import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Accessible name as computed by the browser's accessibility tree,
// e.g. `- navigation "Main":` -> "Main".
async function accessibleName(locator: Locator): Promise<string> {
  const snapshot = await locator.ariaSnapshot();
  const firstLine = snapshot.split('\n')[0];
  return firstLine.match(/^- \w+ "((?:[^"\\]|\\.)*)"/)?.[1] ?? '';
}

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
    const navs = await page.getByRole('navigation').all();
    expect(navs.length).toBeGreaterThanOrEqual(1);

    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

    // With more than one navigation every one needs a unique accessible name.
    // The name is read from the accessibility tree, so it works for aria-label,
    // aria-labelledby or any other source of the accessible name.
    if (navs.length > 1) {
      const names = await Promise.all(navs.map(accessibleName));
      expect(names.every(Boolean)).toBe(true);
      expect(new Set(names).size).toBe(navs.length);
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
