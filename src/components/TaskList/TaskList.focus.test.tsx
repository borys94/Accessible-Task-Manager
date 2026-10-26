import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { Task } from '../../types/task';
import TaskList from './TaskList';
import { TaskListHarness, taskButton, type Save } from './TaskList.harness';

const TASKS: Task[] = [
  { id: 1, title: 'First', description: '', priority: 'low', completed: false, important: false },
  { id: 2, title: 'Second', description: 'Some notes', priority: 'medium', completed: false, important: false },
  { id: 3, title: 'Third', description: '', priority: 'high', completed: false, important: false },
];

const deleteButton = (title: string) => screen.getByRole('button', { name: `Delete task: ${title}` });
const addTaskButton = () => screen.getByRole('button', { name: 'Add task' });
const status = () => screen.getAllByRole('status').at(-1)!;
const alert = () => screen.getAllByRole('alert').at(-1)!;

function setup(save: Save = vi.fn(() => true)) {
  const user = userEvent.setup();
  const { container } = render(<TaskListHarness initialTasks={TASKS} save={save} />);
  return { user, container };
}

/** A save that stays pending until the test resolves it. */
function deferredSave() {
  let resolve: (saved: boolean) => void = () => {};
  const save = vi.fn(() => new Promise<boolean>((r) => (resolve = r)));
  return { save, resolve: (saved: boolean) => resolve(saved) };
}

describe('Focus after delete', () => {
  it('deleting a middle task moves focus to the next task\'s delete button', async () => {
    const { user } = setup();

    await user.click(deleteButton('Second'));

    await waitFor(() => expect(status()).toHaveTextContent('Task deleted: Second'));
    expect(deleteButton('Third')).toHaveFocus();
  });

  it('deleting the last task moves focus to the previous task\'s delete button', async () => {
    const { user } = setup();

    await user.click(deleteButton('Third'));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Third' })).not.toBeInTheDocument());
    expect(deleteButton('Second')).toHaveFocus();
  });

  it('deleting the only remaining task moves focus to "Add task"', async () => {
    const { user } = setup();

    for (const title of ['First', 'Second', 'Third']) {
      await user.click(deleteButton(title));
      await waitFor(() => expect(status()).toHaveTextContent(`Task deleted: ${title}`));
    }

    expect(screen.getByText('No tasks yet.')).toBeInTheDocument();
    expect(addTaskButton()).toHaveFocus();
  });

  it('a failed delete keeps the task and focus on its delete button', async () => {
    const { user } = setup(vi.fn(() => false));

    await user.click(deleteButton('Second'));

    await waitFor(() => expect(alert()).toHaveTextContent('Could not delete "Second"'));
    expect(deleteButton('Second')).toHaveFocus();
  });

  it('when the user moved on while the delete was saving, focus is not taken back', async () => {
    const { save, resolve } = deferredSave();
    const { user } = setup(save);

    await user.click(deleteButton('First'));
    // still saving: the user goes on to another task
    taskButton('Mark as completed', 'Third').focus();
    resolve(true);

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'First' })).not.toBeInTheDocument());
    expect(taskButton('Mark as completed', 'Third')).toHaveFocus();
  });
});

