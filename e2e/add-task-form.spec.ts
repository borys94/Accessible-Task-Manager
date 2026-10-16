import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { AXE_TAGS } from './helpers/axe';

// Every control is located by role + accessible name, the way a screen reader user finds it.
// If a label is missing or not associated, these locators find nothing and the tests fail.
function getForm(page: Page) {
  const form = page.getByRole('form', { name: 'Add a task' });
  return {
    form,
    title: form.getByRole('textbox', { name: 'Task title (required)', exact: true }),
    description: form.getByRole('textbox', { name: 'Description (optional)', exact: true }),
    priority: form.getByRole('group', { name: 'Priority', exact: true }),
    radio: (name: 'Low' | 'Medium' | 'High') => form.getByRole('radio', { name, exact: true }),
    submit: form.getByRole('button', { name: 'Add task', exact: true }),
    status: form.getByRole('status'),
  };
}

const taskItems = (page: Page) => page.getByRole('main').getByRole('list').getByRole('listitem');

test.beforeEach(async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { level: 2, name: 'Tasks' })).toBeVisible();
});

test.describe('Add task form: roles and accessible names', () => {
  test('the form is a landmark named by its heading', async ({ page }) => {
    const { form } = getForm(page);
    await expect(form).toBeVisible();
    await expect(form.getByRole('heading', { level: 3 })).toHaveText('Add a task');
  });

  test('task title is a required text field described by the length hint', async ({ page }) => {
    const { title } = getForm(page);
    await expect(title).toBeVisible();
    await expect(title).toBeEditable();
    await expect(title).toHaveJSProperty('required', true);
    // the hint is visible text and also the field's accessible description (aria-describedby)
    await expect(title).toHaveAccessibleDescription('Between 3 and 100 characters.');
    await expect(page.getByText('Between 3 and 100 characters.')).toBeVisible();
  });

  test('description is an optional text field', async ({ page }) => {
    const { description } = getForm(page);
    await expect(description).toBeVisible();
    await expect(description).toBeEditable();
    await expect(description).toHaveJSProperty('required', false);
  });

  test('priority is a named group of Low, Medium and High radios, Medium by default', async ({ page }) => {
    const { priority, radio } = getForm(page);
    await expect(priority).toBeVisible();
    await expect(priority.getByRole('radio')).toHaveCount(3);
    for (const name of ['Low', 'Medium', 'High'] as const) {
      await expect(priority.getByRole('radio', { name, exact: true })).toBeVisible();
    }
    await expect(radio('Medium')).toBeChecked();
  });

  test('"Add task" is a submit button', async ({ page }) => {
    const { submit } = getForm(page);
    await expect(submit).toBeVisible();
    await expect(submit).toHaveAttribute('type', 'submit');
  });
});

