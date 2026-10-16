import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import AddTaskForm from './AddTaskForm';

// Component-level axe scan in jsdom. jsdom has no layout, so rules that need rendering
// (color-contrast, target-size) report "incomplete" here; they are covered by the
// @axe-core/playwright scans in e2e/add-task-form.spec.ts, which run in a real browser.
describe('AddTaskForm accessibility (jest-axe)', () => {
  it('has no violations in its initial state', async () => {
    const { container } = render(<AddTaskForm onAdd={() => {}} />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([
    ['an empty title', '', 'Error: Enter a task title.'],
    ['a too short title', 'ab', 'Error: Task title must be at least 3 characters.'],
  ])('has no violations with an active error for %s', async (_, value, error) => {
    const user = userEvent.setup();
    const { container } = render(<AddTaskForm onAdd={() => {}} />);
    const title = screen.getByRole('textbox', { name: 'Task title (required)' });

    if (value) await user.type(title, value);
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    // scan the error state, not the form before React rendered it
    expect(title).toHaveAccessibleDescription(`${error} Between 3 and 100 characters.`);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
    // the rules that check the error state really ran on the invalid field
    const passed = results.passes.map((rule) => rule.id);
    expect(passed).toEqual(expect.arrayContaining(['aria-valid-attr-value', 'label']));
  });
});
