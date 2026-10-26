import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import type { Task } from '../../types/task';
import { TITLE_MAX_LENGTH, TITLE_MIN_LENGTH, validateTitle } from '../AddTaskForm/validateTitle';
import styles from './TaskEditForm.module.scss';

interface TaskEditFormProps {
  task: Task;
  /** the heading of the task, which names the form ("Check colour contrast, form") */
  labelledBy: string;
  /** the parent moves focus here when editing starts */
  titleRef: (element: HTMLInputElement | null) => void;
  /** false when the changes could not be saved: the form stays open with the user's input */
  onSave: (changes: Pick<Task, 'title' | 'description'>) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * Inline edit form of one task. It does not move focus by itself: entering and leaving edit mode are
 * user actions handled by the task list, which moves focus once, right after the DOM changed.
 * The only focus move here is to the title field when it is invalid, as in the add task form.
 */
function TaskEditForm({ task, labelledBy, titleRef, onSave, onCancel }: TaskEditFormProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const fieldRef = useRef<HTMLInputElement | null>(null);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState<{ key: number; text: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving.current) return; // a second Enter while saving would save twice
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title')).trim();
    const titleError = validateTitle(title);

    if (titleError) {
      // same rules as the add task form: error in the DOM first, then focus; announced through the
      // alert region only when focus is already in the field (no focus event, nothing is read)
      const focusAlreadyOnField = document.activeElement === fieldRef.current;
      flushSync(() => {
        setError(titleError);
        setAnnouncement((previous) =>
          focusAlreadyOnField ? { key: (previous?.key ?? 0) + 1, text: `Error: ${titleError}` } : null,
        );
      });
      fieldRef.current?.focus();
      return;
    }

    saving.current = true;
    await onSave({ title, description: String(data.get('description')).trim() });
    saving.current = false;
  };

  // Escape cancels, like closing any other temporary UI. The handler is on the form, so it works
  // from every field and button inside it, and nowhere else.
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <form className={styles.form} aria-labelledby={labelledBy} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
      <div className={styles.field}>
        <label htmlFor={titleId}>Title (required)</label>
        <p id={hintId} className={styles.hint}>
          Between {TITLE_MIN_LENGTH} and {TITLE_MAX_LENGTH} characters.
        </p>
        {error && (
          <p id={errorId} className={styles.error}>
            Error: {error}
          </p>
        )}
        <input
          ref={(element) => {
            fieldRef.current = element;
            titleRef(element);
          }}
          id={titleId}
          name="title"
          type="text"
          className={styles.input}
          defaultValue={task.title}
          required
          maxLength={TITLE_MAX_LENGTH}
          autoComplete="off"
          onChange={(event) => {
            if (error) setError(validateTitle(event.target.value));
            setAnnouncement(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={descriptionId}>Description (optional)</label>
        <textarea id={descriptionId} name="description" className={styles.input} rows={3} defaultValue={task.description} />
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.save}>
          Save
        </button>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
      </div>

      <div role="alert" className="visually-hidden">
        {announcement && <p key={announcement.key}>{announcement.text}</p>}
      </div>
    </form>
  );
}

export default TaskEditForm;
