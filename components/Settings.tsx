import React, { useState } from 'react';
import { Save, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { toast } from './Toast';

interface SettingsProps {
  lowStockThreshold: number;
  onUpdateThreshold: (val: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ lowStockThreshold, onUpdateThreshold }) => {
  const [val, setVal] = useState(lowStockThreshold);

  const handleSave = () => {
    onUpdateThreshold(val);
    toast.success('Tənzimləmələr yadda saxlanıldı!');
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <SettingsIcon className="text-slate-600" />
          Sistem Tənzimləmələri
        </h2>
        
        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
            <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Kritik Anbar Limiti (Low Stock Threshold)
            </label>
            <p className="text-sm text-slate-600 mb-4">
              Məhsul sayı bu rəqəmdən aşağı düşdükdə sistem "Anbar" və "İdarə Paneli"ndə xəbərdarlıq edəcək.
            </p>
            <div className="flex gap-4 items-center">
              <input 
                type="number" 
                min="1"
                className="border border-amber-200 p-2 rounded-lg w-32 focus:ring-2 focus:ring-amber-500 outline-none"
                value={val}
                onChange={(e) => setVal(Number(e.target.value))}
              />
              <button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
              >
                <Save size={18} /> 
                Yadda Saxla
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;