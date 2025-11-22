import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Upload, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { storageService } from '../../services/storageService';
import { AppData } from '../../types';

interface HeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenImport: () => void;
  data: AppData;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentDate, 
  onPrevMonth, 
  onNextMonth, 
  onOpenImport, 
  data 
}) => {
  return (
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
          <button onClick={onPrevMonth} className="p-1.5 hover:bg-white rounded-md transition shadow-sm hover:shadow text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <span className="px-4 font-semibold text-sm w-32 text-center select-none">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={onNextMonth} className="p-1.5 hover:bg-white rounded-md transition shadow-sm hover:shadow text-gray-600">
            <ChevronRight size={18} />
          </button>
        </div>
        
        <div className="h-6 w-px bg-gray-300 mx-2"></div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Upload size={16} />} onClick={onOpenImport}>
            Import
          </Button>
          <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={() => storageService.exportToJson(data)}>
            Export
          </Button>
        </div>
      </div>
    </header>
  );
};
