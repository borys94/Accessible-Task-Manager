import { test, expect, type JSHandle, type Page } from '@playwright/test';
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

/** Every element that should be a Tab stop, in DOM (reading) order. */
function getTabbables(page: Page) {
  return page.evaluateHandle(
    (selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0,
      ),
    FOCUSABLE,
  );
}

/** Position of the focused element in `tabbables` (-1 = focus is on something outside the list). */
function positionOfFocus(tabbables: JSHandle<HTMLElement[]>) {
  return tabbables.evaluate((list) => list.indexOf(document.activeElement as HTMLElement));
}

/**
 * Presses `key` `count` times and returns the position of the focused element after every press.
 * Elements are compared by identity, so two controls with the same name cannot be mistaken for each other.
 */
async function pressAndTrack(page: Page, tabbables: JSHandle<HTMLElement[]>, key: string, count: number) {
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(key);
    positions.push(await positionOfFocus(tabbables));
  }
  return positions;
}

/** Area around the focused element in page coordinates, with room for an outline, offset or shadow. */
async function focusedRegion(page: Page) {
  return page.evaluate(() => {
    const rect = document.activeElement!.getBoundingClientRect();
    const padding = 8;
    return {
      x: Math.max(0, rect.left + window.scrollX - padding),
      y: Math.max(0, rect.top + window.scrollY - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
  });
}

/**
 * Regression guard for WCAG 2.4.11 Focus Not Obscured (Minimum): the focused element is in the
 * viewport and at least part of it is not covered by other content (e.g. a sticky header).
 * It samples a grid of points with elementFromPoint, so it is a heuristic, not a full audit:
 * irregular or semi-transparent overlays still need the manual check in docs/manual-accessibility-checks.md.
 */
async function expectFocusNotObscured(page: Page) {
  const focused = page.locator(':focus');
  await expect(focused).toBeInViewport();

  const { visiblePoints, element } = await focused.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const left = Math.max(rect.left, 0);
    const right = Math.min(rect.right, window.innerWidth);
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, window.innerHeight);
    const steps = 5;
    let visible = 0;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const x = left + ((right - left) * (i + 0.5)) / steps;
        const y = top + ((bottom - top) * (j + 0.5)) / steps;
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === el || el.contains(hit))) visible++;
      }
    }
    return { visiblePoints: visible, element: el.outerHTML.slice(0, 80) };
  });
  expect(visiblePoints, `focused element is completely obscured: ${element}`).toBeGreaterThan(0);
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

  test('focus order: every interactive element is reached exactly once, in reading order', async ({ page }) => {
    const tabbables = await getTabbables(page);
    const count = await tabbables.evaluate((list) => list.length);
    expect(count).toBe(TAB_ORDER.length);
    const readingOrder = [...Array(count).keys()];

    // forwards: the full sequence must match the DOM order - nothing skipped, repeated or reordered -
    // and each focused element has the expected name from the accessibility tree
    const forwards: number[] = [];
    for (const name of TAB_ORDER) {
      await page.keyboard.press('Tab');
      forwards.push(await positionOfFocus(tabbables));
      await expect(page.locator(':focus')).toHaveAccessibleName(name);
    }
    expect(forwards).toEqual(readingOrder);

    // backwards: Shift+Tab walks the same sequence in reverse
    expect(await pressAndTrack(page, tabbables, 'Shift+Tab', count - 1)).toEqual(readingOrder.slice(0, -1).reverse());

    // no keyboard trap: Tab from the last element leaves the page content
    await tabbables.evaluate((list) => list.at(-1)!.focus());
    expect(await pressAndTrack(page, tabbables, 'Tab', 1)).toEqual([-1]);
  });

  test('focus style regression: focused elements keep the project :focus-visible outline', async ({ page }) => {
    // Guards the style chosen in src/index.css. It does not prove the indicator is perceivable;
    // see the next test and the manual contrast check in docs/manual-accessibility-checks.md.
    for (const name of TAB_ORDER) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toHaveAccessibleName(name);
      await expect(focused).toHaveCSS('outline-style', 'solid');
      await expect(focused).toHaveCSS('outline-width', '3px');
    }
  });

  test('focus indicator is visible: focusing an element changes how it looks', async ({ page }) => {
    // Implementation-agnostic: compares pixels around each element with and without focus,
    // so an outline, box-shadow, border or background change all count as an indicator.
    const shots: { name: string; clip: Awaited<ReturnType<typeof focusedRegion>>; focused: Buffer }[] = [];
    for (const name of TAB_ORDER) {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAccessibleName(name);
      const clip = await focusedRegion(page);
      shots.push({ name, clip, focused: await page.screenshot({ clip, fullPage: true }) });
    }

    await page.evaluate(() => (document.activeElement as HTMLElement).blur());

    for (const { name, clip, focused } of shots) {
      const unfocused = await page.screenshot({ clip, fullPage: true });
      expect(focused.equals(unfocused), `focus on "${name}" causes no visible change`).toBe(false);
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
