import React from 'react';
import { Upload } from 'lucide-react';
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
  const handleImportFromUrl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const url = formData.get('url') as string;
    
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      const json = await response.json();
      if (storageService.validateData(json)) {
        if (confirm("This will overwrite your current data. Are you sure?")) {
          onImport(json);
          alert("Data imported successfully!");
        }
      } else {
        alert("Invalid data format.");
      }
    } catch (err) {
      alert("Error importing data: " + err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Data">
      <form onSubmit={handleImportFromUrl} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input 
            name="url" 
            required 
            type="url" 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
            placeholder="https://raw.githubusercontent.com/..." 
          />
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">Warning: Overwrites existing data.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={<Upload size={16}/>}>Import</Button>
        </div>
      </form>
    </Modal>
  );
};
