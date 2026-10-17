import { useRef, useState } from 'react';
import type { NewTask, Priority, Task } from '../../types/task';
import AddTaskForm from '../AddTaskForm/AddTaskForm';
import TrashIcon from './TrashIcon';
import styles from './TaskList.module.scss';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: number) => void;
  onAdd: (task: NewTask) => void;
  onDelete: (id: number) => void;
}

const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function TaskList({ tasks, onToggle, onAdd, onDelete }: TaskListProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deleteButtons = useRef(new Map<number, HTMLButtonElement>());
  const [status, setStatus] = useState('');

  // The focused button is removed together with its task, which would drop focus to <body> and make
  // keyboard and screen reader users start over from the top of the page. Focus moves to the delete
  // button of the next task (or the previous one), so several tasks can be deleted in a row, and to
  // the list heading when no task is left. It moves before the task is removed, while both exist.
  const deleteTask = (task: Task) => {
    const index = tasks.indexOf(task);
    const neighbour = tasks[index + 1] ?? tasks[index - 1];
    const target = neighbour ? deleteButtons.current.get(neighbour.id) : headingRef.current;
    target?.focus();

    onDelete(task.id);
    setStatus(`Task "${task.title}" deleted.`);
  };

  return (
    <section aria-labelledby="tasks-heading">
      <title>Tasks – Accessible Task Manager</title>
      {/* tabIndex={-1}: focusable from script (after the last task is deleted), but not a Tab stop */}
      <h2 id="tasks-heading" ref={headingRef} tabIndex={-1}>
        Tasks
      </h2>
      <AddTaskForm onAdd={onAdd} />
      {tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => {
            // the label names the action, so it changes with the state (no aria-pressed:
            // a toggle button must keep the same label, otherwise "pressed" contradicts it)
            const action = task.completed ? 'Mark as to do' : 'Mark as completed';

            return (
              <li key={task.id} className={styles.item}>
                <h3 className={styles.title}>{task.title}</h3>
                {task.description && <p className={styles.description}>{task.description}</p>}
                <p className={styles.priority}>Priority: {PRIORITY_LABELS[task.priority]}</p>
                <p className={`${styles.status} ${task.completed ? styles.completed : styles.pending}`}>
                  Status: {task.completed ? 'Completed' : 'To do'}
                </p>
                <div className={styles.actions}>
                  {/* The name comes from the button's content, no aria-label needed: the visible action
                      starts it (WCAG 2.5.3 Label in Name) and the hidden task title makes each button
                      distinguishable in a screen reader's list of buttons.
                      The hidden text starts with a space: Chrome adds a space at the edge of the
                      absolutely positioned span and Firefox does not, so ": " would come out as
                      " : " in one of them. With " – " both normalise to the same name. */}
                  <button
                    type="button"
                    className={`${styles.toggle} ${task.completed ? styles.toggleUndo : ''}`}
                    onClick={() => onToggle(task.id)}
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
      {/* always rendered, so screen readers register the live region before the message appears;
          visually hidden, because sighted users see the task disappear */}
      <p role="status" className="visually-hidden">
        {status}
      </p>
    </section>
  );
}

export default TaskList;
