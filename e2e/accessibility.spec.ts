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

// Expected Tab order on /tasks: skip link, header navigation, then the task buttons.
const TAB_ORDER = [
  'Skip to main content',
  'Tasks',
  'About',
  'Mark as to do: Add a skip link', // this task starts completed
  'Mark as completed: Check colour contrast',
  'Mark as completed: Test with a screen reader',
];

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';

/** Label of the focused element: aria-label or text (enough to tell our links and buttons apart). */
async function focusedLabel(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute('aria-label') ?? el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  });
}

/** Presses Tab `count` times and returns the label of every element that got focus. */
async function tabThrough(page: Page, count: number) {
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    labels.push(await focusedLabel(page));
  }
  return labels;
}

async function expectVisibleFocusIndicator(locator: Locator) {
  await expect(locator).toBeFocused();
  const { style, width } = await locator.evaluate((el) => {
    const css = getComputedStyle(el);
    return { style: css.outlineStyle, width: parseFloat(css.outlineWidth) };
  });
  expect(style).not.toBe('none');
  expect(width).toBeGreaterThanOrEqual(2);
}

/** WCAG 2.4.11: the focused element must not be entirely hidden by other content (e.g. a sticky header). */
async function expectFocusNotObscured(page: Page) {
  const visible = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    const points = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + 2, rect.top + 2],
      [rect.right - 2, rect.top + 2],
      [rect.left + 2, rect.bottom - 2],
      [rect.right - 2, rect.bottom - 2],
    ];
    // at least one point of the element is on screen and not covered by another element
    return points.some(([x, y]) => {
      const top = document.elementFromPoint(x, y);
      return top !== null && (top === el || el.contains(top));
    });
  });
  expect(visible, `focused element "${await focusedLabel(page)}" is obscured`).toBe(true);
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

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page, '/tasks', 'Tasks');
  });

  test('every interactive element can be reached with Tab', async ({ page }) => {
    const reached = await tabThrough(page, TAB_ORDER.length);

    const interactive = await page
      .locator(FOCUSABLE)
      .evaluateAll((els) =>
        els
          .filter((el) => el.getAttribute('tabindex') !== '-1' && !(el as HTMLButtonElement).disabled)
          .map((el) => el.getAttribute('aria-label') ?? el.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
      );

    expect(interactive).toHaveLength(TAB_ORDER.length);
    expect(new Set(reached)).toEqual(new Set(interactive));
  });

  test('focus order is logical: follows the reading order, forwards and backwards', async ({ page }) => {
    expect(await tabThrough(page, TAB_ORDER.length)).toEqual(TAB_ORDER);

    // Shift+Tab walks the same order in reverse
    const backwards: string[] = [];
    for (let i = 0; i < TAB_ORDER.length - 1; i++) {
      await page.keyboard.press('Shift+Tab');
      backwards.push(await focusedLabel(page));
    }
    expect(backwards).toEqual(TAB_ORDER.slice(0, -1).reverse());

    // no keyboard trap: after the last element focus leaves the page content
    await page.getByRole('button', { name: TAB_ORDER.at(-1) }).focus();
    await page.keyboard.press('Tab');
    expect(TAB_ORDER).not.toContain(await focusedLabel(page));
  });

  test('every focused element has a clearly visible focus indicator', async ({ page }) => {
    for (const label of TAB_ORDER) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toHaveAccessibleName(label);
      await expectVisibleFocusIndicator(focused);
    }
  });

  test('focused elements are not hidden behind a sticky header or other content', async ({ page }) => {
    // a short viewport forces scrolling, which is when sticky headers cover content
    await page.setViewportSize({ width: 1280, height: 400 });

    for (let i = 0; i < TAB_ORDER.length; i++) {
      await page.keyboard.press('Tab');
      await expectFocusNotObscured(page);
    }
    for (let i = 0; i < TAB_ORDER.length - 1; i++) {
      await page.keyboard.press('Shift+Tab');
      await expectFocusNotObscured(page);
    }
  });

  test('no element uses a positive tabindex', async ({ page }) => {
    const positive = await page
      .locator('[tabindex]')
      .evaluateAll((els) => els.filter((el) => Number(el.getAttribute('tabindex')) > 0).map((el) => el.outerHTML));

    expect(positive).toEqual([]);
  });

  test('skip link is the first Tab stop and moves keyboard users to the main content', async ({ page }) => {
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).not.toBeInViewport();

    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
    await expectVisibleFocusIndicator(skipLink);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);

    // the header navigation is bypassed: the next Tab lands on the first control in <main>
    await page.keyboard.press('Tab');
    const firstButton = page.getByRole('main').getByRole('button').first();
    await expect(firstButton).toBeFocused();
    await expect(firstButton).toHaveAccessibleName('Mark as to do: Add a skip link');
  });

  test('buttons can be activated with Enter and Space', async ({ page }) => {
    const task = page.getByRole('listitem').filter({ hasText: 'Check colour contrast' });
    const button = task.getByRole('button');

    await expect(button).toHaveAccessibleName('Mark as completed: Check colour contrast');
    await expect(task).toContainText('Status: To do');

    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveText('Mark as to do');
    await expect(button).toHaveAccessibleName('Mark as to do: Check colour contrast');
    await expect(task).toContainText('Status: Completed');
    await expect(button).toBeFocused();

    await page.keyboard.press('Space');
    await expect(button).toHaveText('Mark as completed');
    await expect(button).toHaveAccessibleName('Mark as completed: Check colour contrast');
    await expect(task).toContainText('Status: To do');
    await expect(button).toBeFocused();
  });

  test('view has no WCAG 2.2 A/AA violations after keyboard interaction', async ({ page }) => {
    await page.getByRole('button', { name: 'Mark as completed: Check colour contrast' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus')).toHaveAccessibleName('Mark as to do: Check colour contrast');

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
});
