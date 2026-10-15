import Navigation from '../Navigation/Navigation';
import styles from './Header.module.scss';

interface HeaderProps {
  title: string;
}

function Header({ title }: HeaderProps) {
  return (
    <header className={styles.header}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <h1 className={styles.title}>{title}</h1>
      <Navigation />
    </header>
  );
}

export default Header;
