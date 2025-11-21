import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// Google GenAI
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, Blob as GenAIBlob } from '@google/genai';

// Components
import { ProjectBoard } from './components/ProjectBoard';
import { CalendarView } from './components/Calendar';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';

// Icons
import { Download, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, Mic, MicOff } from 'lucide-react';

// --- Audio Helper Functions ---
function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  // Simple PCM format without headers
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Tool Definitions ---
const tools: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: 'createProject',
        description: 'Create a new project with a name, optional description and color.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING },
            description: { type: Type.STRING },
            color: { type: Type.STRING, description: "Hex color code (e.g. #ff0000) or generic name (red, blue)" }
          },
          required: ['projectName']
        }
      },
      {
        name: 'createTask',
        description: 'Create a new task within a specific project.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING, description: 'Name of the project to add the task to' },
            taskTitle: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ['projectName', 'taskTitle']
        }
      },
      {
        name: 'selectProject',
        description: 'Select and expand a project by its name to show its tasks.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING, description: 'The fuzzy name of the project' }
          },
          required: ['projectName']
        }
      },
      {
        name: 'deleteProject',
        description: 'Delete a project by name.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING }
          },
          required: ['projectName']
        }
      },
      {
        name: 'deleteCurrentProject',
        description: 'Delete the currently selected (expanded) project. Use this when the user says "delete the selected project" or "delete this project".',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        }
      },
      {
        name: 'deleteTask',
        description: 'Delete a task by title.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskTitle: { type: Type.STRING }
          },
          required: ['taskTitle']
        }
      },
      {
        name: 'scheduleTask',
        description: 'Assign a task to a specific date on the calendar.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskTitle: { type: Type.STRING, description: 'The title of the task' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' }
          },
          required: ['taskTitle', 'date']
        }
      },
      {
        name: 'removeTaskFromCalendar',
        description: 'Remove a task from a specific date on the calendar.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            taskTitle: { type: Type.STRING },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' }
          },
          required: ['taskTitle', 'date']
        }
      }
    ]
  }
];

