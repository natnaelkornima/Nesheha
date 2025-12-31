export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completedDates: string[]; // ISO date strings
  createdAt: string;
  category?: 'spiritual' | 'health' | 'work' | 'personal';
}

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO timestamp
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  reminder?: boolean;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface AppSettings {
  language: 'am' | 'en';
  darkMode: boolean;
  name?: string;
}

export interface EthiopianDate {
  year: number;
  month: number;
  date: number;
  dayName: string;
  monthName: string;
}

export type TabView = 'home' | 'habits' | 'chat' | 'notes' | 'profile';