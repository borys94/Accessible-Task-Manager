import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AXE_TAGS } from './helpers/axe';

// These tests check WHERE focus goes, which axe cannot: axe sees one static state and has no idea
// which element was focused before or which one is the logical next step for the user.
// Saves are asynchronous (~200 ms), so every assertion waits for the outcome, never for a timeout.

const TITLES = ['Add a skip link', 'Check colour contrast', 'Test with a screen reader'];

const taskItem = (page: Page, title: string) =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) });
const deleteButton = (page: Page, title: string) =>
  page.getByRole('button', { name: `Delete task: ${title}`, exact: true });
const editButton = (page: Page, title: string) => page.getByRole('button', { name: `Edit – ${title}`, exact: true });
const editForm = (page: Page, title: string) => page.getByRole('form', { name: title, exact: true });
const titleField = (page: Page, title: string) =>
  editForm(page, title).getByRole('textbox', { name: 'Title (required)', exact: true });
const status = (page: Page) => page.getByRole('region', { name: 'Tasks' }).getByRole('status').last();
const alert = (page: Page) => page.getByRole('region', { name: 'Tasks' }).getByRole('alert').last();

async function breakStorage(page: Page) {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
  });
}

async function openTasks(page: Page) {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { level: 2, name: 'Tasks' })).toBeVisible();
}

