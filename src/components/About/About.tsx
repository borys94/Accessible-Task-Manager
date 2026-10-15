import styles from './About.module.scss';

function About() {
  return (
    <section aria-labelledby="about-heading" className={styles.about}>
      <title>About – Accessible Task Manager</title>
      <h2 id="about-heading">About</h2>
      <p>Accessible Task Manager is a simple to-do app built with accessibility in mind.</p>
    </section>
  );
}

export default About;
