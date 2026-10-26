import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { Task } from '../../types/task';
import TaskList from './TaskList';

const TASKS: Task[] = [
  { id: 1, title: 'Write docs', description: '', priority: 'low', completed: false, important: false },
  { id: 2, title: 'Fix bug', description: '', priority: 'high', completed: true, important: false },
];

/** TaskList with real state, like App, but with a save that succeeds or fails on demand. */
function Harness({ save }: { save: () => boolean }) {
  const [tasks, setTasks] = useState(TASKS);
  const commit = (next: Task[]) => {
    if (!save()) return false;
    setTasks(next);
    return true;
  };
  return (
    <TaskList
      tasks={tasks}
      onToggle={(id) => commit(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))}
      onToggleImportant={(id) => commit(tasks.map((t) => (t.id === id ? { ...t, important: !t.important } : t)))}
      onAdd={() => save()}
      onDelete={(id) => commit(tasks.filter((t) => t.id !== id))}
    />
  );
}

// jsdom drops the space before the visually hidden " – <title>" part of the name (browsers keep it),
// so the space is optional here; the exact name is checked in the Playwright tests
const taskButton = (action: string, title: string) =>
  screen.getByRole('button', { name: new RegExp(`^${action}\\s?– ${title}$`) });

function setup(save = vi.fn(() => true)) {
  const user = userEvent.setup();
  const { container } = render(<Harness save={save} />);
  return {
    user,
    container,
    save,
    // the notification regions are the last status / alert in the list section (the form has its own)
    status: () => screen.getAllByRole('status').at(-1)!,
    alert: () => screen.getAllByRole('alert').at(-1)!,
  };
}

describe('TaskList notifications', () => {
  it('renders both live regions empty before any operation', () => {
    const { status, alert } = setup();

    // present and empty: a region added together with its message is often not announced
    expect(status()).toBeEmptyDOMElement();
    expect(alert()).toBeEmptyDOMElement();
  });

  it('completing and un-completing a task updates the status text', async () => {
    const { user, status, alert } = setup();
    const button = taskButton('Mark as completed', 'Write docs');

    await user.click(button);
    expect(status()).toHaveTextContent('Task completed: Write docs');
    expect(alert()).toBeEmptyDOMElement();

    await user.click(button);
    expect(status()).toHaveTextContent('Task marked as incomplete: Write docs');
    // one message at a time: the previous one is replaced, not appended
    expect(status().children).toHaveLength(1);
  });

  it('deleting a task reports it in the status region', async () => {
    const { user, status } = setup();

    await user.click(screen.getByRole('button', { name: 'Delete task: Fix bug' }));

    expect(status()).toHaveTextContent('Task deleted: Fix bug');
  });

  it('every message is a new node, so a repeated text is announced again', async () => {
    const { user, status } = setup();
    const button = taskButton('Mark as to do', 'Fix bug');

    await user.click(button);
    const first = status().firstElementChild;
    await user.click(button);
    await user.click(button);

    expect(status()).toHaveTextContent('Task marked as incomplete: Fix bug');
    expect(status().firstElementChild).not.toBe(first);
  });

  it('a failed save shows an error in the alert region, not the status, and nothing changes', async () => {
    const { user, status, alert } = setup(vi.fn(() => false));
    const button = taskButton('Mark as completed', 'Write docs');

    await user.click(button);

    expect(alert()).toHaveTextContent(
      'Error: Could not save the change. "Write docs" is still marked as to do. Try again.',
    );
    expect(status()).toBeEmptyDOMElement();
    // the task was not changed, so its button still offers the same action
    expect(button).toHaveAccessibleName(/^Mark as completed\s?– Write docs$/);
  });

  it('a success after an error clears the error', async () => {
    const save = vi.fn(() => false);
    const { user, status, alert } = setup(save);
    const button = taskButton('Mark as completed', 'Write docs');

    await user.click(button);
    expect(alert()).not.toBeEmptyDOMElement();

    save.mockReturnValue(true);
    await user.click(button);
    expect(alert()).toBeEmptyDOMElement();
    expect(status()).toHaveTextContent('Task completed: Write docs');
  });

  it('focus is not moved to the notification', async () => {
    const { user } = setup();
    const button = taskButton('Mark as completed', 'Write docs');

    await user.click(button);

    expect(button).toHaveFocus();
  });

  it('success and error differ in text, not only in colour', async () => {
    const save = vi.fn(() => true);
    const { user, status, alert } = setup(save);

    await user.click(taskButton('Mark as completed', 'Write docs'));
    expect(status()).not.toHaveTextContent(/error/i);

    save.mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'Delete task: Fix bug' }));
    expect(alert()).toHaveTextContent(/^Error: /);
  });
});

// jsdom has no layout, so contrast and target size are not checked here (see the e2e axe scans)
describe('TaskList notifications accessibility (jest-axe)', () => {
  it('has no violations after a successful update', async () => {
    const { user, container, status } = setup();

    await user.click(taskButton('Mark as completed', 'Write docs'));
    expect(status()).toHaveTextContent('Task completed: Write docs');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations after a failed update', async () => {
    const { user, container, alert } = setup(vi.fn(() => false));

    await user.click(screen.getByRole('button', { name: 'Delete task: Fix bug' }));
    expect(alert()).toHaveTextContent('Could not delete "Fix bug"');

    expect(await axe(container)).toHaveNoViolations();
  });
});
