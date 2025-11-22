import React from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';

// Logic
import { useAppLogic } from './hooks/useAppLogic';

// Layout Components
import { Header } from './components/layout/Header';
import { ProjectBoard } from './components/ProjectBoard';
import { CalendarView } from './components/Calendar';

// Modal Components
import { ProjectModal } from './components/modals/ProjectModal';
import { TaskModal } from './components/modals/TaskModal';
import { ImportModal } from './components/modals/ImportModal';
import { DayDetailModal } from './components/modals/DayDetailModal';

export default function App() {
  const logic = useAppLogic();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={logic.handleDragStart} 
      onDragEnd={logic.handleDragEnd}
    >
      <div className="flex h-screen w-screen bg-white text-gray-800 font-sans overflow-hidden">
        
        {/* Sidebar */}
        <div className="hidden md:block">
          <ProjectBoard
            projects={logic.data.projects}
            expandedProjectId={logic.expandedProjectId}
            onToggleProject={(id) => logic.setExpandedProjectId(logic.expandedProjectId === id ? null : id)}
            onAddProject={logic.openNewProjectModal}
            onEditProject={logic.openEditProjectModal}
            onDeleteProject={logic.deleteProject}
            onAddTask={logic.openNewTaskModal}
            onEditTask={logic.openEditTaskModal}
            onDeleteTask={logic.deleteTask}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-50/30">
          <Header 
            currentDate={logic.currentDate}
            onPrevMonth={logic.prevMonth}
            onNextMonth={logic.nextMonth}
            onOpenImport={() => logic.setIsImportModalOpen(true)}
            data={logic.data}
          />

          <div className="flex-1 p-6 overflow-hidden">
            <CalendarView
              currentDate={logic.currentDate}
              tasksByDate={logic.tasksByDate}
              getProject={logic.getProject}
              onRemoveTask={logic.removeTaskFromCalendar}
              onPrevMonth={logic.prevMonth}
              onNextMonth={logic.nextMonth}
              onDayDoubleClick={logic.openDayDetails}
            />
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {logic.activeDragTask ? (
          <div className="opacity-90 rotate-3 cursor-grabbing">
             <div className="p-3 bg-white rounded-lg border-2 border-blue-500 shadow-xl w-64">
                <h4 className="font-bold text-gray-800">{logic.activeDragTask.title}</h4>
             </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Modals */}
      <ProjectModal 
        isOpen={logic.isProjectModalOpen} 
        onClose={() => logic.setIsProjectModalOpen(false)} 
        project={logic.editingProject} 
        onSave={logic.saveProject} 
      />
      
      <TaskModal 
        isOpen={logic.isTaskModalOpen} 
        onClose={() => logic.setIsTaskModalOpen(false)} 
        task={logic.editingTask?.task || null} 
        onSave={logic.saveTask} 
      />

      <ImportModal 
        isOpen={logic.isImportModalOpen} 
        onClose={() => logic.setIsImportModalOpen(false)} 
        onImport={logic.importData} 
      />

      <DayDetailModal 
        isOpen={logic.isDayModalOpen} 
        onClose={() => logic.setIsDayModalOpen(false)} 
        date={logic.selectedDateForModal} 
        tasks={logic.selectedDayTasks}
        getProject={logic.getProject}
        onRemoveTask={logic.removeTaskFromCalendar}
      />

    </DndContext>
  );
}
