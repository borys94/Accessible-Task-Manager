export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  completed: boolean;
  important: boolean;
}

export type NewTask = Omit<Task, 'id' | 'completed' | 'important'>;
