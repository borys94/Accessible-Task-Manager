import type { Task } from '../../types/task';
import styles from './TaskList.module.scss';

interface TaskListProps {
  tasks: Task[];
}

function TaskList({ tasks }: TaskListProps) {
  return (
    <section aria-labelledby="tasks-heading">
      <title>Tasks – Accessible Task Manager</title>
      <h2 id="tasks-heading">Tasks</h2>
      {tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <li key={task.id} className={styles.item}>
              <h3 className={styles.title}>{task.title}</h3>
              <p className={styles.description}>{task.description}</p>
              <p className={`${styles.status} ${task.completed ? styles.completed : styles.pending}`}>
                Status: {task.completed ? 'Completed' : 'To do'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default TaskList;
