import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AXE_TAGS } from './helpers/axe';

// These tests check WHERE focus goes, which axe cannot: axe sees one static state and has no idea
// which element was focused before or which one is the logical next step for the user.
// Saves are asynchronous (setTimeout in src/data/taskStorage.ts). Tests that check the state DURING a
// save stop the page clock first, so the save cannot finish until the test calls finishSaves() -
// no assertion depends on how fast the machine is.

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

/** Opens the task list with the page's timers frozen: started saves stay pending. */
async function openTasksWithPausedClock(page: Page) {
  await page.clock.install();
  await openTasks(page);
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

/** Lets the pending saves finish (longer than the simulated save delay). */
async function finishSaves(page: Page) {
  await page.clock.runFor(1000);
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

});

test.describe('Focus while a delete is saving', () => {
  test.beforeEach(async ({ page }) => openTasksWithPausedClock(page));

  test('focus stays on the button and the task stays in the list until the save ends', async ({ page }) => {
    await deleteButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Enter');

    // the save cannot have finished: nothing may move early
    await expect(deleteButton(page, 'Add a skip link')).toBeFocused();
    await expect(taskItem(page, 'Add a skip link')).toHaveCount(1);

    await finishSaves(page);
    await expect(taskItem(page, 'Add a skip link')).toHaveCount(0);
    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('if the user moves on while the delete is saving, focus is not pulled back', async ({ page }) => {
    await deleteButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Enter');
    // still saving: Tab to the next task's first button
    await page.keyboard.press('Tab');
    const next = page.getByRole('button', { name: 'Details – Check colour contrast', exact: true });
    await expect(next).toBeFocused();

    await finishSaves(page);
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

// The edit form cannot be cancelled while saving: the outcome would be hidden from the user.
test.describe('Edit form while saving', () => {
  test.beforeEach(async ({ page }) => openTasksWithPausedClock(page));

  test('shows "Saving changes…", ignores Escape and Cancel, and keeps focus', async ({ page }) => {
    await editButton(page, 'Check colour contrast').click();
    const form = editForm(page, 'Check colour contrast');
    const title = titleField(page, 'Check colour contrast');
    await title.fill('Check focus contrast');
    await title.press('Enter');

    // a status message, visible and in a live region; focus is not moved to it
    await expect(form.getByRole('status')).toHaveText('Saving changes…');
    await expect(form.getByRole('status')).toBeVisible();
    await expect(title).toBeFocused();
    await expect(title).toHaveAttribute('readonly');

    // Escape and Cancel do not close the form while the save is running
    await page.keyboard.press('Escape');
    const cancel = form.getByRole('button', { name: 'Cancel' });
    await expect(cancel).toHaveAttribute('aria-disabled', 'true');
    await cancel.focus();
    await page.keyboard.press('Enter');
    await expect(form).toBeVisible();
    await expect(cancel).toBeFocused();

    // the outcome decides: saved, so the form closes and focus returns to Edit
    await finishSaves(page);
    await expect(editButton(page, 'Check focus contrast')).toBeFocused();
    await expect(status(page)).toHaveText('Task updated: Check focus contrast');
  });
});

test.describe('Edit form after a failed save', () => {
  test.beforeEach(async ({ page }) => {
    await breakStorage(page);
    await openTasks(page);
  });

  test('can be cancelled again once the save has failed', async ({ page }) => {
    await editButton(page, 'Check colour contrast').click();
    const form = editForm(page, 'Check colour contrast');
    await titleField(page, 'Check colour contrast').press('Enter');

    await expect(alert(page)).not.toBeEmpty();
    await expect(form.getByRole('status')).toBeEmpty();
    await expect(form.getByRole('button', { name: 'Cancel' })).not.toHaveAttribute('aria-disabled');
    await expect(titleField(page, 'Check colour contrast')).not.toHaveAttribute('readonly');

    await page.keyboard.press('Escape');
    await expect(editButton(page, 'Check colour contrast')).toBeFocused();
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
