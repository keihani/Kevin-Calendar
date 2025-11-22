import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Task } from '../../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (title: string, description: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave(
      formData.get('title') as string,
      formData.get('description') as string
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
          <input 
            name="title" 
            defaultValue={task?.title} 
            required 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
            placeholder="e.g., Write draft" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea 
            name="description" 
            defaultValue={task?.description} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
            rows={3} 
            placeholder="Details about this task..." 
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{task ? 'Save Changes' : 'Add Task'}</Button>
        </div>
      </form>
    </Modal>
  );
};
