import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Project } from '../../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSave: (name: string, color: string, details: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, project, onSave }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave(
      formData.get('name') as string,
      formData.get('color') as string,
      formData.get('details') as string
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'New Project'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input 
            name="name" 
            defaultValue={project?.name} 
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
              defaultValue={project?.color || '#3b82f6'} 
              className="h-10 w-20 rounded cursor-pointer border border-gray-300 p-1" 
            />
            <span className="text-xs text-gray-500">Pick a color to identify tasks</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <textarea 
            name="details" 
            defaultValue={project?.details} 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
            rows={3} 
            placeholder="Project description..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{project ? 'Save Changes' : 'Create Project'}</Button>
        </div>
      </form>
    </Modal>
  );
};
