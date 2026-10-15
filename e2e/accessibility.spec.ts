import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// axe runs only the rules that carry at least one of these tags; the sets do not overlap
// (rule counts as of axe-core 4.13)
const AXE_TAGS = [
  'wcag2a', // WCAG 2.0 level A (62 rules): alt text, link/button names, form labels, page lang, ARIA validity
  'wcag2aa', // WCAG 2.0 level AA (3 rules): colour contrast, zoom not blocked by meta viewport, valid lang on parts of the page
  'wcag21a', // WCAG 2.1 level A (1 rule): visible label is part of the accessible name (2.5.3 Label in Name)
  'wcag21aa', // WCAG 2.1 level AA (3 rules): orientation lock, autocomplete purpose, text spacing
  'wcag22a', // WCAG 2.2 level A (0 rules yet): picked up automatically when axe adds them
  'wcag22aa', // WCAG 2.2 level AA (1 rule): target size of interactive elements (2.5.8), off by default
  'best-practice', // not WCAG (30 rules): landmarks, single h1, heading order, unique landmark names
];

const pages = [
  { path: '/tasks', heading: 'Tasks' },
  { path: '/about', heading: 'About' },
];

async function openPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
}

async function expectVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused();
  await expect(locator).toBeInViewport();
  expect(await locator.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
}

test('pages have no accessibility violations detected by axe-core', async ({ page }) => {
  for (const { path, heading } of pages) {
    await test.step(path, async () => {
      await openPage(page, path, heading);

      // tags must be explicit: without them axe skips the WCAG 2.2 rules (target-size)
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

      expect(results.violations).toEqual([]);
      // WCAG 2.2 (target-size, 2.5.8) really ran instead of being silently skipped
      const evaluated = [...results.passes, ...results.inapplicable].map((rule) => rule.id);
      expect(evaluated).toContain('target-size');
    });
  }
});

test('keyboard users can move through the page with Tab and Shift+Tab', async ({ page }) => {
  await openPage(page, '/tasks', 'Tasks');

  const nav = page.getByRole('navigation', { name: 'Main' });
  const tabOrder = [
    page.getByRole('link', { name: 'Skip to main content' }),
    nav.getByRole('link', { name: 'Tasks' }),
    nav.getByRole('link', { name: 'About' }),
  ];

  // forward: every interactive element is reached in a logical order with a visible focus
  for (const element of tabOrder) {
    await page.keyboard.press('Tab');
    await expectVisibleFocus(element);
  }

  // no keyboard trap: Tab moves focus past the last element
  await page.keyboard.press('Tab');
  for (const element of tabOrder) {
    await expect(element).not.toBeFocused();
  }

  // backward: Shift+Tab walks the same order in reverse
  await tabOrder.at(-1)!.focus();
  for (const element of tabOrder.slice(0, -1).reverse()) {
    await page.keyboard.press('Shift+Tab');
    await expectVisibleFocus(element);
  }

  // links are operable with Enter
  await tabOrder.at(-1)!.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 2, name: 'About' })).toBeVisible();
});
