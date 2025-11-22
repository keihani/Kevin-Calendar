import React, { useRef } from 'react';
import { Upload, FileJson } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { storageService } from '../../services/storageService';
import { AppData } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: AppData) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const json = JSON.parse(result);
        
        if (storageService.validateData(json)) {
          if (confirm("This will overwrite your current data. Are you sure?")) {
            onImport(json);
            alert("Data imported successfully!");
          }
        } else {
          alert("Invalid data format. Please select a valid JSON file.");
        }
      } catch (err) {
        alert("Error parsing JSON file: " + err);
      }
      // Reset input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Data">
      <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select JSON File</label>
            <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-center"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                    <FileJson size={24} />
                </div>
                <p className="text-sm font-medium text-gray-900">Click to upload</p>
                <p className="text-xs text-gray-500 mt-1">.json files only</p>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden" 
                />
            </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            <strong>Warning:</strong> Importing a file will completely overwrite your current projects and calendar schedule.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
};