import React from 'react';
import { Project, Task } from '../types';
import { TaskItem } from './TaskItem';
import { Button } from './ui/Button';
import { Plus, Trash2, Edit } from 'lucide-react';

interface ProjectBoardProps {
  projects: Project[];
  expandedProjectId: string | null;
  onToggleProject: (id: string) => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({
  projects,
  expandedProjectId,
  onToggleProject,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddTask,
  onEditTask,
  onDeleteTask
}) => {
  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200 w-full md:w-80 lg:w-96 flex-shrink-0 transition-all">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <h2 className="text-lg font-bold text-gray-800">Projects</h2>
        <Button size="sm" onClick={onAddProject} icon={<Plus size={16} />}>
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {projects.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
                No projects yet.<br/>Click "New" to start.
            </div>
        )}
        {projects.map(project => (
          <div
            key={project.id}
            className={`
              rounded-xl border transition-all duration-200 overflow-hidden
              ${expandedProjectId === project.id ? 'bg-white shadow-md ring-1 ring-gray-200' : 'bg-white shadow-sm hover:shadow hover:border-gray-300'}
            `}
            style={{ borderColor: expandedProjectId === project.id ? project.color : undefined }}
          >
            {/* Project Header */}
            <div
              className="p-3 flex items-center justify-between cursor-pointer select-none"
              onClick={() => onToggleProject(project.id)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: project.color }}
                />
                <div className="truncate">
                  <h3 className="font-semibold text-gray-800 truncate">{project.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{project.details || 'No details'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mr-2">
                    {project.tasks.length}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedProjectId === project.id && (
              <div className="px-3 pb-3 pt-1 bg-gray-50/50 border-t border-gray-100">
                 {/* Project Actions */}
                 <div className="flex justify-end gap-2 mb-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEditProject(project); }}
                        className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-white hover:shadow-sm"
                    >
                        <Edit size={12} /> Edit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                        className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-white hover:shadow-sm"
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                 </div>

                {/* Task List */}
                <div className="space-y-1 min-h-[50px]">
                  {project.tasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      projectColor={project.color}
                      onEdit={onEditTask}
                      onDelete={(taskId) => onDeleteTask(project.id, taskId)}
                    />
                  ))}
                  {project.tasks.length === 0 && (
                    <p className="text-xs text-center text-gray-400 py-2">No tasks defined.</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 border-dashed border border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTask(project.id);
                  }}
                  icon={<Plus size={14} />}
                >
                  Add Task
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};