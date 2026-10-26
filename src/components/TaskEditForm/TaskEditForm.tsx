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
  /** Resolves when the save has ended. On success the parent closes the form; on failure it stays open. */
  onSave: (changes: Pick<Task, 'title' | 'description'>) => Promise<void>;
  onCancel: () => void;
}

/**
 * Inline edit form of one task. It does not move focus by itself: entering and leaving edit mode are
 * user actions handled by the task list, which moves focus once, right after the DOM changed.
 * The only focus move here is to the title field when it is invalid, as in the add task form.
 *
 * While saving, the form cannot be cancelled: the change is already on its way, and closing the form
 * would only hide whether it was saved. Instead of letting the user cancel something that cannot be
 * stopped, the form says "Saving changes…" and waits for the outcome:
 * - Cancel stays focusable but is aria-disabled ("unavailable"), Escape does nothing;
 * - the fields are read-only, so nothing typed now would be lost when the form closes;
 * - focus is not moved: aria-disabled (unlike disabled) keeps it on the focused button.
 */
function TaskEditForm({ task, labelledBy, titleRef, onSave, onCancel }: TaskEditFormProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const fieldRef = useRef<HTMLInputElement | null>(null);
  // the ref guards against a second submit in the same tick; the state renders the saving UI
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState<{ key: number; text: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return; // a second Enter while saving would save twice
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

    savingRef.current = true;
    setSaving(true);
    try {
      await onSave({ title, description: String(data.get('description')).trim() });
    } finally {
      savingRef.current = false;
      // after a successful save the parent has already removed this form; this is then a no-op
      setSaving(false);
    }
  };

  const cancel = () => {
    if (!savingRef.current) onCancel();
  };

  // Escape cancels, like closing any other temporary UI. The handler is on the form, so it works
  // from every field and button inside it, and nowhere else.
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
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
          readOnly={saving}
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
        <textarea id={descriptionId} name="description" className={styles.input} rows={3} defaultValue={task.description} readOnly={saving} />
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.save}>
          Save
        </button>
        <button type="button" className={styles.cancel} aria-disabled={saving || undefined} onClick={cancel}>
          Cancel
        </button>
      </div>

      {/* always rendered, so the live region exists before "Saving changes…" appears; visible, so
          sighted users also see that Save reacted. The outcome is announced by the task list. */}
      <p role="status" className={styles.status}>
        {saving && 'Saving changes…'}
      </p>

      <div role="alert" className="visually-hidden">
        {announcement && <p key={announcement.key}>{announcement.text}</p>}
      </div>
    </form>
  );
}

export default TaskEditForm;
