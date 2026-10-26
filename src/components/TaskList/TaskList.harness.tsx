import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { screen } from '@testing-library/react';
import type { Task } from '../../types/task';
import TaskList from './TaskList';

/** Decides whether a save succeeds; may return a promise to keep the save pending. */
export type Save = () => boolean | Promise<boolean>;

/**
 * TaskList with real state and the same contract as App: the save is asynchronous, the state is
 * applied only after it succeeded, and the DOM is updated (flushSync) before the promise resolves.
 */
export function TaskListHarness({ initialTasks, save }: { initialTasks: Task[]; save: Save }) {
  const [tasks, setTasks] = useState(initialTasks);
  const latest = useRef(tasks);

  const commit = async (update: (current: Task[]) => Task[]) => {
    if (!(await save())) return false;
    latest.current = update(latest.current);
    flushSync(() => setTasks(latest.current));
    return true;
  };

  return (
    <TaskList
      tasks={tasks}
      onToggle={(id) => commit((all) => all.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))}
      onToggleImportant={(id) => commit((all) => all.map((t) => (t.id === id ? { ...t, important: !t.important } : t)))}
      onUpdate={(id, changes) => commit((all) => all.map((t) => (t.id === id ? { ...t, ...changes } : t)))}
      onAdd={async () => save()}
      onDelete={(id) => commit((all) => all.filter((t) => t.id !== id))}
    />
  );
}

// jsdom drops the space before the visually hidden " – <title>" part of the name (browsers keep it),
// so the space is optional here; the exact name is checked in the Playwright tests
export const taskButton = (action: string, title: string) =>
  screen.getByRole('button', { name: new RegExp(`^${action}\\s?– ${title}$`) });
