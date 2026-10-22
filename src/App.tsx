import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import Header from './components/Header/Header';
import Main from './components/Main/Main';
import Footer from './components/Footer/Footer';
import TaskList from './components/TaskList/TaskList';
import About from './components/About/About';
import { tasks as initialTasks } from './data/tasks';
import type { NewTask } from './types/task';

function App() {
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id: number) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));

  const toggleImportant = (id: number) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, important: !task.important } : task)));

  const deleteTask = (id: number) => setTasks((current) => current.filter((task) => task.id !== id));

  const addTask = (task: NewTask) =>
    setTasks((current) => [
      ...current,
      { ...task, id: Math.max(0, ...current.map(({ id }) => id)) + 1, completed: false, important: false },
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
