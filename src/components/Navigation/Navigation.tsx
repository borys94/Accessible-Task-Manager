import { NavLink } from 'react-router';
import styles from './Navigation.module.scss';

function Navigation() {
  return (
    <nav aria-label="Main">
      <ul className={styles.list}>
        <li>
          <NavLink to="/tasks" className={styles.link}>
            Tasks
          </NavLink>
        </li>
        <li>
          <NavLink to="/about" className={styles.link}>
            About
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;
