import { Navigate, Route, Routes } from 'react-router';
import Header from './components/Header/Header';
import Main from './components/Main/Main';
import Footer from './components/Footer/Footer';
import TaskList from './components/TaskList/TaskList';
import About from './components/About/About';
import { tasks } from './data/tasks';

function App() {
  return (
    <>
      <Header title="Accessible Task Manager" />
      <Main>
        <Routes>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="tasks" element={<TaskList tasks={tasks} />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </Main>
      <Footer />
    </>
  );
}

export default App;
