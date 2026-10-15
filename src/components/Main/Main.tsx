import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import styles from './Main.module.scss';

interface MainProps {
  children: ReactNode;
}

function Main({ children }: MainProps) {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Move focus to the new content after client-side navigation,
  // so screen reader and keyboard users start at the top of the page.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <main id="main-content" tabIndex={-1} ref={mainRef} className={styles.main}>
      {children}
    </main>
  );
}

export default Main;
