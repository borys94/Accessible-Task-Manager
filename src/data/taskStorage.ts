import type { Task } from '../types/task';
import { tasks as initialTasks } from './tasks';

const STORAGE_KEY = 'accessible-task-manager:tasks';

/** Saved tasks, or the sample tasks when nothing was saved yet or the saved data cannot be read. */
export function loadTasks(): Task[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as Task[];
    }
  } catch {
    // storage blocked or corrupted data: start from the sample tasks instead of a blank screen
  }
  return initialTasks;
}

// Simulated network latency: localStorage itself is synchronous, but a real backend is not. The delay
// makes the UI really go through the "saving" state, so focus handling is built and tested for it.
const SAVE_DELAY_MS = 200;

/**
 * Rejects when the tasks cannot be saved: storage full (QuotaExceededError), disabled by the
 * browser or its settings. Callers keep the previous state and tell the user the change was not saved.
 */
export async function saveTasks(tasks: Task[]): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, SAVE_DELAY_MS));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
