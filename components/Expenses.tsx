import React, { useState } from 'react';
import { Expense, AuditAction } from '../types';
import { Wallet, Plus, Search, Trash2, Edit, X } from 'lucide-react';

interface ExpensesProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  addLog: (action: AuditAction, details: string) => void;
}

const EXPENSE_CATEGORIES = ['Maaş (İşçi)', 'İcarə / Kommunal', 'Nəqliyyat / Yanacaq', 'Vergi / Rüsum', 'Gündəlik (Yemək)', 'Digər'];

const Expenses: React.FC<ExpensesProps> = ({ expenses, setExpenses, addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({ category: EXPENSE_CATEGORIES[0] });

  const filteredExpenses = expenses
    .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveExpense = () => {
    if (!formData.title || !formData.amount || !formData.category) return;

    if (formData.id) {
      // Update
      setExpenses(prev => prev.map(e => e.id === formData.id ? { ...e, ...formData } as Expense : e));
      addLog(AuditAction.UPDATE, `Xərc yeniləndi: ${formData.title} (${formData.amount} ₼)`);
    } else {
      // Add
      const newExpense: Expense = {
        id: Date.now().toString(),
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        date: new Date().toISOString(),
      };
      setExpenses(prev => [...prev, newExpense]);
      addLog(AuditAction.ADD, `Yeni xərc rəsmiləşdirildi: ${newExpense.title} (${newExpense.amount} ₼)`);
    }
    setIsModalOpen(false);
    setFormData({ category: EXPENSE_CATEGORIES[0] });
  };

  const handleDeleteExpense = (id: string, title: string) => {
     if(confirm(`Əminsiniz ki, bu xərci silmək istəyirsiniz: ${title}?`)) {
       setExpenses(prev => prev.filter(e => e.id !== id));
       addLog(AuditAction.DELETE, `Xərc silindi: ${title}`);
     }
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in bg-slate-50 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="text-rose-600" />
            Xərclər
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gündəlik xərclərin idarə edilməsi</p>
        </div>

        <button 
          onClick={() => { setFormData({ category: EXPENSE_CATEGORIES[0] }); setIsModalOpen(true); }}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm shadow-rose-500/30 flex items-center gap-2 transition-all"
        >
          <Plus size={20} />
          Xərc Əlavə Et
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-200 pb-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
           <p className="text-sm font-medium text-slate-500 mb-1">Seçilmiş Dövr Üzrə Cəmi Xərc</p>
           <p className="text-3xl font-bold text-slate-800">{totalExpenses.toFixed(2)} ₼</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center">
            <div className="flex items-center gap-3">
              <Search className="text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Xərcin adı və ya kateqoriyasına görə axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-slate-700"
              />
            </div>
        </div>
      </div>

      <div className="bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-4">Tarix</th>
                <th className="p-4">Kateroqiya</th>
                <th className="p-4">Xərcin Adı (Açıqlama)</th>
                <th className="p-4">Məbləğ</th>
                <th className="p-4 w-[100px] text-right">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-slate-500">
                    {new Date(expense.date).toLocaleDateString()} {new Date(expense.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="p-4">
                     <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                        {expense.category}
                     </span>
                  </td>
                  <td className="p-4 font-medium text-slate-800">{expense.title}</td>
                  <td className="p-4 font-bold text-rose-600">{expense.amount.toFixed(2)} ₼</td>
                  <td className="p-4">
                     <div className="flex justify-end gap-2">
                       <button onClick={() => { setFormData(expense); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-lg shadow-sm transition-colors">
                         <Edit size={16} />
                       </button>
                       <button onClick={() => handleDeleteExpense(expense.id, expense.title)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 rounded-lg shadow-sm transition-colors">
                         <Trash2 size={16} />
                       </button>
                     </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                   <td colSpan={5} className="p-8 text-center text-slate-400">
                      Məlumat tapılmadı
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Add/Edit Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {formData.id ? 'Xərci Yenilə' : 'Yeni Xərc'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xərcin kateqoriyası</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Açıqlama</label>
                <input 
                  type="text" 
                  value={formData.title || ''} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" 
                  placeholder="Məs: Ustanın günlüyü, İşıq pulu və s."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Məbləğ (₼)</label>
                <input 
                  type="number" 
                  value={formData.amount || ''} 
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none" 
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Ləğv et
              </button>
              <button 
                onClick={handleSaveExpense}
                disabled={!formData.title || !formData.amount}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm shadow-rose-500/30"
              >
                Yadda saxla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
