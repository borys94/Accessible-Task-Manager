import type { NewTask, Priority, Task } from '../../types/task';
import AddTaskForm from '../AddTaskForm/AddTaskForm';
import styles from './TaskList.module.scss';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: number) => void;
  onAdd: (task: NewTask) => void;
}

const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

function TaskList({ tasks, onToggle, onAdd }: TaskListProps) {
  return (
    <section aria-labelledby="tasks-heading">
      <title>Tasks – Accessible Task Manager</title>
      <h2 id="tasks-heading">Tasks</h2>
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
                {/* the name starts with the visible label (WCAG 2.5.3 Label in Name); the task title
                    makes each button distinguishable in a screen reader's list of buttons */}
                <button
                  type="button"
                  className={`${styles.toggle} ${task.completed ? styles.toggleUndo : ''}`}
                  aria-label={`${action}: ${task.title}`}
                  onClick={() => onToggle(task.id)}
                >
                  {action}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default TaskList;
