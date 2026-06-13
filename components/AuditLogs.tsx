import React from 'react';
import { AuditLogEntry, AuditAction } from '../types';
import { History, PlusCircle, Trash2, ShoppingCart, Edit, FileSpreadsheet, RotateCcw, Calendar, User } from 'lucide-react';

interface AuditLogsProps {
  logs: AuditLogEntry[];
}

const AuditLogs: React.FC<AuditLogsProps> = ({ logs }) => {
  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case AuditAction.ADD: return <PlusCircle size={18} className="text-emerald-600" />;
      case AuditAction.DELETE: return <Trash2 size={18} className="text-red-600" />;
      case AuditAction.SALE: return <ShoppingCart size={18} className="text-blue-600" />;
      case AuditAction.UPDATE: return <Edit size={18} className="text-amber-600" />;
      case AuditAction.BULK_IMPORT: return <FileSpreadsheet size={18} className="text-violet-600" />;
      case AuditAction.REFUND: return <RotateCcw size={18} className="text-orange-600" />;
      default: return <History size={18} className="text-slate-600" />;
    }
  };

  const getActionLabel = (action: AuditAction) => {
    switch (action) {
      case AuditAction.ADD: return 'Əlavə edildi';
      case AuditAction.DELETE: return 'Silindi';
      case AuditAction.SALE: return 'Satış';
      case AuditAction.UPDATE: return 'Yeniləndi';
      case AuditAction.BULK_IMPORT: return 'Toplu İdxal';
      case AuditAction.REFUND: return 'Geri Qaytarma';
      default: return action;
    }
  };

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case AuditAction.ADD: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case AuditAction.DELETE: return 'bg-red-50 text-red-700 border-red-100';
      case AuditAction.SALE: return 'bg-blue-50 text-blue-700 border-blue-100';
      case AuditAction.UPDATE: return 'bg-amber-50 text-amber-700 border-amber-100';
      case AuditAction.BULK_IMPORT: return 'bg-violet-50 text-violet-700 border-violet-100';
      case AuditAction.REFUND: return 'bg-orange-50 text-orange-700 border-orange-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-slate-600" /> Anbar Tarixçəsi
          </h2>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {logs.length} əməliyyat
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm font-medium border-b border-slate-100">
                <th className="p-4 w-48">Tarix</th>
                <th className="p-4 w-36">Əməliyyat</th>
                <th className="p-4 w-36">İstifadəçi</th>
                <th className="p-4">Detallar</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500 text-sm flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(log.date).toLocaleString('az-AZ')}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 w-fit ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 text-sm">
                    {log.userName ? (
                      <span className="flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" />
                        {log.userName}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-700 font-medium">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    Hələ heç bir əməliyyat qeydə alınmayıb.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;