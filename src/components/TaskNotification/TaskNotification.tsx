import styles from './TaskNotification.module.scss';

export interface Notification {
  type: 'success' | 'error';
  text: string;
  /** New for every notification, so the same text shown twice is still a new node and announced again. */
  id: number;
}

interface TaskNotificationProps {
  notification: Notification | null;
}

/**
 * The outcome of the last task operation. Both live regions are always rendered: screen readers only
 * watch regions that exist before their content changes, so a region mounted together with its message
 * is often not announced. Focus is never moved here - the user stays on the control they used.
 *
 * - success: role="status" (polite), waits until the screen reader finishes what it is reading
 * - error: role="alert" (assertive). An error does not need assertive by itself; here it does because
 *   the user has just acted and assumes the change happened, while it was NOT saved and the screen
 *   did not change - if they move on, they lose work without knowing. It is a reply to their own
 *   action, one at a time, so it does not interrupt unrelated speech. A failure the user did not
 *   trigger (e.g. a background autosave) would go to the status region instead.
 * A new key does not guarantee that a repeated text is announced again in every screen reader:
 * verified manually (docs/manual-accessibility-checks.md, M12).
 *
 * Success and error differ in text ("Error:" prefix), icon shape and border, not only in colour (WCAG 1.4.1).
 */
function TaskNotification({ notification }: TaskNotificationProps) {
  const success = notification?.type === 'success' ? notification : null;
  const error = notification?.type === 'error' ? notification : null;

  return (
    <div className={styles.area}>
      <div role="status">
        {success && (
          <p key={success.id} className={`${styles.message} ${styles.success}`}>
            <SuccessIcon />
            {success.text}
          </p>
        )}
      </div>
      <div role="alert">
        {error && (
          <p key={error.id} className={`${styles.message} ${styles.error}`}>
            <ErrorIcon />
            Error: {error.text}
          </p>
        )}
      </div>
    </div>
  );
}

// Decorative: the text already says what happened. fill="currentColor" keeps them in forced colors mode.
function SuccessIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  );
}

export default TaskNotification;
