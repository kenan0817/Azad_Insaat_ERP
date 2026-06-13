import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';

interface POSQuickCustomerModalProps {
  onSave: (name: string, phone: string) => void;
  onCancel: () => void;
}

const POSQuickCustomerModal: React.FC<POSQuickCustomerModalProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md overflow-hidden animate-slide-up">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-600" />
            Yeni Müştəri
          </h3>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Ad Soyad *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Telefon *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="050-000-00-00"
            />
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 pb-safe">
          <button onClick={onCancel} className="flex-1 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-200">
            Ləğv et
          </button>
          <button
            onClick={() => name.trim() && phone.trim() && onSave(name.trim(), phone.trim())}
            disabled={!name.trim() || !phone.trim()}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl"
          >
            Əlavə et
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSQuickCustomerModal;
