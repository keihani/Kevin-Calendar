import React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Task, Project } from '../../types';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  tasks: Task[];
  getProject: (id: string) => Project | undefined;
  onRemoveTask: (date: string, taskId: string) => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  date, 
  tasks, 
  getProject, 
  onRemoveTask 
}) => {
  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={date ? `Tasks for ${format(date, 'MMMM d, yyyy')}` : 'Day Details'}
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No tasks scheduled for this day.</p>
            <p className="text-xs mt-2">Drag tasks from the sidebar to schedule them.</p>
          </div>
        ) : (
          tasks.map(task => {
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
                  onClick={() => onRemoveTask(dateStr, task.id)}
                  icon={<Trash2 size={16} />}
                >
                </Button>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};
