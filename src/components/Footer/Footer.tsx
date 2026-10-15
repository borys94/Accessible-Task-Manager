import styles from './Footer.module.scss';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p>&copy; {year} Accessible Task Manager</p>
    </footer>
  );
}

export default Footer;
