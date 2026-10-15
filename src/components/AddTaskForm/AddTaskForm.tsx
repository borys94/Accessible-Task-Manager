import { useId, useRef, useState, type FormEvent } from 'react';
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
  const titleErrorId = `${id}-title-error`;
  const descriptionId = `${id}-description`;
  const titleRef = useRef<HTMLInputElement>(null);
  const [titleError, setTitleError] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title')).trim();

    // Native validation bubbles are not reliably announced by screen readers, so the form uses
    // noValidate and shows its own error. Moving focus to the field makes the screen reader read
    // its name, "invalid" (aria-invalid) and the error text (aria-describedby) together.
    if (!title) {
      setTitleError('Enter a task title.');
      setStatus('');
      titleRef.current?.focus();
      return;
    }

    onAdd({
      title,
      description: String(data.get('description')).trim(),
      priority: data.get('priority') as Priority,
    });
    form.reset();
    setTitleError('');
    setStatus(`Task "${title}" added.`);
  };

  return (
    // aria-labelledby turns the form into a named "form" landmark
    <form className={styles.form} aria-labelledby={headingId} onSubmit={handleSubmit} noValidate>
      <h3 id={headingId} className={styles.heading}>
        Add a task
      </h3>

      <div className={styles.field}>
        <label htmlFor={titleId}>Task title (required)</label>
        <p id={titleHintId} className={styles.hint}>
          Maximum {TITLE_MAX_LENGTH} characters.
        </p>
        {/* "Error:" prefix: the error is not conveyed by colour alone (WCAG 1.4.1) */}
        {titleError && (
          <p id={titleErrorId} className={styles.error}>
            Error: {titleError}
          </p>
        )}
        <input
          ref={titleRef}
          id={titleId}
          name="title"
          type="text"
          className={styles.input}
          required
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? `${titleErrorId} ${titleHintId}` : titleHintId}
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
