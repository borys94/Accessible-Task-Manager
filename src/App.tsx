import { useState } from 'react';
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

  // The change is saved first and shown only when the save succeeded, so the screen never shows a
  // state that is not stored. The result tells the task list which notification to show.
  const commit = (next: Task[]): boolean => {
    try {
      saveTasks(next);
    } catch {
      return false;
    }
    setTasks(next);
    return true;
  };

  const toggleTask = (id: number) =>
    commit(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));

  const toggleImportant = (id: number) =>
    commit(tasks.map((task) => (task.id === id ? { ...task, important: !task.important } : task)));

  const deleteTask = (id: number) => commit(tasks.filter((task) => task.id !== id));

  const addTask = (task: NewTask) =>
    commit([
      ...tasks,
      { ...task, id: Math.max(0, ...tasks.map(({ id }) => id)) + 1, completed: false, important: false },
    ]);

  return (
    <>
      <Header title="Accessible Task Manager" />
      <Main>
        <Routes>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="tasks" element={<TaskList tasks={tasks} onToggle={toggleTask} onToggleImportant={toggleImportant} onAdd={addTask} onDelete={deleteTask} />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </Main>
      <Footer />
    </>
  );
}

export default App;
