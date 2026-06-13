import React, { useState } from 'react';
import { Supplier, AuditAction, DebtLedgerEntry, Purchase, PurchasePaymentMethod } from '../types';
import { Truck, Plus, Search, Phone, CreditCard, Edit, Trash2, X } from 'lucide-react';
import { generateId } from '../utils/id';
import { getPurchasePaidAmount, getPurchaseRemainingDebt, getPurchaseTotal, roundMoney } from '../utils/purchaseMath';
import ConfirmModal from './ConfirmModal';
import { toast } from './Toast';

interface SuppliersProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases?: Purchase[];
  setPurchases?: React.Dispatch<React.SetStateAction<Purchase[]>>;
  addLog: (action: AuditAction, details: string) => void;
  debtLedger?: DebtLedgerEntry[];
  addDebtEntry?: (entry: Omit<DebtLedgerEntry, 'id' | 'date' | 'userName'>) => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ suppliers, setSuppliers, purchases = [], setPurchases, addLog, debtLedger = [], addDebtEntry }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [payingDebtFor, setPayingDebtFor] = useState<string | null>(null);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtPaymentMethod, setDebtPaymentMethod] = useState<PurchasePaymentMethod>('NAGD');
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)
  );

  const handleSave = () => {
    if (!formData.name) return;

    if (formData.id) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === formData.id ? ({ ...s, ...formData } as Supplier) : s))
      );
      addLog(AuditAction.UPDATE, `Təchizatçı yeniləndi: ${formData.name}`);
      toast.success('Təchizatçı yeniləndi');
    } else {
      const newSupplier: Supplier = {
        id: generateId(),
        name: formData.name,
        phone: formData.phone || '',
        debt: formData.debt || 0,
      };
      setSuppliers((prev) => [...prev, newSupplier]);
      addLog(AuditAction.ADD, `Yeni təchizatçı əlavə edildi: ${newSupplier.name}`);
      toast.success('Təchizatçı əlavə edildi');
    }

    setIsModalOpen(false);
    setFormData({});
  };

  const allocatePaymentToPurchases = (supplierId: string, amount: number, method: PurchasePaymentMethod) => {
    if (!setPurchases) return [];

    let remainingPayment = amount;
    const allocations = purchases
      .filter((purchase) => purchase.supplierId === supplierId && getPurchaseRemainingDebt(purchase) > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((purchase) => {
        const applied = roundMoney(Math.min(remainingPayment, getPurchaseRemainingDebt(purchase)));
        remainingPayment = roundMoney(remainingPayment - applied);
        return applied > 0 ? { purchaseId: purchase.id, amount: applied } : null;
      })
      .filter((allocation): allocation is { purchaseId: string; amount: number } => Boolean(allocation));

    if (allocations.length === 0) return allocations;

    setPurchases((prev) =>
      prev.map((purchase) => {
        const allocation = allocations.find((item) => item.purchaseId === purchase.id);
        if (!allocation) return purchase;
        const payments = [
          ...(purchase.payments || []),
          {
            id: generateId(),
            date: new Date().toISOString(),
            amount: allocation.amount,
            method,
            note: 'Təchizatçı kartından ödəniş',
          },
        ];
        const paidAmount = roundMoney(getPurchasePaidAmount(purchase) + allocation.amount);
        const remainingDebt = roundMoney(Math.max(0, getPurchaseTotal(purchase) - paidAmount));
        return {
          ...purchase,
          payments,
          paidAmount,
          remainingDebt,
          paymentStatus: remainingDebt <= 0 ? 'PAID' : 'PARTIAL',
          paymentMethod: remainingDebt > 0 && paidAmount === 0 ? 'BORC' : method,
        };
      })
    );

    return allocations;
  };

  const handlePayDebt = (id: string, currentDebt: number) => {
    const amount = roundMoney(parseFloat(debtAmount));
    if (!amount || amount <= 0 || amount > currentDebt) {
      toast.error('Düzgün məbləğ daxil edin');
      return;
    }

    const allocations = allocatePaymentToPurchases(id, amount, debtPaymentMethod);
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, debt: roundMoney(s.debt - amount) } : s))
    );

    const supplier = suppliers.find((s) => s.id === id);
    if (supplier) {
      const balanceAfter = roundMoney(currentDebt - amount);
      addDebtEntry?.({
        entityType: 'SUPPLIER',
        entityId: id,
        type: 'PAYMENT',
        direction: 'DECREASE',
        amount,
        balanceAfter,
        note: `Təchizatçı borc ödənişi: ${supplier.name}${allocations.length ? ` (${allocations.length} alışa paylandı)` : ''}`,
      });
      addLog(
        AuditAction.UPDATE,
        `Təchizatçı (${supplier.name}) borcu ödənildi: ${amount} ₼. Qalıq: ${balanceAfter.toFixed(2)} ₼`
      );
    }

    setPayingDebtFor(null);
    setDebtAmount('');
    setDebtPaymentMethod('NAGD');
    toast.success('Borc ödənişi qeydə alındı');
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in bg-slate-50 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="text-indigo-600" />
            Təchizatçılar
          </h1>
          <p className="text-slate-500 text-sm mt-1">Təchizatçı bazası və borc izləmə</p>
        </div>
        <button
          onClick={() => {
            setFormData({ debt: 0 });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
        >
          <Plus size={20} />
          Yeni Təchizatçı
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Ad və ya telefon ilə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-slate-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow relative group"
          >
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setFormData(supplier);
                  setIsModalOpen(true);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => setDeleteTarget(supplier)}
                className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4 pr-16">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
                {supplier.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{supplier.name}</h3>
                {supplier.phone && (
                  <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
                    <Phone size={14} /> {supplier.phone}
                  </div>
                )}
              </div>
            </div>

            {debtLedger.some((entry) => entry.entityType === 'SUPPLIER' && entry.entityId === supplier.id) && (
              <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Son borc hərəkəti</p>
                <div className="space-y-1">
                  {debtLedger
                    .filter((entry) => entry.entityType === 'SUPPLIER' && entry.entityId === supplier.id)
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
                <span className={`text-lg font-bold ${supplier.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {supplier.debt.toFixed(2)} ₼
                </span>
              </div>

              {supplier.debt > 0 && payingDebtFor !== supplier.id && (
                <button
                  onClick={() => {
                    setPayingDebtFor(supplier.id);
                    setDebtAmount('');
                    setDebtPaymentMethod('NAGD');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg flex items-center gap-1"
                >
                  <CreditCard size={16} /> Ödəniş et
                </button>
              )}

              {payingDebtFor === supplier.id && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <input
                    type="number"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    placeholder="Məbləğ"
                    className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm"
                  />
                  <select
                    value={debtPaymentMethod}
                    onChange={(e) => setDebtPaymentMethod(e.target.value as PurchasePaymentMethod)}
                    className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  >
                    <option value="NAGD">Nağd</option>
                    <option value="KART">Kart</option>
                    <option value="BANK">Bank</option>
                  </select>
                  <button
                    onClick={() => handlePayDebt(supplier.id, supplier.debt)}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-emerald-700"
                  >
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

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Truck size={64} className="opacity-20 mb-4" />
          <p className="text-lg font-medium">Təchizatçı tapılmadı</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {formData.id ? 'Təchizatçını Yenilə' : 'Yeni Təchizatçı'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad / Şirkət *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">
                Ləğv et
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium"
              >
                Yadda saxla
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Təchizatçını sil"
          message={`Əminsiniz ki, "${deleteTarget.name}" silinsin?`}
          confirmLabel="Sil"
          variant="danger"
          onConfirm={() => {
            setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
            addLog(AuditAction.DELETE, `Təchizatçı silindi: ${deleteTarget.name}`);
            toast.info(`${deleteTarget.name} silindi`);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Suppliers;
