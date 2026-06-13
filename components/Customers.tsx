import React, { useState } from 'react';
import { Customer, AuditAction, DebtLedgerEntry } from '../types';
import { Users, Plus, Search, MapPin, Phone, CreditCard, Mail, Edit, Trash2, X } from 'lucide-react';
import { generateId } from '../utils/id';
import ConfirmModal from './ConfirmModal';
import { toast } from './Toast';

interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  addLog: (action: AuditAction, details: string) => void;
  debtLedger?: DebtLedgerEntry[];
  addDebtEntry?: (entry: Omit<DebtLedgerEntry, 'id' | 'date' | 'userName'>) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers, addLog, debtLedger = [], addDebtEntry, canDelete = true, canEdit = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payingDebtFor, setPayingDebtFor] = useState<string | null>(null);
  const [debtAmount, setDebtAmount] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleSaveCustomer = () => {
    if (!formData.name || !formData.phone) return;

    if (formData.id) {
      // Update
      setCustomers(prev => prev.map(c => c.id === formData.id ? { ...c, ...formData } as Customer : c));
      addLog(AuditAction.UPDATE, `Müştəri yeniləndi: ${formData.name}`);
    } else {
      // Add new
      const newCustomer: Customer = {
        id: generateId(),
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        debt: formData.debt || 0,
      };
      setCustomers(prev => [...prev, newCustomer]);
      addLog(AuditAction.ADD, `Yeni müştəri əlavə edildi: ${newCustomer.name}`);
    }
    
    setIsModalOpen(false);
    setFormData({});
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeleteTarget(customer);
  };

  const handlePayDebt = (id: string, currentDebt: number) => {
    const amount = parseFloat(debtAmount);
    if (!amount || amount <= 0 || amount > currentDebt) {
      toast.error('Düzgün məbləğ daxil edin');
      return;
    }
    
    setCustomers(prev => prev.map(c => 
      c.id === id ? { ...c, debt: c.debt - amount } : c
    ));
    
    const customer = customers.find(c => c.id === id);
    if(customer) {
      const balanceAfter = currentDebt - amount;
      addDebtEntry?.({
        entityType: 'CUSTOMER',
        entityId: id,
        type: 'PAYMENT',
        direction: 'DECREASE',
        amount,
        balanceAfter,
        note: `Borc ödənişi: ${customer.name}`,
      });
      addLog(AuditAction.UPDATE, `Müştəri (${customer.name}) borcunu ödədi: ${amount} ₼. Qalıq borc: ${balanceAfter} ₼`);
    }

    setPayingDebtFor(null);
    setDebtAmount('');
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in bg-slate-50 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" />
            Müştərilər
          </h1>
          <p className="text-slate-500 text-sm mt-1">Müştəri bazası və borc qeydiyyatı</p>
        </div>

        <button 
          onClick={() => { setFormData({ debt: 0 }); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm shadow-blue-500/30 flex items-center gap-2 transition-all"
        >
          <Plus size={20} />
          Yeni Müştəri
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Müştəri adı və ya nömrəsi ilə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               {canEdit && (
                 <button onClick={() => { setFormData(customer); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg">
                   <Edit size={16} />
                 </button>
               )}
               {canDelete && (
                 <button onClick={() => handleDeleteCustomer(customer)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg">
                   <Trash2 size={16} />
                 </button>
               )}
            </div>
            
            <div className="flex items-center gap-4 mb-4 pr-16">
               <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                  {customer.name.charAt(0)}
               </div>
               <div>
                  <h3 className="font-bold text-slate-800 text-lg">{customer.name}</h3>
                  <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
                    <Phone size={14} /> {customer.phone}
                  </div>
               </div>
            </div>

            <div className="space-y-2 mb-6">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                   <Mail size={16} className="text-slate-400" /> {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                   <MapPin size={16} className="text-slate-400" /> {customer.address}
                </div>
              )}
            </div>

            {debtLedger.some((entry) => entry.entityType === 'CUSTOMER' && entry.entityId === customer.id) && (
              <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Son borc hərəkəti</p>
                <div className="space-y-1">
                  {debtLedger
                    .filter((entry) => entry.entityType === 'CUSTOMER' && entry.entityId === customer.id)
                    .slice(0, 3)
                    .map((entry) => (
                      <div key={entry.id} className="flex justify-between gap-2 text-xs">
                        <span className="text-slate-600 truncate">{entry.note || entry.type}</span>
                        <span className={`font-bold whitespace-nowrap ${entry.direction === 'INCREASE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {entry.direction === 'INCREASE' ? '+' : '-'}{entry.amount.toFixed(2)} ₼
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
               <div>
                  <span className="text-xs text-slate-500 font-medium block mb-0.5">Cari Borc</span>
                  <span className={`text-lg font-bold ${customer.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {customer.debt.toFixed(2)} ₼
                  </span>
               </div>
               
               {customer.debt > 0 && payingDebtFor !== customer.id && (
                 <button 
                   onClick={() => { setPayingDebtFor(customer.id); setDebtAmount(''); }}
                   className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-1 transition-colors"
                 >
                   <CreditCard size={16} /> Ödəniş al
                 </button>
               )}

               {payingDebtFor === customer.id && (
                 <div className="flex items-center gap-2">
                   <input 
                     type="number" 
                     value={debtAmount} 
                     onChange={(e) => setDebtAmount(e.target.value)} 
                     placeholder="Məbləğ" 
                     className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm"
                   />
                   <button onClick={() => handlePayDebt(customer.id, customer.debt)} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-emerald-700">
                     Ödə
                   </button>
                   <button onClick={() => setPayingDebtFor(null)} className="text-slate-400 hover:text-slate-600 p-1">
                     <X size={16} />
                   </button>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users size={64} className="opacity-20 mb-4" />
            <p className="text-lg font-medium">Müştəri tapılmadı</p>
         </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {formData.id ? 'Müştərini Yenilə' : 'Yeni Müştəri'}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad, Soyad *</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Məs: Əhməd Məmmədov"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon *</label>
                <input 
                  type="text" 
                  value={formData.phone || ''} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="050-000-00-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="ahmed@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ünvan</label>
                <input 
                  type="text" 
                  value={formData.address || ''} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Bakı ş., Nərimanov r."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">İlkin Borc (₼)</label>
                <input 
                  type="number" 
                  value={formData.debt || 0} 
                  onChange={e => setFormData({...formData, debt: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
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
                onClick={handleSaveCustomer}
                disabled={!formData.name || !formData.phone}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm shadow-blue-500/30"
              >
                Yadda saxla
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Müştərini sil"
          message={`Əminsiniz ki, "${deleteTarget.name}" silinsin?`}
          confirmLabel="Sil"
          variant="danger"
          onConfirm={() => {
            setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
            addLog(AuditAction.DELETE, `Müştəri silindi: ${deleteTarget.name}`);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Customers;
