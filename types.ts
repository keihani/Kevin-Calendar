export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  details: string;
  tasks: Task[];
}

export interface CalendarData {
  [dateString: string]: string[]; // Array of Task IDs
}

export interface AppData {
  projects: Project[];
  calendar: CalendarData;
}
