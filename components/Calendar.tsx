import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { Task, Project } from '../types';
import { X } from 'lucide-react';

// --- Helper Components ---

interface CalendarDayProps {
  date: Date;
  tasks: Task[];
  getProject: (id: string) => Project | undefined;
  onRemoveTask: (date: string, taskId: string) => void;
  onDayDoubleClick: (date: Date) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ date, tasks, getProject, onRemoveTask, onDayDoubleClick }) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-day-${dateStr}`,
    data: { date: dateStr }
  });

  const isCurrentMonth = isSameMonth(date, new Date());
  const isTodayDate = isToday(date);

  // Logic to limit visible tasks to prevent jumbled UI
  const MAX_VISIBLE_ITEMS = 3;
  const hasOverflow = tasks.length > MAX_VISIBLE_ITEMS;
  // If overflowing, show one less item to make room for the "+X more" indicator
  const visibleTasks = hasOverflow ? tasks.slice(0, MAX_VISIBLE_ITEMS - 1) : tasks;
  const overflowCount = tasks.length - visibleTasks.length;

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDayDoubleClick(date);
      }}
      className={`
        min-h-[120px] p-2 border-b border-r border-gray-100 transition-colors relative group cursor-pointer
        ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : 'bg-white hover:bg-gray-50'}
        ${isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-200 z-10' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2 pointer-events-none">
        <span
          className={`
            text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
            ${isTodayDate ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700'}
          `}
        >
          {format(date, 'd')}
        </span>
      </div>

      <div className="space-y-1.5">
        {visibleTasks.map(task => {
          const project = getProject(task.projectId);
          if (!project) return null;

          return (
            <div
              key={`${dateStr}-${task.id}`}
              className="text-xs p-1.5 rounded border shadow-sm relative group/task transition-all hover:shadow-md select-none"
              style={{
                backgroundColor: `${project.color}15`, // 15% opacity hex
                borderColor: `${project.color}40`,
                color: '#1f2937'
              }}
              title={task.description}
              onClick={(e) => e.stopPropagation()}
            >
               <div className="flex items-center justify-between gap-1">
                <span className="truncate font-medium">{task.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTask(dateStr, task.id);
                  }}
                  className="opacity-0 group-hover/task:opacity-100 text-gray-500 hover:text-red-600 transition-opacity p-0.5 hover:bg-white/50 rounded"
                >
                  <X size={12} />
                </button>
               </div>
               <div className="text-[10px] opacity-75 truncate">{project.name}</div>
            </div>
          );
        })}
        
        {hasOverflow && (
            <div 
                className="text-xs text-gray-500 font-medium p-1 text-center hover:bg-gray-200 rounded cursor-pointer transition-colors select-none"
                onClick={(e) => {
                    e.stopPropagation();
                    onDayDoubleClick(date);
                }}
            >
                + {overflowCount} more
            </div>
        )}
      </div>
    </div>
  );
};

// --- Main Calendar View ---

interface CalendarViewProps {
  currentDate: Date;
  tasksByDate: Record<string, Task[]>;
  getProject: (id: string) => Project | undefined;
  onRemoveTask: (date: string, taskId: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayDoubleClick: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  tasksByDate,
  getProject,
  onRemoveTask,
  onDayDoubleClick,
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDays.map(day => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr flex-1 overflow-y-auto">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] || [];

          return (
            <CalendarDay
              key={dateKey}
              date={day}
              tasks={dayTasks}
              getProject={getProject}
              onRemoveTask={onRemoveTask}
              onDayDoubleClick={onDayDoubleClick}
            />
          );
        })}
      </div>
    </div>
  );
};