export default function App() {
  // --- State ---
  const [data, setData] = useState<AppData>({ projects: [], calendar: {} });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<{ task: Task | null, projectId: string } | null>(null);
  
  // Day Detail Modal
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);

  // AI State
  const [isAiConnected, setIsAiConnected] = useState(false);
  const dataRef = useRef<AppData>(data); // Ref to access current data in callbacks
  const expandedProjectIdRef = useRef<string | null>(expandedProjectId); // Ref for currently selected project

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
    dataRef.current = data; // Update ref whenever data changes
  }, [data]);

  useEffect(() => {
    expandedProjectIdRef.current = expandedProjectId;
  }, [expandedProjectId]);

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
    
    if (expandedProjectId === id) {
        setExpandedProjectId(null);
    }
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

  const handleRemoveTaskFromCalendar = (date: string, taskId: string) => {
    setData(prev => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        [date]: prev.calendar[date].filter(id => id !== taskId)
      }
    }));
  };

  // --- AI Integration ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const connectToAi = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Audio Contexts
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const outputNode = audioContextRef.current.createGain();
      outputNode.connect(audioContextRef.current.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a helpful assistant for "Kevin Task Manager". 
          Current Date: ${new Date().toISOString().split('T')[0]}.
          You can help the user manage projects and tasks.
          You can create, delete, and schedule tasks and projects using the provided tools.
          When asked to select a task, select the project containing it.
          If the user says "delete this project" or "delete the selected project", use the deleteCurrentProject tool.`,
          tools: tools,
        },
        callbacks: {
            onopen: () => {
                setIsAiConnected(true);
                // Setup Input Stream
                const ctx = inputContextRef.current!;
                const source = ctx.createMediaStreamSource(stream);
                const processor = ctx.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const blob = createBlob(inputData);
                    sessionPromise.then(session => session.sendRealtimeInput({ media: blob }));
                };
                
                source.connect(processor);
                processor.connect(ctx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
                // Handle Tool Calls
                if (msg.toolCall) {
                    const responses = [];
                    for (const fc of msg.toolCall.functionCalls) {
                        const { name, args, id } = fc;
                        let result = { status: 'ok' };
                        
                        try {
                            // Execute Tool Logic against current data (dataRef.current)
                            if (name === 'createProject') {
                                const pName = (args as any).projectName;
                                const desc = (args as any).description || '';
                                let color = (args as any).color || '#3b82f6';
                                
                                // Simple color mapping if user says "Red"
                                const colors: Record<string, string> = {
                                    red: '#ef4444', blue: '#3b82f6', green: '#10b981', 
                                    yellow: '#f59e0b', purple: '#8b5cf6', orange: '#f97316',
                                    pink: '#ec4899', gray: '#6b7280'
                                };
                                if (colors[color.toLowerCase()]) color = colors[color.toLowerCase()];

                                const newProject: Project = {
                                    id: crypto.randomUUID(),
                                    name: pName,
                                    color: color,
                                    details: desc,
                                    tasks: []
                                };
                                setData(prev => ({ ...prev, projects: [...prev.projects, newProject] }));
                                setExpandedProjectId(newProject.id);
                                result = { status: `Created project: ${pName}` };
                            } else if (name === 'createTask') {
                                const pName = (args as any).projectName.toLowerCase();
                                const tTitle = (args as any).taskTitle;
                                const desc = (args as any).description || '';
                                
                                const project = dataRef.current.projects.find(p => p.name.toLowerCase().includes(pName));
                                if (project) {
                                    const newTask: Task = {
                                        id: crypto.randomUUID(),
                                        projectId: project.id,
                                        title: tTitle,
                                        description: desc
                                    };
                                    setData(prev => ({
                                        ...prev,
                                        projects: prev.projects.map(p => {
                                            if (p.id !== project.id) return p;
                                            return { ...p, tasks: [...p.tasks, newTask] };
                                        })
                                    }));
                                    result = { status: `Added task "${tTitle}" to project "${project.name}"` };
                                } else {
                                    result = { status: `Project "${pName}" not found` };
                                }
                            } else if (name === 'selectProject') {
                                const pName = (args as any).projectName.toLowerCase();
                                const project = dataRef.current.projects.find(p => p.name.toLowerCase().includes(pName));
                                if (project) {
                                    setExpandedProjectId(project.id);
                                    result = { status: `Selected project: ${project.name}` };
                                } else {
                                    result = { status: 'Project not found' };
                                }
                            } else if (name === 'deleteProject') {
                                const pName = (args as any).projectName.toLowerCase();
                                const project = dataRef.current.projects.find(p => p.name.toLowerCase().includes(pName));
                                if (project) {
                                    handleDeleteProject(project.id);
                                    result = { status: `Deleted project: ${project.name}` };
                                } else {
                                    result = { status: 'Project not found' };
                                }
                            } else if (name === 'deleteCurrentProject') {
                                const currentId = expandedProjectIdRef.current;
                                if (currentId) {
                                    const project = dataRef.current.projects.find(p => p.id === currentId);
                                    if (project) {
                                        handleDeleteProject(currentId);
                                        result = { status: `Deleted selected project: ${project.name}` };
                                    } else {
                                        result = { status: 'Project ID found but data missing' };
                                    }
                                } else {
                                    result = { status: 'No project is currently selected' };
                                }
                            } else if (name === 'deleteTask') {
                                const tTitle = (args as any).taskTitle.toLowerCase();
                                let found = false;
                                for (const p of dataRef.current.projects) {
                                    const t = p.tasks.find(tsk => tsk.title.toLowerCase().includes(tTitle));
                                    if (t) {
                                        handleDeleteTask(p.id, t.id);
                                        result = { status: `Deleted task: ${t.title}` };
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) result = { status: 'Task not found' };
                            } else if (name === 'scheduleTask') {
                                const tTitle = (args as any).taskTitle.toLowerCase();
                                const date = (args as any).date;
                                let foundTask = null;
                                for (const p of dataRef.current.projects) {
                                    const t = p.tasks.find(tsk => tsk.title.toLowerCase().includes(tTitle));
                                    if (t) { foundTask = t; break; }
                                }
                                if (foundTask) {
                                    setData(prev => {
                                        const currentTasks = prev.calendar[date] || [];
                                        if (currentTasks.includes(foundTask.id)) return prev;
                                        return {
                                            ...prev,
                                            calendar: { ...prev.calendar, [date]: [...currentTasks, foundTask.id] }
                                        };
                                    });
                                    result = { status: `Scheduled ${foundTask.title} for ${date}` };
                                } else {
                                    result = { status: 'Task not found' };
                                }
                            } else if (name === 'removeTaskFromCalendar') {
                                const tTitle = (args as any).taskTitle.toLowerCase();
                                const date = (args as any).date;
                                let foundTask = null;
                                for (const p of dataRef.current.projects) {
                                    const t = p.tasks.find(tsk => tsk.title.toLowerCase().includes(tTitle));
                                    if (t) { foundTask = t; break; }
                                }
                                if (foundTask) {
                                    handleRemoveTaskFromCalendar(date, foundTask.id);
                                    result = { status: `Removed ${foundTask.title} from ${date}` };
                                } else {
                                    result = { status: 'Task not found' };
                                }
                            }
                        } catch (err) {
                            console.error("Tool Execution Error", err);
                            result = { status: 'Error executing command' };
                        }
                        
                        responses.push({
                            id,
                            name,
                            response: { result }
                        });
                    }
                    
                    sessionPromise.then(session => session.sendToolResponse({ functionResponses: responses }));
                }

                // Handle Audio Output
                const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    const ctx = audioContextRef.current!;
                    const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                    
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(outputNode); // Connect to the previously created gain node
                    
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                    
                    sourcesRef.current.add(source);
                    source.onended = () => sourcesRef.current.delete(source);
                }
            },
            onclose: () => {
                setIsAiConnected(false);
            },
            onerror: (e) => {
                console.error("Gemini Live Error", e);
                setIsAiConnected(false);
            }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (e) {
        console.error("Failed to connect to AI", e);
        setIsAiConnected(false);
    }
  };

  const disconnectAi = async () => {
    if (sessionRef.current) {
        const session = await sessionRef.current;
        session.close();
    }
    inputContextRef.current?.close();
    audioContextRef.current?.close();
    setIsAiConnected(false);
  };

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

  const getProject = (id: string) => data.projects.find(p => p.id === id);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-screen bg-white text-gray-800 font-sans overflow-hidden">

        {/* Sidebar: Project Board */}
        <div className="hidden md:block">
          <ProjectBoard
            projects={data.projects}
            expandedProjectId={expandedProjectId}
            onToggleProject={(id) => setExpandedProjectId(expandedProjectId === id ? null : id)}
            onAddProject={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
            onEditProject={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
            onDeleteProject={(id) => { if(confirm("Delete project?")) handleDeleteProject(id); }}
            onAddTask={(pid) => { setEditingTask({ task: null, projectId: pid }); setIsTaskModalOpen(true); }}
            onEditTask={(t) => { setEditingTask({ task: t, projectId: t.projectId }); setIsTaskModalOpen(true); }}
            onDeleteTask={(pid, tid) => { if(confirm("Delete task?")) handleDeleteTask(pid, tid); }}
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

               <button
                  onClick={isAiConnected ? disconnectAi : connectToAi}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm ${
                    isAiConnected 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
               >
                  {isAiConnected ? <MicOff size={16} /> : <Mic size={16} />}
                  <span className="font-medium text-sm">{isAiConnected ? 'Listening...' : 'AI Voice'}</span>
               </button>

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