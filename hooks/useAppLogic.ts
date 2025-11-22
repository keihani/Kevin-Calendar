import { useState, useEffect, useRef, useMemo } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { format, addMonths, subMonths } from 'date-fns';
import { AppData, Project, Task } from '../types';
import { storageService } from '../services/storageService';

export const useAppLogic = () => {
  // --- Data State ---
  const [data, setData] = useState<AppData>({ projects: [], calendar: {} });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // --- Modal State ---
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // --- Selection State ---
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<{ task: Task | null, projectId: string } | null>(null);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);

  // --- Effects ---
  useEffect(() => {
    const loaded = storageService.loadData();
    setData(loaded);
    if (loaded.projects.length > 0) {
      setExpandedProjectId(loaded.projects[0].id);
    }
  }, []);

  useEffect(() => {
    if (data.projects.length > 0 || Object.keys(data.calendar).length > 0) {
      storageService.saveData(data);
    }
  }, [data]);

  // --- Helpers ---
  const getProject = (id: string) => data.projects.find(p => p.id === id);

  // --- Actions: Projects ---
  const openNewProjectModal = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const saveProject = (name: string, color: string, details: string) => {
    if (editingProject) {
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === editingProject.id ? { ...p, name, color, details } : p)
      }));
    } else {
      const newProject: Project = { id: crypto.randomUUID(), name, color, details, tasks: [] };
      setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
    }
    setIsProjectModalOpen(false);
    setEditingProject(null);
  };

  const deleteProject = (id: string) => {
    if (!confirm("Delete project?")) return;
    setData(prev => {
      const project = prev.projects.find(p => p.id === id);
      const taskIds = project?.tasks.map(t => t.id) || [];
      const newCalendar = { ...prev.calendar };
      Object.keys(newCalendar).forEach(date => {
        newCalendar[date] = newCalendar[date].filter(tid => !taskIds.includes(tid));
        if (newCalendar[date].length === 0) delete newCalendar[date];
      });
      return { projects: prev.projects.filter(p => p.id !== id), calendar: newCalendar };
    });
    if (expandedProjectId === id) setExpandedProjectId(null);
  };

  // --- Actions: Tasks ---
  const openNewTaskModal = (projectId: string) => {
    setEditingTask({ task: null, projectId });
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask({ task, projectId: task.projectId });
    setIsTaskModalOpen(true);
  };

  const saveTask = (title: string, description: string) => {
    if (editingTask && editingTask.projectId) {
      if (editingTask.task) {
        // Update
        setData(prev => ({
          ...prev,
          projects: prev.projects.map(p => {
            if (p.id !== editingTask.projectId) return p;
            return { ...p, tasks: p.tasks.map(t => t.id === editingTask.task!.id ? { ...t, title, description } : t) };
          })
        }));
      } else {
        // Create
        const newTask: Task = { id: crypto.randomUUID(), projectId: editingTask.projectId, title, description };
        setData(prev => ({
          ...prev,
          projects: prev.projects.map(p => {
            if (p.id !== editingTask.projectId) return p;
            return { ...p, tasks: [...p.tasks, newTask] };
          })
        }));
      }
    }
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const deleteTask = (projectId: string, taskId: string) => {
    if (!confirm("Delete task?")) return;
    setData(prev => {
      const newCalendar = { ...prev.calendar };
      Object.keys(newCalendar).forEach(date => {
        newCalendar[date] = newCalendar[date].filter(tid => tid !== taskId);
        if (newCalendar[date].length === 0) delete newCalendar[date];
      });
      return {
        projects: prev.projects.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
        }),
        calendar: newCalendar
      };
    });
  };

  // --- Actions: Calendar ---
  const removeTaskFromCalendar = (date: string, taskId: string) => {
    setData(prev => ({
      ...prev,
      calendar: { ...prev.calendar, [date]: prev.calendar[date].filter(id => id !== taskId) }
    }));
  };

  const openDayDetails = (date: Date) => {
    setSelectedDateForModal(date);
    setIsDayModalOpen(true);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // --- Actions: Import/Export ---
  const importData = (newData: AppData) => {
    setData(newData);
    setIsImportModalOpen(false);
  };

  // --- Computed Data ---
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    Object.entries(data.calendar).forEach(([date, taskIds]) => {
      map[date] = (taskIds as string[]).map(id => {
        for (const p of data.projects) {
          const t = p.tasks.find(task => task.id === id);
          if (t) return t;
        }
        return null;
      }).filter((t): t is Task => t !== null);
    });
    return map;
  }, [data]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDateForModal) return [];
    const dateStr = format(selectedDateForModal, 'yyyy-MM-dd');
    return tasksByDate[dateStr] || [];
  }, [selectedDateForModal, tasksByDate]);

  // --- Drag & Drop ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as Task;
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragTask(null);
    if (over && active.data.current) {
      const taskId = active.data.current.task.id;
      const overId = over.id as string;
      if (overId.startsWith('calendar-day-')) {
        const dateStr = overId.replace('calendar-day-', '');
        setData(prev => {
          const currentTasks = prev.calendar[dateStr] || [];
          if (currentTasks.includes(taskId)) return prev;
          return { ...prev, calendar: { ...prev.calendar, [dateStr]: [...currentTasks, taskId] } };
        });
      }
    }
  };

  return {
    // State
    data,
    currentDate,
    activeDragTask,
    expandedProjectId,
    
    // Modal Visibility
    isProjectModalOpen, setIsProjectModalOpen,
    isTaskModalOpen, setIsTaskModalOpen,
    isImportModalOpen, setIsImportModalOpen,
    isDayModalOpen, setIsDayModalOpen,

    // Selection
    editingProject,
    editingTask,
    selectedDateForModal,

    // Actions
    setExpandedProjectId,
    openNewProjectModal,
    openEditProjectModal,
    saveProject,
    deleteProject,
    openNewTaskModal,
    openEditTaskModal,
    saveTask,
    deleteTask,
    removeTaskFromCalendar,
    openDayDetails,
    nextMonth,
    prevMonth,
    importData,
    handleDragStart,
    handleDragEnd,

    // Helpers/Computed
    getProject,
    tasksByDate,
    selectedDayTasks
  };
};
