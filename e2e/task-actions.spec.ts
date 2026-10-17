import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AXE_TAGS } from './helpers/axe';
import { accessibleName } from './helpers/accessible-name';

const TITLES = ['Add a skip link', 'Check colour contrast', 'Test with a screen reader'];

const taskList = (page: Page) => page.getByRole('main').getByRole('list');
const taskItems = (page: Page) => taskList(page).getByRole('listitem');
/** A task's list item, found by its heading - the same way a screen reader user navigates to it. */
const taskItem = (page: Page, title: string) =>
  taskItems(page).filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) });
const deleteButton = (page: Page, title: string) =>
  page.getByRole('button', { name: `Delete task: ${title}`, exact: true });
const listStatus = (page: Page) => page.getByRole('region', { name: 'Tasks' }).getByRole('status').last();

test.beforeEach(async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { level: 2, name: 'Tasks' })).toBeVisible();
});

// axe only checks that a name exists. These tests check that the name says what the button does
// and to which task: a delete button named "Delete task: <another task>" would pass axe.
test.describe('Delete button', () => {
  test('every task has one icon-only delete button named after the action and its own task', async ({ page }) => {
    for (const title of TITLES) {
      const button = taskItem(page, title).getByRole('button', { name: /^Delete task/ });
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAccessibleName(`Delete task: ${title}`);
      // the name comes from the button's (visually hidden) content, not from aria-label
      await expect(button).not.toHaveAttribute('aria-label');
    }
  });

  test('the icon is decorative and adds nothing to the name or the accessibility tree', async ({ page }) => {
    const button = deleteButton(page, 'Check colour contrast');
    await expect(button.locator('svg')).toBeVisible();
    await expect(button.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    // the accessibility tree has just the button and its name: no image, no extra text
    // (the entry is YAML: quoted as a whole because the name contains a colon)
    await expect(button).toMatchAriaSnapshot(`- 'button "Delete task: Check colour contrast"'`);
  });

  test('the name is not visible on screen: the button shows only the icon', async ({ page }) => {
    const button = deleteButton(page, 'Check colour contrast');
    const text = button.getByText('Delete task: Check colour contrast');
    // the text is in the DOM but clipped to nothing: its visible area is 1x1px at most
    const box = await text.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(1);
    expect(box!.height).toBeLessThanOrEqual(1);
  });

  test('clicking a delete button removes exactly the task it is named after', async ({ page }) => {
    await deleteButton(page, 'Check colour contrast').click();

    await expect(taskList(page).getByRole('heading', { level: 3 })).toHaveText([
      'Add a skip link',
      'Test with a screen reader',
    ]);
    await expect(listStatus(page)).toHaveText('Task "Check colour contrast" deleted.');
  });
});

test.describe('Mark as completed / to do button', () => {
  test('the name describes the action available now and changes with the task state', async ({ page }) => {
    const task = taskItem(page, 'Check colour contrast');
    const button = task.getByRole('button', { name: /^Mark as/ });

    await expect(button).toHaveAccessibleName('Mark as completed – Check colour contrast');
    await expect(task).toContainText('Status: To do');

    await button.click();
    // after completing, the available action is the opposite one
    await expect(button).toHaveAccessibleName('Mark as to do – Check colour contrast');
    await expect(task).toContainText('Status: Completed');

    await button.click();
    await expect(button).toHaveAccessibleName('Mark as completed – Check colour contrast');
    await expect(task).toContainText('Status: To do');
  });

  test('the name starts with the visible label and is not overridden by aria-label', async ({ page }) => {
    const button = taskItem(page, 'Check colour contrast').getByRole('button', { name: /^Mark as/ });

    // WCAG 2.5.3 Label in Name: the text on screen is the start of the accessible name, so a voice
    // control user can say "click Mark as completed"
    const visibleLabel = await button.evaluate((el) =>
      Array.from(el.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(''),
    );
    expect(visibleLabel).toBe('Mark as completed');
    await expect(button).toHaveAccessibleName(new RegExp(`^${visibleLabel}`));
    await expect(button).not.toHaveAttribute('aria-label');
    // the state is in the name, so aria-pressed would contradict it
    await expect(button).not.toHaveAttribute('aria-pressed');
  });

  // Names are read from the accessibility tree, not from textContent: an aria-label shared by all
  // buttons would override their content and make them identical for a screen reader, while
  // textContent would still look unique.
  test('every button in the list has a non-empty, unique accessible name', async ({ page }) => {
    const buttons = await taskList(page).getByRole('button').all();
    expect(buttons).toHaveLength(TITLES.length * 2);

    const names = await Promise.all(buttons.map(accessibleName));
    for (const name of names) expect(name).not.toBe('');
    expect(new Set(names).size).toBe(names.length);

    // and the role lookup a screen reader user relies on resolves each name to exactly one button
    for (const name of names) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(1);
    }
  });
});

test.describe('Task title field', () => {
  test('is named by its label and described by the 100 character limit', async ({ page }) => {
    const byLabel = page.getByLabel('Task title (required)', { exact: true });
    const byRole = page.getByRole('textbox', { name: 'Task title (required)', exact: true });

    // the label and the role lookup point to the same single field
    await expect(byLabel).toHaveCount(1);
    await expect(byRole).toHaveCount(1);
    expect(await byLabel.evaluate((el, other) => el === other, await byRole.elementHandle())).toBe(true);

    await expect(byLabel).toHaveAccessibleName('Task title (required)');
    await expect(byLabel).toHaveAccessibleDescription('Between 3 and 100 characters.');
    // the description is visible text, so everybody gets the same instruction
    await expect(page.getByText('Between 3 and 100 characters.')).toBeVisible();
    // and the limit the description promises is the one the field enforces
    await expect(byLabel).toHaveAttribute('maxlength', '100');
  });
});

test.describe('Keyboard', () => {
  test('the toggle button works with Enter and Space and keeps focus', async ({ page }) => {
    const button = taskItem(page, 'Test with a screen reader').getByRole('button', { name: /^Mark as/ });
    await button.focus();

    await page.keyboard.press('Enter');
    await expect(button).toHaveAccessibleName('Mark as to do – Test with a screen reader');
    await expect(button).toBeFocused();

    await page.keyboard.press('Space');
    await expect(button).toHaveAccessibleName('Mark as completed – Test with a screen reader');
    await expect(button).toBeFocused();
  });

  test('the delete button is reached with Tab right after the toggle of the same task', async ({ page }) => {
    await taskItem(page, 'Check colour contrast').getByRole('button', { name: /^Mark as/ }).focus();
    await page.keyboard.press('Tab');
    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('Enter deletes the task and focus moves to the next task\'s delete button', async ({ page }) => {
    await deleteButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Enter');

    await expect(taskItem(page, 'Add a skip link')).toHaveCount(0);
    // focus is not lost to <body>: the user can keep going from the same place
    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
    await expect(listStatus(page)).toHaveText('Task "Add a skip link" deleted.');
  });

  test('Space deletes the last task and focus moves to the previous task\'s delete button', async ({ page }) => {
    await deleteButton(page, 'Test with a screen reader').focus();
    await page.keyboard.press('Space');

    await expect(taskItem(page, 'Test with a screen reader')).toHaveCount(0);
    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('deleting every task with the keyboard ends on the list heading, not on <body>', async ({ page }) => {
    await deleteButton(page, TITLES[0]).focus();
    for (const title of TITLES) {
      await expect(deleteButton(page, title)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(listStatus(page)).toHaveText(`Task "${title}" deleted.`);
    }

    await expect(page.getByText('No tasks yet.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Tasks' })).toBeFocused();
    // the heading is focusable from script only, it does not become an extra Tab stop
    await expect(page.getByRole('heading', { level: 2, name: 'Tasks' })).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('axe-core', () => {
  test('the task list has no violations in its initial state', async ({ page }) => {
    const results = await new AxeBuilder({ page }).include('main ul').withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
    // the rules that check button names, contrast and target size really ran on the buttons
    const passed = results.passes.map((rule) => rule.id);
    expect(passed).toEqual(expect.arrayContaining(['button-name', 'color-contrast', 'target-size']));
  });

  test('the page has no violations after toggling and deleting tasks', async ({ page }) => {
    await taskItem(page, 'Check colour contrast').getByRole('button', { name: /^Mark as/ }).click();
    await deleteButton(page, 'Add a skip link').click();
    await expect(listStatus(page)).toHaveText('Task "Add a skip link" deleted.');

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });

  test('the page has no violations with an empty list', async ({ page }) => {
    for (const title of TITLES) await deleteButton(page, title).click();
    await expect(page.getByText('No tasks yet.')).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
});
