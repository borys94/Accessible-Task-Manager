import { useId, useRef, useState } from 'react';
import type { NewTask, Priority, Task } from '../../types/task';
import AddTaskForm from '../AddTaskForm/AddTaskForm';
import TaskNotification, { type Notification } from '../TaskNotification/TaskNotification';
import ChevronIcon from './ChevronIcon';
import StarIcon from './StarIcon';
import TrashIcon from './TrashIcon';
import styles from './TaskList.module.scss';

interface TaskListProps {
  tasks: Task[];
  // each operation returns false when the change could not be saved (and nothing changed)
  onToggle: (id: number) => boolean;
  onToggleImportant: (id: number) => boolean;
  onAdd: (task: NewTask) => boolean;
  onDelete: (id: number) => boolean;
}

const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function TaskList({ tasks, onToggle, onToggleImportant, onAdd, onDelete }: TaskListProps) {
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deleteButtons = useRef(new Map<number, HTMLButtonElement>());
  const [notification, setNotification] = useState<Notification | null>(null);
  // which tasks have their details open: view state only, so it lives here and not in the task data
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  // Neither toggle re-creates its button (the list items are keyed by task id), so focus stays on
  // the button that was pressed and the screen reader announces the new state in place.
  const toggleDetails = (taskId: number) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(taskId)) next.add(taskId);
      return next;
    });

  const notify = (type: Notification['type'], text: string) =>
    setNotification((previous) => ({ type, text, id: (previous?.id ?? 0) + 1 }));

  // The task title is part of every message: after several operations in a row the user still knows
  // which task each one was about. On failure focus stays where it is, so the user can simply retry.
  const toggleTask = (task: Task) => {
    if (!onToggle(task.id)) {
      notify('error', `Could not save the change. "${task.title}" is still marked as ${task.completed ? 'completed' : 'to do'}. Try again.`);
    } else {
      notify('success', task.completed ? `Task marked as incomplete: ${task.title}` : `Task completed: ${task.title}`);
    }
  };

  // aria-pressed already announces the new state, so a success message would only repeat it
  const toggleImportant = (task: Task) => {
    if (!onToggleImportant(task.id)) {
      notify('error', `Could not save the change. "${task.title}" is still ${task.important ? '' : 'not '}marked as important. Try again.`);
    }
  };

  const addTask = (task: NewTask) => {
    const saved = onAdd(task);
    if (!saved) notify('error', `Could not save the task "${task.title}". The form still has your input, try again.`);
    return saved;
  };

  // The focused button is removed together with its task, which would drop focus to <body> and make
  // keyboard and screen reader users start over from the top of the page. Focus moves to the delete
  // button of the next task (or the previous one), so several tasks can be deleted in a row, and to
  // the list heading when no task is left. It moves before the task is removed, while both exist.
  // When the delete fails, the task and its button stay, and so does focus.
  const deleteTask = (task: Task) => {
    if (!onDelete(task.id)) {
      notify('error', `Could not delete "${task.title}". The task is still in the list. Try again.`);
      return;
    }
    // React re-renders after this handler returns, so the focused button still exists here
    const index = tasks.indexOf(task);
    const neighbour = tasks[index + 1] ?? tasks[index - 1];
    const target = neighbour ? deleteButtons.current.get(neighbour.id) : headingRef.current;
    target?.focus();

    notify('success', `Task deleted: ${task.title}`);
  };

  return (
    <section aria-labelledby="tasks-heading">
      {/* Not rendered here: React 19 hoists <title> into <head> and replaces it when the route changes,
          so each view sets its own document title (WCAG 2.4.2). Checked in e2e/accessibility.spec.ts. */}
      <title>Tasks – Accessible Task Manager</title>
      {/* tabIndex={-1}: focusable from script (after the last task is deleted), but not a Tab stop */}
      <h2 id="tasks-heading" ref={headingRef} tabIndex={-1}>
        Tasks
      </h2>
      <AddTaskForm onAdd={addTask} />
      {tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => {
            // the label names the action, so it changes with the state (no aria-pressed:
            // a toggle button must keep the same label, otherwise "pressed" contradicts it)
            const action = task.completed ? 'Mark as to do' : 'Mark as completed';
            const isExpanded = expanded.has(task.id);
            const detailsId = `${id}-details-${task.id}`;

            return (
              <li key={task.id} className={styles.item}>
                <h3 className={styles.title}>{task.title}</h3>
                <p className={styles.priority}>Priority: {PRIORITY_LABELS[task.priority]}</p>
                <p className={`${styles.status} ${task.completed ? styles.completed : styles.pending}`}>
                  Status: {task.completed ? 'Completed' : 'To do'}
                </p>
                {/* Disclosure: a native button with aria-expanded, no extra role. The name stays the same
                    in both states ("Details"), the state is announced as expanded / collapsed.
                    The panel follows the button directly, so after expanding, the next thing a screen
                    reader user reads is the revealed content. Focus stays on the button. */}
                <button
                  type="button"
                  className={styles.disclosure}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  onClick={() => toggleDetails(task.id)}
                >
                  <ChevronIcon />
                  Details
                  <span className="visually-hidden"> – {task.title}</span>
                </button>
                {/* hidden removes the collapsed panel from the screen and the accessibility tree */}
                <div id={detailsId} className={styles.details} hidden={!isExpanded}>
                  <p className={styles.description}>{task.description || 'No description.'}</p>
                </div>
                <div className={styles.actions}>
                  {/* Toggle button: aria-pressed carries the state, so the name must NOT change
                      ("Important, toggle button, pressed / not pressed"). A name like "Mark as
                      important" would contradict the state once pressed. */}
                  <button
                    type="button"
                    className={styles.important}
                    aria-pressed={task.important}
                    onClick={() => toggleImportant(task)}
                  >
                    <StarIcon filled={task.important} />
                    Important
                    <span className="visually-hidden"> – {task.title}</span>
                  </button>
                  {/* The name comes from the button's content, no aria-label needed: the visible action
                      starts it (WCAG 2.5.3 Label in Name) and the hidden task title makes each button
                      distinguishable in a screen reader's list of buttons.
                      The hidden text starts with a space: Chrome adds a space at the edge of the
                      absolutely positioned span and Firefox does not, so ": " would come out as
                      " : " in one of them. With " – " both normalise to the same name. */}
                  <button
                    type="button"
                    className={`${styles.toggle} ${task.completed ? styles.toggleUndo : ''}`}
                    onClick={() => toggleTask(task)}
                  >
                    {action}
                    <span className="visually-hidden"> – {task.title}</span>
                  </button>
                  {/* icon-only button: the visually hidden text is its name, the icon is decorative */}
                  <button
                    type="button"
                    className={styles.delete}
                    ref={(button) => {
                      if (button) deleteButtons.current.set(task.id, button);
                      else deleteButtons.current.delete(task.id);
                    }}
                    onClick={() => deleteTask(task)}
                  >
                    <TrashIcon />
                    <span className="visually-hidden">Delete task: {task.title}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <TaskNotification notification={notification} />
    </section>
  );
}

export default TaskList;
