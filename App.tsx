import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { format, addMonths, subMonths } from 'date-fns';
import { Project, Task, AppData } from './types';
import { storageService } from './services/storageService';

// Components
import { ProjectBoard } from './components/ProjectBoard';
import { CalendarView } from './components/Calendar';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';

// Icons
import { Download, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

export default function App() {
  // --- State ---
  const [data, setData] = useState<AppData>({ projects: [], calendar: {} });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<{ task: Task | null, projectId: string } | null>(null);
  
  // Day Detail Modal
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);

  // --- Effects ---
  useEffect(() => {
    const loaded = storageService.loadData();
    setData(loaded);
  }, []);

  useEffect(() => {
    if (data.projects.length > 0 || Object.keys(data.calendar).length > 0) {
      storageService.saveData(data);
    }
  }, [data]);

  // --- Computed ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    Object.entries(data.calendar).forEach(([date, taskIds]) => {
      map[date] = (taskIds as string[])
        .map(id => {
          for (const p of data.projects) {
            const t = p.tasks.find(task => task.id === id);
            if (t) return t;
          }
          return null;
        })
        .filter((t): t is Task => t !== null);
    });
    return map;
  }, [data]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDateForModal) return [];
    const dateStr = format(selectedDateForModal, 'yyyy-MM-dd');
    return tasksByDate[dateStr] || [];
  }, [selectedDateForModal, tasksByDate]);

  // --- Handlers: Project ---
  const handleSaveProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const color = formData.get('color') as string;
    const details = formData.get('details') as string;

    if (editingProject) {
      setData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === editingProject.id ? { ...p, name, color, details } : p)
      }));
    } else {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name,
        color,
        details,
        tasks: []
      };
      setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
    }
    setIsProjectModalOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProject = (id: string) => {
    if (!confirm('Delete project and all its tasks?')) return;
    setData(prev => {
      // Also cleanup calendar entries
      const project = prev.projects.find(p => p.id === id);
      const taskIds = project?.tasks.map(t => t.id) || [];
      const newCalendar = { ...prev.calendar };

      Object.keys(newCalendar).forEach(date => {
        newCalendar[date] = newCalendar[date].filter(tid => !taskIds.includes(tid));
        if (newCalendar[date].length === 0) delete newCalendar[date];
      });

      return {
        projects: prev.projects.filter(p => p.id !== id),
        calendar: newCalendar
      };
    });
  };

  // --- Handlers: Task ---
  const handleSaveTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (editingTask && editingTask.projectId) {
      if (editingTask.task) {
        // Edit existing
        setData(prev => ({
          ...prev,
          projects: prev.projects.map(p => {
            if (p.id !== editingTask.projectId) return p;
            return {
              ...p,
              tasks: p.tasks.map(t => t.id === editingTask.task!.id ? { ...t, title, description } : t)
            };
          })
        }));
      } else {
        // Add new
        const newTask: Task = {
          id: crypto.randomUUID(),
          projectId: editingTask.projectId,
          title,
          description
        };
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

  const handleDeleteTask = (projectId: string, taskId: string) => {
    if (!confirm('Delete task?')) return;
    setData(prev => {
      // Cleanup calendar
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

  // --- Handlers: Drag & Drop ---
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
      // Check if dropped on a calendar day
      const overId = over.id as string;

      if (overId.startsWith('calendar-day-')) {
        const dateStr = overId.replace('calendar-day-', '');

        setData(prev => {
          const currentTasks = prev.calendar[dateStr] || [];
          // Avoid duplicates on same day
          if (currentTasks.includes(taskId)) return prev;

          return {
            ...prev,
            calendar: {
              ...prev.calendar,
              [dateStr]: [...currentTasks, taskId]
            }
          };
        });
      }
    }
  };

  const handleRemoveTaskFromCalendar = (date: string, taskId: string) => {
    setData(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        [date]: prev.calendar[date].filter(id => id !== taskId)
      }
    }));
  };

  const getProject = (id: string) => data.projects.find(p => p.id === id);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-screen bg-white text-gray-800 font-sans overflow-hidden">

        {/* Sidebar: Project Board */}
        <div className="hidden md:block">
          <ProjectBoard
            projects={data.projects}
            onAddProject={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
            onEditProject={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
            onDeleteProject={handleDeleteProject}
            onAddTask={(pid) => { setEditingTask({ task: null, projectId: pid }); setIsTaskModalOpen(true); }}
            onEditTask={(t) => { setEditingTask({ task: t, projectId: t.projectId }); setIsTaskModalOpen(true); }}
            onDeleteTask={handleDeleteTask}
          />
        </div>

        {/* Main Content: Calendar */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-50/30">
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                 <CalendarIcon size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Kevin Task Manager</h1>
                <p className="text-xs text-gray-500">Manage your timeline</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex items-center bg-gray-100 rounded-lg p-1">
                 <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md transition shadow-sm hover:shadow text-gray-600">
                    <ChevronLeft size={18} />
                 </button>
                 <span className="px-4 font-semibold text-sm w-32 text-center select-none">
                    {format(currentDate, 'MMMM yyyy')}
                 </span>
                 <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md transition shadow-sm hover:shadow text-gray-600">
                    <ChevronRight size={18} />
                 </button>
               </div>

               <div className="h-6 w-px bg-gray-300 mx-2"></div>

               <Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={() => storageService.exportToJson(data)}>
                  Export
               </Button>
            </div>
          </header>

          {/* Calendar Area */}
          <div className="flex-1 p-6 overflow-hidden">
            <CalendarView
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              getProject={getProject}
              onRemoveTask={handleRemoveTaskFromCalendar}
              onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
              onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
              onDayDoubleClick={(date) => {
                setSelectedDateForModal(date);
                setIsDayModalOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragTask ? (
          <div className="opacity-90 rotate-3 cursor-grabbing">
             <div className="p-3 bg-white rounded-lg border-2 border-blue-500 shadow-xl w-64">
                <h4 className="font-bold text-gray-800">{activeDragTask.title}</h4>
             </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* --- Modals --- */}

      {/* Project Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProject ? 'Edit Project' : 'New Project'}
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              name="name"
              defaultValue={editingProject?.name}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g., Q1 Marketing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="color"
                defaultValue={editingProject?.color || '#3b82f6'}
                className="h-10 w-20 rounded cursor-pointer border border-gray-300 p-1"
              />
              <span className="text-xs text-gray-500">Pick a color to identify tasks</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
            <textarea
              name="details"
              defaultValue={editingProject?.details}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              rows={3}
              placeholder="Project description..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
             <Button type="button" variant="secondary" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
             <Button type="submit">{editingProject ? 'Save Changes' : 'Create Project'}</Button>
          </div>
        </form>
      </Modal>

      {/* Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask?.task ? 'Edit Task' : 'New Task'}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input
              name="title"
              defaultValue={editingTask?.task?.title}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g., Write draft"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              defaultValue={editingTask?.task?.description}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              rows={3}
              placeholder="Details about this task..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
             <Button type="button" variant="secondary" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
             <Button type="submit">{editingTask?.task ? 'Save Changes' : 'Add Task'}</Button>
          </div>
        </form>
      </Modal>

      {/* Day Details Modal */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title={selectedDateForModal ? `Tasks for ${format(selectedDateForModal, 'MMMM d, yyyy')}` : 'Day Details'}
      >
         <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
             {selectedDayTasks.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">
                     <p>No tasks scheduled for this day.</p>
                     <p className="text-xs mt-2">Drag tasks from the sidebar to schedule them.</p>
                 </div>
             ) : (
                 selectedDayTasks.map(task => {
                     const project = getProject(task.projectId);
                     return (
                         <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all group">
                             <div className="flex items-center gap-3 overflow-hidden">
                                 <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color || '#ccc' }}></div>
                                 <div className="flex-1 min-w-0">
                                     <h4 className="font-medium text-gray-800 text-sm truncate">{task.title}</h4>
                                     <p className="text-xs text-gray-500 truncate">{project?.name} • {task.description}</p>
                                 </div>
                             </div>
                             <Button
                                 variant="ghost"
                                 size="sm"
                                 className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                 onClick={() => {
                                     if(selectedDateForModal) {
                                         handleRemoveTaskFromCalendar(format(selectedDateForModal, 'yyyy-MM-dd'), task.id);
                                     }
                                 }}
                                 icon={<Trash2 size={16} />}
                             >
                             </Button>
                         </div>
                     );
                 })
             )}
         </div>
         <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
             <Button variant="secondary" onClick={() => setIsDayModalOpen(false)}>Close</Button>
         </div>
      </Modal>

    </DndContext>
  );
}