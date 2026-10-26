import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import type { NewTask, Priority } from '../../types/task';
import { TITLE_MAX_LENGTH, TITLE_MIN_LENGTH, validateTitle } from './validateTitle';
import styles from './AddTaskForm.module.scss';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface AddTaskFormProps {
  /** false when the task could not be saved: the form keeps the input, the caller reports the error */
  onAdd: (task: NewTask) => boolean;
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
  // the key makes every announcement a new node, so a live region reads it again even when the text is the same
  const [announcement, setAnnouncement] = useState<{ key: number; text: string } | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title')).trim();
    const error = validateTitle(title);

    // Native validation bubbles are not reliably announced by screen readers, so the form uses
    // noValidate and shows its own error. Moving focus to the field makes the screen reader read
    // its name, "invalid" (aria-invalid) and the error text (aria-describedby) together.
    if (error) {
      // When the form is submitted from the field itself (Enter), focus is already there: focus()
      // fires no focus event and the screen reader does not read the field again. Only then is the
      // error announced through the alert region; when focus moves from the button, the focus
      // announcement already includes the error, and announcing it twice would only be noise.
      const focusAlreadyOnField = document.activeElement === titleRef.current;

      // React commits state updates after the handler returns, so a plain setState + focus() would
      // move focus to a field that is not yet invalid nor linked to the error. flushSync writes the
      // error to the DOM first; only then is focus moved and the screen reader reads the field.
      flushSync(() => {
        setTitleError(error);
        setStatus('');
        setAnnouncement((previous) =>
          focusAlreadyOnField ? { key: (previous?.key ?? 0) + 1, text: `Error: ${error}` } : null,
        );
      });
      titleRef.current?.focus();
      return;
    }

    const saved = onAdd({
      title,
      description: String(data.get('description')).trim(),
      priority: data.get('priority') as Priority,
    });
    if (!saved) {
      setStatus('');
      return;
    }
    form.reset();
    setTitleError('');
    setAnnouncement(null);
    setStatus(`Task "${title}" added.`);
  };

  // The field is validated on submit only, so nobody gets an error while typing a title for the
  // first time. Once an error is shown it is re-checked on every change: it updates while the value
  // is still wrong and disappears as soon as the value is valid, without another submit.
  // Changes are not announced while typing; the alert text is removed instead (removal is silent),
  // so a hidden, outdated message is not left behind for the virtual cursor to find.
  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (titleError) setTitleError(validateTitle(event.target.value));
    setAnnouncement(null);
  };

  return (
    // aria-labelledby turns the form into a named "form" landmark
    <form className={styles.form} aria-labelledby={headingId} onSubmit={handleSubmit} noValidate>
      <h3 id={headingId} className={styles.heading}>
        Add a task
      </h3>

      <div className={styles.field}>
        <label htmlFor={titleId}>Task title (required)</label>
        {/* the rules are given before the first error (WCAG 3.3.2 Labels or Instructions) */}
        <p id={titleHintId} className={styles.hint}>
          Between {TITLE_MIN_LENGTH} and {TITLE_MAX_LENGTH} characters.
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
          onChange={handleTitleChange}
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

      {/* visually hidden: the same error is already visible next to the field; the region itself is
          always rendered, as screen readers only watch live regions that exist before the change */}
      <div role="alert" className="visually-hidden">
        {announcement && <p key={announcement.key}>{announcement.text}</p>}
      </div>

      {/* status region (WCAG 4.1.3) is always rendered so screen readers register it before the message appears */}
      <p role="status" className={styles.status}>
        {status}
      </p>
    </form>
  );
}

export default AddTaskForm;
