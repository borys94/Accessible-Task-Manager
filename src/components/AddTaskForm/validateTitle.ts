export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 100;

/**
 * Returns the error message for a task title, or an empty string when it is valid.
 * Messages say how to fix the problem, not only that there is one (WCAG 3.3.3 Error Suggestion).
 */
export function validateTitle(value: string): string {
  const title = value.trim();
  if (!title) return 'Enter a task title.';
  if (title.length < TITLE_MIN_LENGTH) return `Task title must be at least ${TITLE_MIN_LENGTH} characters.`;
  return '';
}
