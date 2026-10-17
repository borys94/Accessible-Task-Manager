import type { Locator } from '@playwright/test';

/**
 * Accessible name as computed by the browser's accessibility tree (aria-label, aria-labelledby,
 * content, hidden parts...), unlike textContent, which only sees DOM text.
 * Read from the first line of the ARIA snapshot, e.g. `- navigation "Main":` -> "Main".
 * The line is YAML: when the name contains a colon, the whole entry is quoted,
 * e.g. `- 'button "Delete task: Add a skip link"'`, so both forms are handled.
 */
export async function accessibleName(locator: Locator): Promise<string> {
  const firstLine = (await locator.ariaSnapshot()).split('\n')[0];
  const match = firstLine.match(/^- '?[\w-]+ "((?:[^"\\]|\\.)*)"/);
  if (!match) return '';
  // inside a single-quoted YAML entry a literal ' is written as ''
  const name = firstLine.startsWith("- '") ? match[1].replaceAll("''", "'") : match[1];
  return name.replace(/\\(.)/g, '$1');
}
