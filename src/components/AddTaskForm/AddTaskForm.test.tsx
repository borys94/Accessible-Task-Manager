import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddTaskForm from './AddTaskForm';

const HINT = 'Between 3 and 100 characters.';
const REQUIRED = 'Error: Enter a task title.';
const TOO_SHORT = 'Error: Task title must be at least 3 characters.';

function setup() {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  render(<AddTaskForm onAdd={onAdd} />);
  return {
    onAdd,
    user,
    title: screen.getByRole('textbox', { name: 'Task title (required)' }),
    submit: screen.getByRole('button', { name: 'Add task' }),
  };
}

describe('AddTaskForm validation', () => {
  it('starts without an error: the title is described only by the hint', () => {
    const { title } = setup();

    expect(title).not.toHaveAttribute('aria-invalid');
    expect(title).toHaveAccessibleDescription(HINT);
    expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument();
  });

  it('does not show an error while typing before the first submit', async () => {
    const { user, title } = setup();

    await user.type(title, 'a');
    await user.tab();

    expect(title).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument();
  });

  it.each([
    ['an empty title', '', REQUIRED],
    ['a title of spaces only', '   ', REQUIRED],
    ['a 2 character title', 'ab', TOO_SHORT],
    ['a padded 2 character title', '  ab  ', TOO_SHORT],
  ])('rejects %s: no task is added, the field is invalid, focused and described by the error', async (_, value, error) => {
    const { onAdd, user, title, submit } = setup();

    if (value) await user.type(title, value);
    await user.click(submit);

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(error)).toBeVisible();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription(`${error} ${HINT}`);
    // focus is moved from the button back to the field, so a screen reader announces the error
    expect(title).toHaveFocus();
  });

  it('updates the error while the value is corrected and removes it once the value is valid', async () => {
    const { user, title, submit } = setup();
    await user.click(submit);
    expect(title).toHaveAccessibleDescription(`${REQUIRED} ${HINT}`);

    await user.type(title, 'ab');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription(`${TOO_SHORT} ${HINT}`);

    await user.type(title, 'c');
    expect(title).not.toHaveAttribute('aria-invalid');
    expect(title).toHaveAccessibleDescription(HINT);
    expect(screen.queryByText(/^Error:/)).not.toBeInTheDocument();
  });

  it('adds the trimmed task after the value is corrected and submitted again', async () => {
    const { onAdd, user, title, submit } = setup();
    await user.type(title, 'ab');
    await user.click(submit);
    expect(onAdd).not.toHaveBeenCalled();

    await user.clear(title);
    await user.type(title, '  Fixed title  ');
    await user.click(submit);

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({ title: 'Fixed title', description: '', priority: 'medium' });
    expect(screen.getByRole('status')).toHaveTextContent('Task "Fixed title" added.');
    expect(title).toHaveValue('');
    expect(title).not.toHaveAttribute('aria-invalid');
  });

  it('works with the keyboard only: Enter in the field validates and submits', async () => {
    const { onAdd, user, title } = setup();

    await user.click(title);
    await user.keyboard('{Enter}');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveFocus();

    await user.keyboard('Keyboard{Enter}');
    expect(onAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Keyboard' }));
  });
});
