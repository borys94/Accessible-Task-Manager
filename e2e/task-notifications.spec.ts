import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AXE_TAGS } from './helpers/axe';

// What these tests prove: the message is in the DOM, in a live region with the right role, that
// region existed before the message, the text is right and focus does not move. What they do NOT
// prove: that NVDA, JAWS or VoiceOver actually spoke it, when, or whether it was cut off by another
// announcement (e.g. the name of the button that received focus after a delete). Live region
// support differs between screen reader and browser pairs, so that is checked manually -
// docs/manual-accessibility-checks.md, M10-M12.

const tasksRegion = (page: Page) => page.getByRole('region', { name: 'Tasks' });
// the add task form has its own status region; the notification regions come after the list
const notificationStatus = (page: Page) => tasksRegion(page).getByRole('status').last();
const notificationAlert = (page: Page) => tasksRegion(page).getByRole('alert').last();
const taskItem = (page: Page, title: string) =>
  page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) });
const toggleButton = (page: Page, title: string) =>
  taskItem(page, title).getByRole('button', { name: /^Mark as/ });
const deleteButton = (page: Page, title: string) =>
  page.getByRole('button', { name: `Delete task: ${title}`, exact: true });

/** Every write to localStorage fails, as when the storage is full or blocked by the browser. */
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

test.describe('Success notifications', () => {
  test.beforeEach(async ({ page }) => openTasks(page));

  test('the live regions exist and are empty before any operation', async ({ page }) => {
    // a region inserted together with its text is often not announced, so it must be there first
    await expect(notificationStatus(page)).toBeAttached();
    await expect(notificationStatus(page)).toBeEmpty();
    await expect(notificationAlert(page)).toBeAttached();
    await expect(notificationAlert(page)).toBeEmpty();
  });

  test('completing a task shows "Task completed" in a status region', async ({ page }) => {
    await toggleButton(page, 'Check colour contrast').click();

    const status = notificationStatus(page);
    await expect(status).toHaveText('Task completed: Check colour contrast');
    // the role comes from the accessibility tree, not just the attribute
    await expect(status).toHaveRole('status');
    await expect(status).toBeVisible();
    await expect(notificationAlert(page)).toBeEmpty();
  });

  test('un-completing a task shows "Task marked as incomplete"', async ({ page }) => {
    await toggleButton(page, 'Add a skip link').click();

    await expect(notificationStatus(page)).toHaveText('Task marked as incomplete: Add a skip link');
  });

  test('deleting a task shows "Task deleted"', async ({ page }) => {
    await deleteButton(page, 'Check colour contrast').click();

    await expect(notificationStatus(page)).toHaveText('Task deleted: Check colour contrast');
  });

  test('the change is really saved: it is still there after a reload', async ({ page }) => {
    await toggleButton(page, 'Check colour contrast').click();
    await deleteButton(page, 'Add a skip link').click();
    await page.reload();

    await expect(taskItem(page, 'Check colour contrast')).toContainText('Status: Completed');
    await expect(taskItem(page, 'Add a skip link')).toHaveCount(0);
  });
});

test.describe('Keyboard', () => {
  test.beforeEach(async ({ page }) => openTasks(page));

  test('Enter and Space run the operation and focus stays on the button', async ({ page }) => {
    const button = toggleButton(page, 'Test with a screen reader');
    await button.focus();

    await page.keyboard.press('Enter');
    await expect(notificationStatus(page)).toHaveText('Task completed: Test with a screen reader');
    await expect(button).toBeFocused();

    await page.keyboard.press('Space');
    await expect(notificationStatus(page)).toHaveText('Task marked as incomplete: Test with a screen reader');
    await expect(button).toBeFocused();
  });

  test('after a delete, focus goes to the next task, not to the notification', async ({ page }) => {
    await deleteButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Enter');

    await expect(notificationStatus(page)).toHaveText('Task deleted: Add a skip link');
    await expect(deleteButton(page, 'Check colour contrast')).toBeFocused();
  });

  test('the notification is never focusable and never receives focus', async ({ page }) => {
    await toggleButton(page, 'Check colour contrast').focus();
    await page.keyboard.press('Enter');
    await expect(notificationStatus(page)).not.toBeEmpty();

    // no tabindex: neither a Tab stop nor a script focus target
    await expect(notificationStatus(page).locator('[tabindex]')).toHaveCount(0);
    const focusInside = await notificationStatus(page).evaluate((el) =>
      el.parentElement!.contains(document.activeElement),
    );
    expect(focusInside).toBe(false);
  });

  test('a visible notification does not cover the element that receives focus', async ({ page }) => {
    // short viewport: the sticky notification sits over the list while the user keeps tabbing
    await page.setViewportSize({ width: 1280, height: 400 });
    await toggleButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Enter');
    await expect(notificationStatus(page)).not.toBeEmpty();
    const notification = notificationStatus(page).locator('p');

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').boundingBox();
      const covering = await notification.boundingBox();
      const overlaps =
        focused!.y < covering!.y + covering!.height && covering!.y < focused!.y + focused!.height;
      expect(overlaps, `focus step ${i + 1} is under the notification`).toBe(false);
    }
  });
});