test.describe('Focus after delete', () => {
  test.beforeEach(async ({ page }) => openTasks(page));

  test('deleting the middle task moves focus to the next task\'s delete button', async ({ page }) => {
    await deleteButton(page, 'Check colour contrast').focus();
    await page.keyboard.press('Enter');

    await expect(taskItem(page, 'Check colour contrast')).toHaveCount(0);
    await expect(deleteButton(page, 'Test with a screen reader')).toBeFocused();
    await expect(status(page)).toHaveText('Task deleted: Check colour contrast');
  });

  test('deleting the last task moves focus to the previous task\'s delete button', async ({ page }) => {
    await deleteButton(page, 'Test with a screen reader').focus();
    await page.keyboard.press('Space');

    await expect(taskItem(page, 'Test with a screen reader')).toHaveCount(0);
    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('when the list becomes empty, focus goes to "Add task"', async ({ page }) => {
    await deleteButton(page, TITLES[2]).focus();
    // last to first: every delete except the final one lands on the previous task
    for (const title of [...TITLES].reverse()) {
      await expect(deleteButton(page, title)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(status(page)).toHaveText(`Task deleted: ${title}`);
    }

    await expect(page.getByText('No tasks yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add task' })).toBeFocused();
  });

  test('while the delete is saving, focus stays on the button and the task stays in the list', async ({ page }) => {
    await deleteButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Enter');

    // checked right after the key press, before the save finished: nothing moved early
    await expect(deleteButton(page, 'Add a skip link')).toBeFocused({ timeout: 50 });
    await expect(taskItem(page, 'Add a skip link')).toHaveCount(1, { timeout: 50 });

    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('if the user moves on while the delete is saving, focus is not pulled back', async ({ page }) => {
    await deleteButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Enter');
    // still saving: Tab to the next task's first button
    await page.keyboard.press('Tab');
    const next = page.getByRole('button', { name: 'Details – Check colour contrast', exact: true });
    await expect(next).toBeFocused();

    await expect(status(page)).toHaveText('Task deleted: Add a skip link');
    await expect(next).toBeFocused();
  });
});

test.describe('Focus in edit mode', () => {
  test.beforeEach(async ({ page }) => openTasks(page));

  test('Edit moves focus to the title field; Cancel returns it to the same Edit button', async ({ page }) => {
    await editButton(page, 'Check colour contrast').focus();
    await page.keyboard.press('Enter');

    const title = titleField(page, 'Check colour contrast');
    await expect(title).toBeFocused();
    await expect(title).toHaveValue('Check colour contrast');

    // Tab through the form to Cancel and press it with the keyboard
    await page.keyboard.press('Tab'); // description
    await page.keyboard.press('Tab'); // Save
    await page.keyboard.press('Tab'); // Cancel
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Space');

    await expect(editForm(page, 'Check colour contrast')).toHaveCount(0);
    await expect(editButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('Escape leaves edit mode without saving and returns focus to the Edit button', async ({ page }) => {
    await editButton(page, 'Add a skip link').click();
    await page.keyboard.type(' (draft)');
    await page.keyboard.press('Escape');

    await expect(editButton(page, 'Add a skip link')).toBeFocused();
    await expect(taskItem(page, 'Add a skip link')).toHaveCount(1);
  });

  test('saving returns focus to the Edit button, now named after the new title', async ({ page }) => {
    await editButton(page, 'Check colour contrast').click();
    const title = titleField(page, 'Check colour contrast');
    await title.fill('Check focus contrast');
    await title.press('Enter');

    await expect(editButton(page, 'Check focus contrast')).toBeFocused();
    await expect(status(page)).toHaveText('Task updated: Check focus contrast');
  });

  test('an invalid title keeps the form open and focus on the field', async ({ page }) => {
    await editButton(page, 'Check colour contrast').click();
    const title = titleField(page, 'Check colour contrast');
    await title.fill('ab');
    await editForm(page, 'Check colour contrast').getByRole('button', { name: 'Save' }).click();

    await expect(title).toBeFocused();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toHaveAccessibleDescription(
      'Error: Task title must be at least 3 characters. Between 3 and 100 characters.',
    );
  });
});

// Requirement 5: after a failed asynchronous save the user is still where they were.
test.describe('Focus after a failed save', () => {
  test.beforeEach(async ({ page }) => {
    await breakStorage(page);
    await openTasks(page);
  });

  test('a failed delete keeps the task and focus on its delete button', async ({ page }) => {
    await deleteButton(page, 'Check colour contrast').focus();
    await page.keyboard.press('Enter');

    await expect(alert(page)).toHaveText(/^Error: Could not delete "Check colour contrast"/);
    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('a failed edit keeps the form, the input and focus on Save, so Enter retries', async ({ page }) => {
    await editButton(page, 'Check colour contrast').click();
    await titleField(page, 'Check colour contrast').fill('Check focus contrast');
    const save = editForm(page, 'Check colour contrast').getByRole('button', { name: 'Save' });
    await save.focus();
    await page.keyboard.press('Enter');

    await expect(alert(page)).toHaveText(/^Error: Could not save your changes to "Check colour contrast"/);
    await expect(save).toBeFocused();
    await expect(titleField(page, 'Check colour contrast')).toHaveValue('Check focus contrast');
  });

  test('a failed toggle keeps focus on the toggle', async ({ page }) => {
    const button = taskItem(page, 'Check colour contrast').getByRole('button', { name: /^Mark as/ });
    await button.focus();
    await page.keyboard.press('Space');

    await expect(alert(page)).not.toBeEmpty();
    await expect(button).toBeFocused();
  });
});

// axe confirms each state is valid on its own; whether focus landed in the right place is
// checked by the tests above.
test.describe('axe-core', () => {
  test.beforeEach(async ({ page }) => openTasks(page));

  test('list after deleting a task', async ({ page }) => {
    await deleteButton(page, 'Check colour contrast').click();
    await expect(status(page)).toHaveText('Task deleted: Check colour contrast');

    expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  });

  test('empty list', async ({ page }) => {
    for (const title of TITLES) {
      await deleteButton(page, title).click();
      await expect(status(page)).toHaveText(`Task deleted: ${title}`);
    }

    expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  });

  test('edit mode', async ({ page }) => {
    await editButton(page, 'Check colour contrast').click();
    await expect(titleField(page, 'Check colour contrast')).toBeFocused();

    expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  });

  test('edit mode with an invalid title', async ({ page }) => {
    await editButton(page, 'Check colour contrast').click();
    await titleField(page, 'Check colour contrast').fill('');
    await titleField(page, 'Check colour contrast').press('Enter');
    await expect(titleField(page, 'Check colour contrast')).toHaveAttribute('aria-invalid', 'true');

    expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  });
});
