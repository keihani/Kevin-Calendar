import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Task, Project } from '../types';
import { CalendarDay } from './calendar/CalendarDay';

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
