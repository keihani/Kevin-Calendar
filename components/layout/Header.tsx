import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Upload, Download, Menu } from 'lucide-react';
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
    <header className="bg-white border-b border-gray-200 shadow-sm z-20 flex flex-col relative">
      
      {/* Top Brand Section */}
      <div className="w-full flex justify-center items-center py-3 border-b border-gray-100 bg-gray-50/30 backdrop-blur-sm gap-3">
        <img src="https://raw.githubusercontent.com/keihani/sources/main/Kevin_Calendar.png" alt="Kevin Calendar Icon" className="w-8 h-8 object-contain" />
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">
          Kevin Calendar
        </h1>
      </div>

      {/* Toolbar Section */}
      <div className="px-4 md:px-6 py-3 flex items-center justify-between flex-nowrap">
        
        {/* Left Section (Menu & Subtitle) */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <button 
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-label="Toggle Menu"
          >
            <Menu size={24} />
          </button>

          <p className="text-xs text-gray-500 hidden sm:block font-medium truncate">
            Manage your timeline
          </p>
        </div>

        {/* Center Section (Month Nav) */}
        <div className="flex items-center justify-center w-2/4">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-sm">
            <button onClick={onPrevMonth} className="p-1.5 hover:bg-white rounded-lg transition text-gray-500 hover:text-blue-600 hover:shadow-sm">
              <ChevronLeft size={18} />
            </button>
            <span className="px-2 md:px-4 font-bold text-sm md:text-base w-28 md:w-36 text-center select-none truncate text-gray-800">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button onClick={onNextMonth} className="p-1.5 hover:bg-white rounded-lg transition text-gray-500 hover:text-blue-600 hover:shadow-sm">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        
        {/* Right Section (Actions) */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0 w-1/4">
          <Button variant="secondary" size="sm" onClick={onOpenImport} className="px-2 md:px-3 h-9">
            <Upload size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => storageService.exportToJson(data)} className="px-2 md:px-3 h-9">
            <Download size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

      </div>
    </header>
  );
};