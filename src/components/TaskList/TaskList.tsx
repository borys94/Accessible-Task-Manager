import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { NewTask, Priority, Task } from '../../types/task';
import AddTaskForm from '../AddTaskForm/AddTaskForm';
import TaskEditForm from '../TaskEditForm/TaskEditForm';
import TaskNotification, { type Notification } from '../TaskNotification/TaskNotification';
import ChevronIcon from './ChevronIcon';
import StarIcon from './StarIcon';
import TrashIcon from './TrashIcon';
import styles from './TaskList.module.scss';

interface TaskListProps {
  tasks: Task[];
  // Each operation resolves to false when the change could not be saved (and nothing changed).
  // On success the DOM is already updated when the promise resolves (flushSync in App).
  onToggle: (id: number) => Promise<boolean>;
  onToggleImportant: (id: number) => Promise<boolean>;
  onUpdate: (id: number, changes: Pick<Task, 'title' | 'description'>) => Promise<boolean>;
  onAdd: (task: NewTask) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

/** Keeps a map of task id -> element up to date from a ref callback. */
function refInto<T extends HTMLElement>(map: Map<number, T>, taskId: number) {
  return (element: T | null) => {
    if (element) map.set(taskId, element);
    else map.delete(taskId);
  };
}

// Focus policy: focus is moved only in the handler of the user action that made the focused element
// disappear (delete, entering or leaving edit mode), once, right after the DOM changed. There is no
// effect that moves focus after a render, so a rerender caused by anything else (another task saved,
// a notification, new props) never takes focus away from where the user is.
function TaskList({ tasks, onToggle, onToggleImportant, onUpdate, onAdd, onDelete }: TaskListProps) {
  const id = useId();
  const addTaskButton = useRef<HTMLButtonElement>(null);
  const deleteButtons = useRef(new Map<number, HTMLButtonElement>());
  const editButtons = useRef(new Map<number, HTMLButtonElement>());
  const editTitleFields = useRef(new Map<number, HTMLInputElement>());
  // tasks with an operation in progress: a second press while saving is ignored, instead of
  // queueing a second toggle or delete the user did not mean
  const pending = useRef(new Set<number>());
  const [notification, setNotification] = useState<Notification | null>(null);
  // which tasks have their details open / are being edited: view state only, not task data
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [editing, setEditing] = useState<ReadonlySet<number>>(new Set());

  const toggleIn = (set: ReadonlySet<number>, taskId: number, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(taskId);
    else next.delete(taskId);
    return next;
  };

  // Neither toggle re-creates its button (the list items are keyed by task id), so focus stays on
  // the button that was pressed and the screen reader announces the new state in place.
  const toggleDetails = (taskId: number) =>
    setExpanded((current) => toggleIn(current, taskId, !current.has(taskId)));

  const notify = (type: Notification['type'], text: string) =>
    setNotification((previous) => ({ type, text, id: (previous?.id ?? 0) + 1 }));

  /** Runs one save per task at a time; resolves to undefined when the press was ignored. */
  const once = async (taskId: number, operation: () => Promise<boolean>) => {
    if (pending.current.has(taskId)) return undefined;
    pending.current.add(taskId);
    try {
      return await operation();
    } finally {
      pending.current.delete(taskId);
    }
  };

  // The task title is part of every message: after several operations in a row the user still knows
  // which task each one was about. On failure nothing changes and focus is not touched: the user is
  // still on the control they used and can retry with the same key (keyboard context is kept).
  const toggleTask = async (task: Task) => {
    const saved = await once(task.id, () => onToggle(task.id));
    if (saved === false) {
      notify('error', `Could not save the change. "${task.title}" is still marked as ${task.completed ? 'completed' : 'to do'}. Try again.`);
    } else if (saved) {
      notify('success', task.completed ? `Task marked as incomplete: ${task.title}` : `Task completed: ${task.title}`);
    }
  };

  // aria-pressed already announces the new state, so a success message would only repeat it
  const toggleImportant = async (task: Task) => {
    const saved = await once(task.id, () => onToggleImportant(task.id));
    if (saved === false) {
      notify('error', `Could not save the change. "${task.title}" is still ${task.important ? '' : 'not '}marked as important. Try again.`);
    }
  };

  const addTask = async (task: NewTask) => {
    const saved = await onAdd(task);
    if (!saved) notify('error', `Could not save the task "${task.title}". The form still has your input, try again.`);
    return saved;
  };

  // Entering edit mode replaces the task's buttons with the form, so the pressed Edit button is
  // gone. flushSync renders the form first; then focus goes to its first field, where the user
  // continues - the screen reader reads "Title (required), edit, <current title>".
  const startEditing = (task: Task) => {
    flushSync(() => setEditing((current) => toggleIn(current, task.id, true)));
    editTitleFields.current.get(task.id)?.focus();
  };

  // Leaving edit mode (Cancel, Escape or a successful save) brings the Edit button back, and focus
  // returns to it: the user is where they started and can go on to the next task.
  const stopEditing = (task: Task) => {
    flushSync(() => setEditing((current) => toggleIn(current, task.id, false)));
    editButtons.current.get(task.id)?.focus();
  };

  // On failure the form stays open with the user's input and focus stays on Save, so Enter retries.
  const saveEdit = async (task: Task, changes: Pick<Task, 'title' | 'description'>) => {
    const saved = await once(task.id, () => onUpdate(task.id, changes));
    if (saved === false) {
      notify('error', `Could not save your changes to "${task.title}". The form still has your input. Try again.`);
      return false;
    }
    if (saved) {
      stopEditing(task);
      notify('success', `Task updated: ${changes.title}`);
    }
    return true;
  };

  // The deleted task takes its focused button with it, which would drop focus to <body> and make
  // keyboard and screen reader users start over from the top of the page. Focus goes to the logical
  // successor: the delete button of the next task, of the previous one when the last task was
  // deleted, and "Add task" when the list is empty - so several tasks can be deleted in a row.
  //
  // The save is asynchronous, so focus is moved only after it succeeded (the task is then already
  // gone from the DOM, see onDelete) and only when it was lost: if the user went somewhere else
  // while the task was saving, focus stays there. On failure the task and its button stay, and so
  // does focus.
  const deleteTask = async (task: Task) => {
    const listBefore = tasks;
    const saved = await once(task.id, () => onDelete(task.id));
    if (saved === false) {
      notify('error', `Could not delete "${task.title}". The task is still in the list. Try again.`);
      return;
    }
    if (!saved) return;

    if (document.activeElement === document.body || document.activeElement === null) {
      successorOf(listBefore, task)?.focus();
    }
    notify('success', `Task deleted: ${task.title}`);
  };

  /** Next task's delete button, else the previous one's, else "Add task". Tasks deleted meanwhile are skipped. */
  const successorOf = (list: Task[], task: Task) => {
    const index = list.indexOf(task);
    const after = list.slice(index + 1);
    const before = list.slice(0, index).reverse();
    for (const candidate of [...after, ...before]) {
      const button = deleteButtons.current.get(candidate.id);
      if (button?.isConnected) return button;
    }
    return addTaskButton.current;
  };

  return (
    <section aria-labelledby="tasks-heading">
      {/* Not rendered here: React 19 hoists <title> into <head> and replaces it when the route changes,
          so each view sets its own document title (WCAG 2.4.2). Checked in e2e/accessibility.spec.ts. */}
      <title>Tasks – Accessible Task Manager</title>
      <h2 id="tasks-heading">Tasks</h2>
      <AddTaskForm onAdd={addTask} submitRef={addTaskButton} />
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
            const headingId = `${id}-heading-${task.id}`;

            if (editing.has(task.id)) {
              return (
                <li key={task.id} className={styles.item}>
                  <h3 id={headingId} className={styles.title}>
                    {task.title}
                  </h3>
                  <TaskEditForm
                    task={task}
                    labelledBy={headingId}
                    titleRef={refInto(editTitleFields.current, task.id)}
                    onSave={(changes) => saveEdit(task, changes)}
                    onCancel={() => stopEditing(task)}
                  />
                </li>
              );
            }

            return (
              <li key={task.id} className={styles.item}>
                <h3 id={headingId} className={styles.title}>
                  {task.title}
                </h3>
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
                  <button
                    type="button"
                    className={styles.edit}
                    ref={refInto(editButtons.current, task.id)}
                    onClick={() => startEditing(task)}
                  >
                    Edit
                    <span className="visually-hidden"> – {task.title}</span>
                  </button>
                  {/* icon-only button: the visually hidden text is its name, the icon is decorative */}
                  <button
                    type="button"
                    className={styles.delete}
                    ref={refInto(deleteButtons.current, task.id)}
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
