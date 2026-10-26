import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Navigate, Route, Routes } from 'react-router';
import Header from './components/Header/Header';
import Main from './components/Main/Main';
import Footer from './components/Footer/Footer';
import TaskList from './components/TaskList/TaskList';
import About from './components/About/About';
import { loadTasks, saveTasks } from './data/taskStorage';
import type { NewTask, Task } from './types/task';

function App() {
  const [tasks, setTasks] = useState(loadTasks);
  // the last saved list and the queue of saves: operations started while another one is still saving
  // run one after another, each on the result of the previous one, so they cannot overwrite each other
  const savedTasks = useRef(tasks);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // The change is saved first and shown only when the save succeeded, so the screen never shows a
  // state that is not stored. The result tells the task list which notification to show.
  // flushSync: the DOM is updated before the returned promise resolves, so the caller can move focus
  // to elements of the new state right away (e.g. to the next task after a delete).
  const commit = (update: (current: Task[]) => Task[]): Promise<boolean> => {
    const result = queue.current.then(async () => {
      const next = update(savedTasks.current);
      try {
        await saveTasks(next);
      } catch {
        return false;
      }
      savedTasks.current = next;
      flushSync(() => setTasks(next));
      return true;
    });
    queue.current = result;
    return result;
  };

  const updateTask = (id: number, changes: Partial<Task>) =>
    commit((current) => current.map((task) => (task.id === id ? { ...task, ...changes } : task)));

  const toggleTask = (id: number) =>
    commit((current) => current.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));

  const toggleImportant = (id: number) =>
    commit((current) => current.map((task) => (task.id === id ? { ...task, important: !task.important } : task)));

  const deleteTask = (id: number) => commit((current) => current.filter((task) => task.id !== id));

  const addTask = (task: NewTask) =>
    commit((current) => [
      ...current,
      { ...task, id: Math.max(0, ...current.map(({ id }) => id)) + 1, completed: false, important: false },
    ]);

  return (
    <>
      <Header title="Accessible Task Manager" />
      <Main>
        <Routes>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="tasks" element={<TaskList tasks={tasks} onToggle={toggleTask} onToggleImportant={toggleImportant} onUpdate={updateTask} onAdd={addTask} onDelete={deleteTask} />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </Main>
      <Footer />
    </>
  );
}

export default App;
