import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// axe-core 4.13 has WCAG 2.2 rules only at level AA (target-size, 2.5.8);
// wcag22a is listed so future level A rules are picked up automatically.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];
const WCAG_22_RULES = ['target-size'];

const pages = [
  { path: '/tasks', heading: 'Tasks' },
  { path: '/about', heading: 'About' },
];

test.describe('Accessibility', () => {
  for (const { path, heading } of pages) {
    test(`${path} has no detectable WCAG 2.0/2.1/2.2 A/AA violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

      expect(results.violations).toEqual([]);
      // make sure the WCAG 2.2 rules really ran instead of being silently skipped
      const evaluated = [...results.passes, ...results.inapplicable].map((rule) => rule.id);
      expect(evaluated).toEqual(expect.arrayContaining(WCAG_22_RULES));
    });

    test(`${path} follows axe best practices (landmarks, heading order)`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();

      const results = await new AxeBuilder({ page }).withTags(['best-practice']).analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Routing', () => {
  test('root redirects to /tasks', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tasks$/);
  });

  test('navigation switches pages and updates the title and active link', async ({ page }) => {
    await page.goto('/tasks');
    const nav = page.getByRole('navigation', { name: 'Main' });

    await expect(nav.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'About' }).click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page).toHaveTitle('About – Accessible Task Manager');
    await expect(page.getByRole('heading', { level: 2, name: 'About' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
  });
});
