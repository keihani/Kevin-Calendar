import { AppData, Project, Task } from '../types';

const STORAGE_KEY = 'chronotask_db_v1';

const DEFAULT_DATA: AppData = {
  projects: [
    {
      id: 'p1',
      name: 'Website Redesign',
      color: '#3b82f6', // Blue
      details: 'Overhaul the corporate website with modern UI.',
      tasks: [
        { id: 't1', projectId: 'p1', title: 'Design Mockups', description: 'Create Figma designs for homepage.' },
        { id: 't2', projectId: 'p1', title: 'Frontend Dev', description: 'Implement React components.' },
      ]
    },
    {
      id: 'p2',
      name: 'Marketing Campaign',
      color: '#10b981', // Emerald
      details: 'Q1 2025 Social Media push.',
      tasks: [
        { id: 't3', projectId: 'p2', title: 'Write Copy', description: 'Draft posts for Instagram.' },
        { id: 't4', projectId: 'p2', title: 'Ad Budget', description: 'Finalize budget allocation.' },
      ]
    }
  ],
  calendar: {
    // Example data seeded for demo purposes
    [new Date().toISOString().split('T')[0]]: ['t1']
  }
};

export const storageService = {
  loadData: (): AppData => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return DEFAULT_DATA;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to load data", e);
      return DEFAULT_DATA;
    }
  },

  saveData: (data: AppData): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data", e);
    }
  },

  exportToJson: (data: AppData) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "chronotask_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
};
