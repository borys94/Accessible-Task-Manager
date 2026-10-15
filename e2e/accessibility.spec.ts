import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { path: '/tasks', heading: 'Tasks' },
  { path: '/about', heading: 'About' },
];

test.describe('Accessibility', () => {
  for (const { path, heading } of pages) {
    test(`${path} has no detectable WCAG A/AA violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
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

  test('navigation switches pages, updates title and moves focus to main', async ({ page }) => {
    await page.goto('/tasks');
    const nav = page.getByRole('navigation', { name: 'Main' });

    await expect(nav.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'About' }).click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page).toHaveTitle('About – Accessible Task Manager');
    await expect(page.getByRole('heading', { level: 2, name: 'About' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('main')).toBeFocused();
  });
});