describe('Focus in edit mode', () => {
  it('Edit moves focus to the title field, filled with the current title', async () => {
    const { user } = setup();

    await user.click(taskButton('Edit', 'Second'));

    const title = screen.getByRole('textbox', { name: 'Title (required)' });
    expect(title).toHaveFocus();
    expect(title).toHaveValue('Second');
    // the form is named by the task heading, which tells it apart from the add task form
    const form = screen.getByRole('form', { name: 'Second' });
    expect(within(form).getByRole('textbox', { name: 'Description (optional)' })).toHaveValue('Some notes');
  });

  it('Cancel returns focus to the Edit button of the same task', async () => {
    const { user } = setup();

    await user.click(taskButton('Edit', 'Second'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('textbox', { name: 'Title (required)' })).not.toBeInTheDocument();
    expect(taskButton('Edit', 'Second')).toHaveFocus();
  });

  it('Escape cancels from any field and returns focus to the Edit button', async () => {
    const { user } = setup();

    await user.click(taskButton('Edit', 'Second'));
    await user.type(screen.getByRole('textbox', { name: 'Title (required)' }), ' changed');
    await user.keyboard('{Escape}');

    // the change is discarded
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
    expect(taskButton('Edit', 'Second')).toHaveFocus();
  });

  it('a successful save returns focus to the Edit button, which has the new title', async () => {
    const { user } = setup();

    await user.click(taskButton('Edit', 'Second'));
    const title = screen.getByRole('textbox', { name: 'Title (required)' });
    await user.clear(title);
    await user.type(title, 'Renamed{Enter}');

    await waitFor(() => expect(taskButton('Edit', 'Renamed')).toHaveFocus());
    expect(status()).toHaveTextContent('Task updated: Renamed');
  });

  it('a failed save keeps the form, the input and focus on Save', async () => {
    const { user } = setup(vi.fn(() => false));

    await user.click(taskButton('Edit', 'Second'));
    const title = screen.getByRole('textbox', { name: 'Title (required)' });
    await user.clear(title);
    await user.type(title, 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(alert()).toHaveTextContent('Could not save your changes to "Second"'));
    expect(title).toHaveValue('Renamed');
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('an invalid title moves focus to the field and marks it invalid', async () => {
    const { user } = setup();

    await user.click(taskButton('Edit', 'Second'));
    const title = screen.getByRole('textbox', { name: 'Title (required)' });
    await user.clear(title);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(title).toHaveFocus();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Error: Enter a task title. Between 3 and 100 characters.');
  });
});

describe('Edit form while saving', () => {
  it('cannot be cancelled until the save ends; then the outcome is applied', async () => {
    const { save, resolve } = deferredSave();
    const { user } = setup(save);
    await user.click(taskButton('Edit', 'Second'));
    const form = screen.getByRole('form', { name: 'Second' });
    const title = within(form).getByRole('textbox', { name: 'Title (required)' });
    await user.clear(title);
    await user.type(title, 'Renamed{Enter}');

    expect(within(form).getByRole('status')).toHaveTextContent('Saving changes…');
    await user.keyboard('{Escape}');
    await user.click(within(form).getByRole('button', { name: 'Cancel' }));
    expect(form).toBeInTheDocument();
    expect(title).toHaveAttribute('readonly');

    resolve(true);
    await waitFor(() => expect(taskButton('Edit', 'Renamed')).toHaveFocus());
  });

  it('a second Save while saving does not start another save', async () => {
    const { save, resolve } = deferredSave();
    const { user } = setup(save);
    await user.click(taskButton('Edit', 'Second'));
    const saveButton = screen.getByRole('button', { name: 'Save' });

    await user.click(saveButton);
    await user.click(saveButton);
    resolve(true);

    await waitFor(() => expect(taskButton('Edit', 'Second')).toHaveFocus());
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('Focus is not moved by rerenders', () => {
  const noop = async () => true;
  const renderList = (tasks: Task[]) => (
    <TaskList tasks={tasks} onToggle={noop} onToggleImportant={noop} onUpdate={noop} onAdd={noop} onDelete={noop} />
  );

  it('new props (another task changed) leave focus where it is', () => {
    const { rerender } = render(renderList(TASKS));
    deleteButton('Second').focus();

    rerender(renderList(TASKS.map((t) => (t.id === 3 ? { ...t, completed: true, title: 'Third, done' } : t))));

    expect(deleteButton('Second')).toHaveFocus();
  });

  it('while editing, a rerender does not pull focus back to the title field', async () => {
    const user = userEvent.setup();
    const { rerender } = render(renderList(TASKS));
    await user.click(taskButton('Edit', 'Second'));
    const form = screen.getByRole('form', { name: 'Second' });
    const description = within(form).getByRole('textbox', { name: 'Description (optional)' });
    description.focus();

    rerender(renderList(TASKS.map((t) => (t.id === 1 ? { ...t, important: true } : t))));

    expect(description).toHaveFocus();
  });
});

// jsdom has no layout, so contrast and target size are checked in the Playwright axe scans
describe('jest-axe', () => {
  it('has no violations in edit mode', async () => {
    const { user, container } = setup();
    await user.click(taskButton('Edit', 'Second'));

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations with an invalid title in edit mode', async () => {
    const { user, container } = setup();
    await user.click(taskButton('Edit', 'Second'));
    await user.clear(screen.getByRole('textbox', { name: 'Title (required)' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