test.describe('Add task form: keyboard only', () => {
  test('a task can be filled in and submitted without a mouse', async ({ page }) => {
    const { title, description, radio, submit, status } = getForm(page);

    // reach the form from the top of the page: skip link, then the first control in <main>
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(title).toBeFocused();
    await page.keyboard.type('Write form tests');

    await page.keyboard.press('Tab');
    await expect(description).toBeFocused();
    await page.keyboard.type('Cover labels, keyboard and axe.');

    // Tab enters the radio group on the checked radio; arrow keys move and check
    await page.keyboard.press('Tab');
    await expect(radio('Medium')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(radio('High')).toBeFocused();
    await expect(radio('High')).toBeChecked();

    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    await page.keyboard.press('Enter');

    const added = taskItems(page).last();
    await expect(taskItems(page)).toHaveCount(4);
    await expect(added.getByRole('heading', { level: 3 })).toHaveText('Write form tests');
    await expect(added).toContainText('Cover labels, keyboard and axe.');
    await expect(added).toContainText('Priority: High');
    await expect(status).toHaveText('Task "Write form tests" added.');

    // the form is reset and ready for the next task
    await expect(title).toHaveValue('');
    await expect(description).toHaveValue('');
    await expect(radio('Medium')).toBeChecked();
  });

  test('Space activates the submit button', async ({ page }) => {
    const { title, submit } = getForm(page);
    await title.focus();
    await page.keyboard.type('Pressed with Space');
    await submit.focus();
    await page.keyboard.press('Space');

    await expect(taskItems(page).last().getByRole('heading')).toHaveText('Pressed with Space');
  });

  test('Enter in the title field submits the form', async ({ page }) => {
    const { title } = getForm(page);
    await title.focus();
    await page.keyboard.type('Submitted with Enter');
    await page.keyboard.press('Enter');

    await expect(taskItems(page)).toHaveCount(4);
    await expect(taskItems(page).last()).toContainText('Priority: Medium');
  });

  test('an empty or blank title is rejected and focus stays on the title', async ({ page }) => {
    const { title } = getForm(page);
    await title.focus();

    for (const value of ['', '   ']) {
      await title.fill(value);
      await page.keyboard.press('Enter');
      await expect(taskItems(page)).toHaveCount(3);
      await expect(title).toBeFocused();
    }
  });
});

// What a screen reader announces is built from the accessibility tree: name, state (aria-invalid)
// and description (aria-describedby). Focus is moved to the field, so all three are read at once.
// A native validation bubble is not part of that tree, which is why the form shows its own error.
test.describe('Add task form: validation', () => {
  const REQUIRED = 'Error: Enter a task title.';
  const TOO_SHORT = 'Error: Task title must be at least 3 characters.';
  const HINT = 'Between 3 and 100 characters.';

  for (const { name, value, submitWith, error } of [
    { name: 'an empty title, submitted with the button', value: '', submitWith: 'button', error: REQUIRED },
    { name: 'a title of spaces only, submitted with Enter', value: '   ', submitWith: 'field', error: REQUIRED },
    { name: 'a 2 character title, submitted with the button', value: 'ab', submitWith: 'button', error: TOO_SHORT },
    // spaces around the title do not count towards the minimum length
    { name: 'a padded 2 character title, submitted with Enter', value: '  ab  ', submitWith: 'field', error: TOO_SHORT },
  ] as const) {
    test(`${name}: the task is not added, focus moves to the field, which is invalid and described by the error`, async ({
      page,
    }) => {
      const { form, title, submit, status } = getForm(page);
      await title.fill(value);
      await (submitWith === 'button' ? submit : title).press('Enter');

      await expect(taskItems(page)).toHaveCount(3);
      await expect(status).toHaveText('');
      await expect(title).toBeFocused();
      await expect(title).toHaveAttribute('aria-invalid', 'true');
      // the error comes first, then the hint: the most important information is read first
      await expect(title).toHaveAccessibleDescription(`${error} ${HINT}`);
      // the same text is visible, so sighted users get the same information
      await expect(form.getByText(error)).toBeVisible();
    });
  }

  // The screen reader reads the field when it receives focus, so the error must already be in the
  // accessibility tree at that moment. The final state alone (toBeFocused + toHaveAccessibleDescription)
  // would also pass if the error were added after focus moved, when it may never be announced.
  test('the field is invalid and described by the error at the moment it receives focus', async ({ page }) => {
    const { title, submit } = getForm(page);
    await title.evaluate((input) => {
      input.addEventListener('focus', () => {
        const ids = input.getAttribute('aria-describedby')?.split(' ') ?? [];
        input.dataset.stateAtFocus = JSON.stringify({
          invalid: input.getAttribute('aria-invalid'),
          description: ids.map((id) => document.getElementById(id)?.textContent).join(' '),
        });
      });
    });

    await submit.click();
    await expect(title).toBeFocused();

    const atFocus = JSON.parse((await title.getAttribute('data-state-at-focus')) ?? 'null');
    expect(atFocus).toEqual({ invalid: 'true', description: `${REQUIRED} ${HINT}` });
  });

  test('no error is shown while typing before the first submit', async ({ page }) => {
    const { title } = getForm(page);
    await title.focus();
    await page.keyboard.type('a');
    await page.keyboard.press('Tab');

    await expect(title).not.toHaveAttribute('aria-invalid');
    await expect(title).toHaveAccessibleDescription(HINT);
  });

  test('after a failed submit the error follows the value and disappears once it is valid', async ({ page }) => {
    const { form, title, status } = getForm(page);
    await title.press('Enter');
    await expect(title).toHaveAccessibleDescription(`${REQUIRED} ${HINT}`);

    // keyboard only: the user stays in the field and fixes the value
    await page.keyboard.type('ab');
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toHaveAccessibleDescription(`${TOO_SHORT} ${HINT}`);

    await page.keyboard.type('c');
    await expect(title).not.toHaveAttribute('aria-invalid');
    await expect(title).toHaveAccessibleDescription(HINT);
    await expect(form.getByText(/^Error:/)).toHaveCount(0);

    // submitting the corrected value adds the task
    await page.keyboard.press('Enter');
    await expect(status).toHaveText('Task "abc" added.');
    await expect(taskItems(page).last().getByRole('heading')).toHaveText('abc');
  });

  test('a corrected value can be submitted again and the error is cleared', async ({ page }) => {
    const { form, title, submit, status } = getForm(page);
    await title.fill('ab');
    await submit.click();
    await expect(title).toHaveAttribute('aria-invalid', 'true');

    await title.fill('Fixed title');
    await submit.click();

    await expect(status).toHaveText('Task "Fixed title" added.');
    await expect(taskItems(page)).toHaveCount(4);
    await expect(title).not.toHaveAttribute('aria-invalid');
    await expect(title).toHaveAccessibleDescription(HINT);
    await expect(form.getByText(/^Error:/)).toHaveCount(0);
  });

  for (const { error, value } of [
    { error: REQUIRED, value: '' },
    { error: TOO_SHORT, value: 'ab' },
  ]) {
    test(`the error state "${error}" has no axe-core violations`, async ({ page }) => {
      const { title } = getForm(page);
      await title.fill(value);
      await title.press('Enter');
      await expect(title).toHaveAccessibleDescription(`${error} ${HINT}`);

      const results = await new AxeBuilder({ page }).include('form').withTags(AXE_TAGS).analyze();

      expect(results.violations).toEqual([]);
      // the error text and the invalid field were really checked, not skipped
      const passed = results.passes.map((rule) => rule.id);
      expect(passed).toEqual(expect.arrayContaining(['aria-valid-attr-value', 'color-contrast', 'label']));
    });
  }
});

test.describe('Add task form: limits', () => {
  test('the title cannot be longer than 100 characters', async ({ page }) => {
    const { title } = getForm(page);
    await title.focus();
    await page.keyboard.type('a'.repeat(120));

    await expect(title).toHaveValue('a'.repeat(100));
  });
});

test.describe('Add task form: labels', () => {
  // clicking a label must focus (and for radios check) the control it belongs to:
  // this only works when the label is programmatically associated with it
  const cases = [
    { label: 'Task title (required)', control: 'title' },
    { label: 'Description (optional)', control: 'description' },
  ] as const;

  for (const { label, control } of cases) {
    test(`clicking "${label}" focuses its field`, async ({ page }) => {
      const form = getForm(page);
      await form.form.getByText(label, { exact: true }).click();
      await expect(form[control]).toBeFocused();
    });
  }

  for (const name of ['Low', 'High'] as const) {
    test(`clicking the "${name}" label focuses and checks its radio`, async ({ page }) => {
      const { priority, radio } = getForm(page);
      await priority.getByText(name, { exact: true }).click();
      await expect(radio(name)).toBeFocused();
      await expect(radio(name)).toBeChecked();
      await expect(radio('Medium')).not.toBeChecked();
    });
  }
});

test.describe('Add task form: axe-core', () => {
  test('the form has no violations in its initial state', async ({ page }) => {
    const results = await new AxeBuilder({ page }).include('form').withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
    // the rules that matter for a form actually ran instead of being inapplicable
    const passed = results.passes.map((rule) => rule.id);
    expect(passed).toEqual(expect.arrayContaining(['label', 'color-contrast', 'button-name', 'target-size']));
  });

  test('the page has no violations after a task was added', async ({ page }) => {
    const { title, status } = getForm(page);
    await title.fill('Checked by axe');
    await title.press('Enter');
    await expect(status).toHaveText('Task "Checked by axe" added.');

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

    expect(results.violations).toEqual([]);
  });
});
