import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AXE_TAGS } from './helpers/axe';

const TITLES = ['Add a skip link', 'Check colour contrast', 'Test with a screen reader'];

const taskList = (page: Page) => page.getByRole('main').getByRole('list');
/** A task's list item, found by its heading - the same way a screen reader user navigates to it. */
const taskItem = (page: Page, title: string) =>
  taskList(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) });
const importantButton = (page: Page, title: string) =>
  page.getByRole('button', { name: `Important – ${title}`, exact: true });
const detailsButton = (page: Page, title: string) =>
  page.getByRole('button', { name: `Details – ${title}`, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { level: 2, name: 'Tasks' })).toBeVisible();
});

test.describe('Important toggle button', () => {
  test('is a native button exposing its state with aria-pressed, rendered from the task data', async ({ page }) => {
    for (const title of TITLES) {
      const button = importantButton(page, title);
      await expect(button).toHaveCount(1);
      // a <button> already has the button role: no role attribute, no tabindex needed
      await expect(button).toHaveJSProperty('tagName', 'BUTTON');
      await expect(button).not.toHaveAttribute('role');
      await expect(button).toHaveAttribute('type', 'button');
    }
    // "Check colour contrast" starts as important, the others do not
    await expect(importantButton(page, 'Add a skip link')).toHaveAttribute('aria-pressed', 'false');
    await expect(importantButton(page, 'Check colour contrast')).toHaveAttribute('aria-pressed', 'true');
    await expect(importantButton(page, 'Test with a screen reader')).toHaveAttribute('aria-pressed', 'false');
    // the role lookup with the pressed state finds exactly the important task's button
    await expect(page.getByRole('button', { name: /^Important/, pressed: true })).toHaveAccessibleName(
      'Important – Check colour contrast',
    );
  });

  test('Enter toggles aria-pressed and focus stays on the button', async ({ page }) => {
    const button = importantButton(page, 'Test with a screen reader');
    await button.focus();

    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toBeFocused();
  });

  test('Space toggles aria-pressed and focus stays on the button', async ({ page }) => {
    const button = importantButton(page, 'Check colour contrast');
    await button.focus();

    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toBeFocused();

    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeFocused();
  });

  // With aria-pressed the state is announced separately ("pressed" / "not pressed"), so the name
  // must stay the same. A name that changed too ("Unmark as important, pressed") would contradict it.
  test('the accessible name does not change when the state changes', async ({ page }) => {
    const button = importantButton(page, 'Add a skip link');
    await button.focus();

    for (const pressed of ['true', 'false', 'true']) {
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-pressed', pressed);
      await expect(button).toHaveAccessibleName('Important – Add a skip link');
      await expect(button).toMatchAriaSnapshot(`- button "Important – Add a skip link" [pressed${pressed === 'true' ? '' : '=false'}]`);
    }
    // the visible text starts the name (WCAG 2.5.3) and is not replaced by aria-label
    await expect(button).toContainText('Important');
    await expect(button).not.toHaveAttribute('aria-label');
  });

  test('toggles only its own task', async ({ page }) => {
    await importantButton(page, 'Add a skip link').click();

    await expect(importantButton(page, 'Add a skip link')).toHaveAttribute('aria-pressed', 'true');
    await expect(importantButton(page, 'Check colour contrast')).toHaveAttribute('aria-pressed', 'true');
    await expect(importantButton(page, 'Test with a screen reader')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('Details disclosure button', () => {
  test('is a native button, collapsed by default, controlling the panel that follows it', async ({ page }) => {
    for (const title of TITLES) {
      const button = detailsButton(page, title);
      await expect(button).toHaveJSProperty('tagName', 'BUTTON');
      await expect(button).not.toHaveAttribute('role');
      await expect(button).toHaveAttribute('aria-expanded', 'false');

      const panelId = await button.getAttribute('aria-controls');
      const panel = page.locator(`[id="${panelId}"]`);
      await expect(panel).toHaveCount(1);
      await expect(panel).toBeHidden();
      // the panel has no role of its own: it is plain content, not a region or dialog
      await expect(panel).not.toHaveAttribute('role');
      // the panel comes right after the button, so it is the next thing read after expanding
      expect(await button.evaluate((el) => el.nextElementSibling?.id)).toBe(panelId);
    }
  });

  test('Enter expands and collapses the details, focus stays on the button', async ({ page }) => {
    const task = taskItem(page, 'Check colour contrast');
    const button = detailsButton(page, 'Check colour contrast');
    const description = task.getByText('Make sure text meets the WCAG AA contrast ratio of 4.5:1.');
    await expect(description).toBeHidden();
    await button.focus();

    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(description).toBeVisible();
    await expect(button).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(description).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('Space expands and collapses the details, focus stays on the button', async ({ page }) => {
    const task = taskItem(page, 'Add a skip link');
    const button = detailsButton(page, 'Add a skip link');
    const description = task.getByText('Let keyboard users jump straight to the main content.');
    await button.focus();

    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(description).toBeVisible();
    await expect(button).toBeFocused();

    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(description).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('the accessible name does not change when the state changes', async ({ page }) => {
    const button = detailsButton(page, 'Test with a screen reader');
    await button.focus();

    for (const expanded of ['true', 'false']) {
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-expanded', expanded);
      await expect(button).toHaveAccessibleName('Details – Test with a screen reader');
    }
  });

  test('collapsed content is out of the accessibility tree, expanded content is in it', async ({ page }) => {
    const task = taskItem(page, 'Test with a screen reader');
    const text = 'Walk through the app using VoiceOver and NVDA.';

    // hidden content is not just invisible: a screen reader's virtual cursor cannot reach it either
    expect(await task.ariaSnapshot()).not.toContain(text);
    await detailsButton(page, 'Test with a screen reader').click();
    expect(await task.ariaSnapshot()).toContain(text);
  });

  test('opens only its own task', async ({ page }) => {
    await detailsButton(page, 'Check colour contrast').click();

    await expect(detailsButton(page, 'Add a skip link')).toHaveAttribute('aria-expanded', 'false');
    await expect(detailsButton(page, 'Check colour contrast')).toHaveAttribute('aria-expanded', 'true');
    await expect(detailsButton(page, 'Test with a screen reader')).toHaveAttribute('aria-expanded', 'false');
  });

  test('a task added without a description says so instead of showing an empty panel', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Task title (required)' }).fill('Write alt texts');
    await page.getByRole('button', { name: 'Add task' }).click();

    const button = detailsButton(page, 'Write alt texts');
    await button.click();
    await expect(taskItem(page, 'Write alt texts').getByText('No description.')).toBeVisible();
  });
});

test.describe('Keyboard order within a task', () => {
  test('Details, Important, Mark as…, Edit, Delete', async ({ page }) => {
    const title = 'Check colour contrast';
    await detailsButton(page, title).focus();

    for (const name of [`Important – ${title}`, `Mark as completed – ${title}`, `Edit – ${title}`, `Delete task: ${title}`]) {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAccessibleName(name);
    }
  });
});

// axe checks that the buttons have names, that the ARIA attributes are allowed on them and have
// valid values (aria-pressed, aria-expanded), contrast and target size. Whether aria-controls points
// to the right element is not relied on here: axe's id check is lenient (e.g. on a collapsed
// button), so the panel's existence and position are asserted directly in the disclosure tests.
// It does NOT check that a toggle button was the right pattern for "important" (rather than a
// checkbox or a switch), that the name stays the same when the state changes, that focus stays on
// the button, or that a screen reader user understands what changed - that is covered by the tests
// above and by the manual checks in docs/manual-accessibility-checks.md.
test.describe('axe-core: task list view', () => {
  test('no violations in the initial state', async ({ page }) => {
    const results = await new AxeBuilder({ page }).include('main ul').withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
    const passed = results.passes.map((rule) => rule.id);
    expect(passed).toEqual(
      expect.arrayContaining(['button-name', 'aria-allowed-attr', 'aria-valid-attr-value', 'color-contrast', 'target-size']),
    );
  });

  test('no violations with every panel expanded and every task toggled', async ({ page }) => {
    for (const title of TITLES) {
      await detailsButton(page, title).click();
      await importantButton(page, title).click();
    }
    await expect(page.getByRole('button', { name: /^Details/, expanded: true })).toHaveCount(TITLES.length);

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
});
