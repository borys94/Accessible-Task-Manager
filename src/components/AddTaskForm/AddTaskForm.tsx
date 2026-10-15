import { useId, useState, type FormEvent } from 'react';
import type { NewTask, Priority } from '../../types/task';
import styles from './AddTaskForm.module.scss';

export const TITLE_MAX_LENGTH = 100;

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface AddTaskFormProps {
  onAdd: (task: NewTask) => void;
}

function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const titleId = `${id}-title`;
  const titleHintId = `${id}-title-hint`;
  const descriptionId = `${id}-description`;
  const [status, setStatus] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title')).trim();

    // `required` accepts a title made of spaces only; clear it so the browser shows its "required" message
    if (!title) {
      const titleInput = form.elements.namedItem('title') as HTMLInputElement;
      titleInput.value = '';
      form.reportValidity();
      return;
    }

    onAdd({
      title,
      description: String(data.get('description')).trim(),
      priority: data.get('priority') as Priority,
    });
    form.reset();
    setStatus(`Task "${title}" added.`);
  };

  return (
    // aria-labelledby turns the form into a named "form" landmark
    <form className={styles.form} aria-labelledby={headingId} onSubmit={handleSubmit}>
      <h3 id={headingId} className={styles.heading}>
        Add a task
      </h3>

      <div className={styles.field}>
        {/* "(required)" is visible text, so sighted users get the same information as the
            `required` attribute gives assistive technologies */}
        <label htmlFor={titleId}>Task title (required)</label>
        {/* the hint sits between label and input, so it is read before typing starts;
            aria-describedby makes it the field's accessible description */}
        <p id={titleHintId} className={styles.hint}>
          Maximum {TITLE_MAX_LENGTH} characters.
        </p>
        <input
          id={titleId}
          name="title"
          type="text"
          className={styles.input}
          required
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          aria-describedby={titleHintId}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={descriptionId}>Description (optional)</label>
        <textarea id={descriptionId} name="description" className={styles.input} rows={3} />
      </div>

      {/* fieldset + legend name the group, so each radio is announced as e.g. "High, radio, Priority" */}
      <fieldset className={styles.fieldset}>
        <legend>Priority</legend>
        {PRIORITIES.map(({ value, label }) => (
          // a wrapping label is an implicit association: no id/htmlFor pair to keep in sync
          <label key={value} className={styles.option}>
            <input type="radio" name="priority" value={value} defaultChecked={value === 'medium'} />
            {label}
          </label>
        ))}
      </fieldset>

      <button type="submit" className={styles.submit}>
        Add task
      </button>

      {/* status region (WCAG 4.1.3) is always rendered so screen readers register it before the message appears */}
      <p role="status" className={styles.status}>
        {status}
      </p>
    </form>
  );
}

export default AddTaskForm;
