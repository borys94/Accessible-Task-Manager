import type { Task } from '../types/task';

export const tasks: Task[] = [
  {
    id: 1,
    title: 'Add a skip link',
    description: 'Let keyboard users jump straight to the main content.',
    priority: 'high',
    completed: true,
    important: false,
  },
  {
    id: 2,
    title: 'Check colour contrast',
    description: 'Make sure text meets the WCAG AA contrast ratio of 4.5:1.',
    priority: 'high',
    completed: false,
    important: true,
  },
  {
    id: 3,
    title: 'Test with a screen reader',
    description: 'Walk through the app using VoiceOver and NVDA.',
    priority: 'medium',
    completed: false,
    important: false,
  },
];
