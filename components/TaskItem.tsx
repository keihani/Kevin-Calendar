import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types';
import { GripVertical, Edit2, Trash2 } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  projectColor: string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, projectColor, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: 'TASK',
      task,
      origin: 'PROJECT'
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative flex items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm
        hover:shadow-md transition-all mb-2 touch-none select-none
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-blue-400 rotate-2' : ''}
      `}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="mr-3 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500"
      >
        <GripVertical size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-800 truncate">{task.title}</h4>
        <p className="text-xs text-gray-500 truncate">{task.description}</p>
      </div>

      {/* Color Indicator */}
      <div
        className="w-1.5 h-8 rounded-full mx-3"
        style={{ backgroundColor: projectColor }}
      />

      {/* Actions (Visible on Hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-white/90 p-1 rounded shadow-sm border border-gray-100">
        <button
          onClick={() => onEdit(task)}
          className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
