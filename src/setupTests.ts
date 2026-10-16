import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// jest-axe ships Jest types only; this makes the matcher known to Vitest's expect
declare module 'vitest' {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>> {
    toHaveNoViolations(): R;
  }
}