test.describe('Save errors', () => {
  test.beforeEach(async ({ page }) => {
    await breakStorage(page);
    await openTasks(page);
  });

  test('a failed completion shows an error in an alert region and changes nothing', async ({ page }) => {
    const task = taskItem(page, 'Check colour contrast');
    const button = toggleButton(page, 'Check colour contrast');
    await button.focus();
    await page.keyboard.press('Enter');

    const alert = notificationAlert(page);
    await expect(alert).toHaveRole('alert');
    await expect(alert).toHaveText(
      'Error: Could not save the change. "Check colour contrast" is still marked as to do. Try again.',
    );
    // available programmatically: the text is in the accessibility tree, not only painted on screen
    await expect(alert).toMatchAriaSnapshot(`
      - alert:
        - paragraph: "Error: Could not save the change. \\"Check colour contrast\\" is still marked as to do. Try again."
    `);
    await expect(notificationStatus(page)).toBeEmpty();
    await expect(task).toContainText('Status: To do');
    // focus stays, so the user can retry with the same key
    await expect(button).toBeFocused();
  });

  test('a failed delete keeps the task and the focus on its delete button', async ({ page }) => {
    await deleteButton(page, 'Add a skip link').focus();
    await page.keyboard.press('Space');

    await expect(notificationAlert(page)).toHaveText(
      'Error: Could not delete "Add a skip link". The task is still in the list. Try again.',
    );
    await expect(taskItem(page, 'Add a skip link')).toHaveCount(1);
    await expect(deleteButton(page, 'Add a skip link')).toBeFocused();
  });

  test('a failed "Important" toggle keeps aria-pressed and reports the error', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Important – Add a skip link', exact: true });
    await button.click();

    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(notificationAlert(page)).toHaveText(
      'Error: Could not save the change. "Add a skip link" is still not marked as important. Try again.',
    );
  });

  test('a failed add keeps the form input and does not claim the task was added', async ({ page }) => {
    const title = page.getByRole('textbox', { name: 'Task title (required)' });
    await title.fill('Write alt texts');
    await page.getByRole('button', { name: 'Add task' }).click();

    await expect(notificationAlert(page)).toHaveText(
      'Error: Could not save the task "Write alt texts". The form still has your input, try again.',
    );
    await expect(title).toHaveValue('Write alt texts');
    await expect(page.getByText('Task "Write alt texts" added.')).toHaveCount(0);
    await expect(taskItem(page, 'Write alt texts')).toHaveCount(0);
  });

  test('success and error are told apart by text and icon, not only by colour', async ({ page }) => {
    await toggleButton(page, 'Check colour contrast').click();
    const error = notificationAlert(page).locator('p');

    await expect(error).toHaveText(/^Error: /);
    await expect(error.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    // a thick bar on the left marks the error, the success message has an even border
    await expect(error).toHaveCSS('border-left-width', '8px');
  });
});

// axe confirms valid roles, contrast and no ARIA misuse in each state. It cannot tell whether the
// message was announced, whether polite or assertive was the right choice, or whether the text is clear.
test.describe('axe-core', () => {
  test('no violations with a success notification', async ({ page }) => {
    await openTasks(page);
    await toggleButton(page, 'Check colour contrast').click();
    await expect(notificationStatus(page)).not.toBeEmpty();

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('no violations with an error notification', async ({ page }) => {
    await breakStorage(page);
    await openTasks(page);
    await toggleButton(page, 'Check colour contrast').click();
    await expect(notificationAlert(page)).not.toBeEmpty();

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
