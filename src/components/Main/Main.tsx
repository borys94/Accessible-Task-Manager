import { type ReactNode } from 'react';
import styles from './Main.module.scss';

interface MainProps {
  children: ReactNode;
}

function Main({ children }: MainProps) {
  return (
    <main id="main-content" className={styles.main}>
      {children}
    </main>
  );
}

export default Main;
