import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Upload, Download, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { storageService } from '../../services/storageService';
import { AppData } from '../../types';

interface HeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenImport: () => void;
  onToggleSidebar: () => void;
  data: AppData;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentDate, 
  onPrevMonth, 
  onNextMonth, 
  onOpenImport, 
  onToggleSidebar,
  data 
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm z-20 flex-nowrap">
      {/* Left Section */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden focus:outline-none focus:ring-2 focus:ring-gray-200"
          aria-label="Toggle Menu"
        >
          <Menu size={24} />
        </button>

        <div className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
          <CalendarIcon size={20} className="md:w-6 md:h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight truncate">Kevin Calendar</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Manage your timeline</p>
        </div>
      </div>

      {/* Center Section (Month Nav) */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1 mx-2 flex-shrink-0">
        <button onClick={onPrevMonth} className="p-1 hover:bg-white rounded-md transition shadow-sm hover:shadow text-gray-600">
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 md:px-4 font-semibold text-xs md:text-sm w-24 md:w-32 text-center select-none truncate">
          {format(currentDate, 'MMM yyyy')}
        </span>
        <button onClick={onNextMonth} className="p-1 hover:bg-white rounded-md transition shadow-sm hover:shadow text-gray-600">
          <ChevronRight size={16} />
        </button>
      </div>
      
      {/* Right Section (Actions) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="secondary" size="sm" onClick={onOpenImport} className="px-2 md:px-3">
          <Upload size={16} className="sm:mr-2" />
          <span className="hidden sm:inline">Import</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={() => storageService.exportToJson(data)} className="px-2 md:px-3">
          <Download size={16} className="sm:mr-2" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>
    </header>
  );
};