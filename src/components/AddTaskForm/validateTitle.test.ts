import { describe, expect, it } from 'vitest';
import { validateTitle } from './validateTitle';

describe('validateTitle', () => {
  it.each([
    ['', 'Enter a task title.'],
    ['   ', 'Enter a task title.'],
    ['a', 'Task title must be at least 3 characters.'],
    ['ab', 'Task title must be at least 3 characters.'],
    // surrounding spaces do not count towards the minimum
    ['  ab  ', 'Task title must be at least 3 characters.'],
  ])('rejects %j with "%s"', (value, error) => {
    expect(validateTitle(value)).toBe(error);
  });

  it.each(['abc', '  abc  ', 'Write tests'])('accepts %j', (value) => {
    expect(validateTitle(value)).toBe('');
  });
});
