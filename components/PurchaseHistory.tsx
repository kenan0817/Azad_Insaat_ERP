import React, { useEffect, useState } from 'react';
import { AuditAction, DebtLedgerEntry, Purchase, PurchasePaymentMethod, Supplier } from '../types';
import { CalendarClock, CreditCard, History, Search, Truck, X } from 'lucide-react';
import { generateId } from '../utils/id';
import {
  getPurchasePaidAmount,
  getPurchasePaymentMethodLabel,
  getPurchasePaymentStatus,
  getPurchaseRemainingDebt,
  getPurchaseStatusLabel,
  getPurchaseSubtotal,
  getPurchaseTotal,
  roundMoney,
} from '../utils/purchaseMath';
import { toast } from './Toast';

interface PurchaseHistoryProps {
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  addDebtEntry?: (entry: Omit<DebtLedgerEntry, 'id' | 'date' | 'userName'>) => void;
  addLog: (action: AuditAction, details: string) => void;
}

const paymentStatusClass = (purchase: Purchase) => {
  const status = purchase.paymentStatus || getPurchasePaymentStatus(purchase);
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'PARTIAL') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({
  purchases,
  setPurchases,
  suppliers,
  setSuppliers,
  addDebtEntry,
  addLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>('NAGD');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    if (!selectedPurchase) return;
    const fresh = purchases.find((purchase) => purchase.id === selectedPurchase.id);
    if (fresh) setSelectedPurchase(fresh);
  }, [purchases, selectedPurchase?.id]);

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return '—';
    return suppliers.find((s) => s.id === supplierId)?.name || 'Naməlum';
  };

  const filtered = purchases
    .filter(
      (p) =>
        p.id.includes(searchTerm) ||
        p.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierInvoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        getSupplierName(p.supplierId).toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleAddPayment = () => {
    if (!selectedPurchase || !selectedPurchase.supplierId) return;
    const amount = roundMoney(Number(paymentAmount));
    const remaining = getPurchaseRemainingDebt(selectedPurchase);
    if (!amount || amount <= 0 || amount > remaining) {
      toast.error('Düzgün ödəniş məbləği daxil edin');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedPurchase.supplierId);
    const balanceAfter = Math.max(0, roundMoney((supplier?.debt || 0) - amount));

    setPurchases((prev) =>
      prev.map((purchase) => {
        if (purchase.id !== selectedPurchase.id) return purchase;
        const existingPayments = purchase.payments || [];
        const nextPayments = [
          ...existingPayments,
          {
            id: generateId(),
            date: new Date().toISOString(),
            amount,
            method: paymentMethod,
            note: paymentNote.trim() || 'Sonradan ödəniş',
          },
        ];
        const paidAmount = roundMoney(getPurchasePaidAmount(purchase) + amount);
        const remainingDebt = roundMoney(Math.max(0, getPurchaseTotal(purchase) - paidAmount));
        return {
          ...purchase,
          payments: nextPayments,
          paidAmount,
          remainingDebt,
          paymentStatus: remainingDebt <= 0 ? 'PAID' : 'PARTIAL',
          paymentMethod: remainingDebt > 0 && paidAmount === 0 ? 'BORC' : paymentMethod,
        };
      })
    );

    setSuppliers((prev) =>
      prev.map((supplierItem) =>
        supplierItem.id === selectedPurchase.supplierId
          ? { ...supplierItem, debt: balanceAfter }
          : supplierItem
      )
    );

    addDebtEntry?.({
      entityType: 'SUPPLIER',
      entityId: selectedPurchase.supplierId,
      type: 'PAYMENT',
      direction: 'DECREASE',
      amount,
      balanceAfter,
      refId: selectedPurchase.id,
      note: `Alış ödənişi ${selectedPurchase.invoiceNo || `#${selectedPurchase.id.slice(0, 8)}`}`,
    });

    addLog(
      AuditAction.UPDATE,
      `Alış ${selectedPurchase.invoiceNo || `#${selectedPurchase.id.slice(0, 8)}`} üzrə ${amount} ₼ ödəniş edildi. Qalıq: ${Math.max(0, remaining - amount).toFixed(2)} ₼`
    );

    setPaymentAmount('');
    setPaymentNote('');
    toast.success('Ödəniş alış sənədinə əlavə edildi');
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in bg-slate-50 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <History className="text-indigo-600" />
          Alış Tarixçəsi
        </h1>
        <p className="text-slate-500 text-sm mt-1">Mədaxil sənədləri, ödəniş statusları və qalıq borclar</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Qaimə, məhsul və ya təchizatçı ilə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-slate-700"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm font-medium border-b border-slate-100">
              <th className="p-4">Tarix</th>
              <th className="p-4">Qaimə №</th>
              <th className="p-4">Təchizatçı</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Yekun</th>
              <th className="p-4 text-right">Ödənildi</th>
              <th className="p-4 text-right">Qalıq</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((purchase) => (
              <tr
                key={purchase.id}
                onClick={() => setSelectedPurchase(purchase)}
                className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="p-4 text-sm text-slate-600">
                  {new Date(purchase.date).toLocaleDateString('az-AZ')}{' '}
                  {new Date(purchase.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-4">
                  <p className="font-mono text-sm font-medium text-slate-800">{purchase.invoiceNo || `#${purchase.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-slate-500">{purchase.supplierInvoiceNo || 'Təchizatçı qaiməsi yoxdur'}</p>
                </td>
                <td className="p-4 text-sm text-slate-700">{getSupplierName(purchase.supplierId)}</td>
                <td className="p-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${paymentStatusClass(purchase)}`}>
                    {getPurchaseStatusLabel(purchase)}
                  </span>
                  {purchase.dueDate && getPurchaseRemainingDebt(purchase) > 0 && (
                    <p className="text-xs text-slate-500 mt-1">Son ödəmə: {new Date(purchase.dueDate).toLocaleDateString('az-AZ')}</p>
                  )}
                </td>
                <td className="p-4 text-right font-bold text-slate-800">{getPurchaseTotal(purchase).toFixed(2)} ₼</td>
                <td className="p-4 text-right font-bold text-emerald-700">{getPurchasePaidAmount(purchase).toFixed(2)} ₼</td>
                <td className="p-4 text-right font-bold text-rose-700">{getPurchaseRemainingDebt(purchase).toFixed(2)} ₼</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Truck size={48} className="mx-auto opacity-20 mb-3" />
            <p>Alış qeydi tapılmadı</p>
          </div>
        )}
      </div>

      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-slide-up flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Qaimə {selectedPurchase.invoiceNo || `#${selectedPurchase.id.slice(0, 8)}`}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(selectedPurchase.date).toLocaleString('az-AZ')} · {getSupplierName(selectedPurchase.supplierId)}
                </p>
                {selectedPurchase.supplierInvoiceNo && (
                  <p className="text-xs text-slate-500 mt-1">Təchizatçı qaiməsi: {selectedPurchase.supplierInvoiceNo}</p>
                )}
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Yekun</p>
                  <p className="text-lg font-bold text-slate-900">{getPurchaseTotal(selectedPurchase).toFixed(2)} ₼</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Ödənildi</p>
                  <p className="text-lg font-bold text-emerald-700">{getPurchasePaidAmount(selectedPurchase).toFixed(2)} ₼</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Qalıq</p>
                  <p className="text-lg font-bold text-rose-700">{getPurchaseRemainingDebt(selectedPurchase).toFixed(2)} ₼</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                  <p className="text-sm font-bold text-slate-800">{getPurchaseStatusLabel(selectedPurchase)}</p>
                </div>
              </div>

              {(selectedPurchase.discount || selectedPurchase.extraCost || selectedPurchase.tax) && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <span>Mal cəmi: <b>{getPurchaseSubtotal(selectedPurchase).toFixed(2)} ₼</b></span>
                  <span>Endirim: <b>{(selectedPurchase.discount || 0).toFixed(2)} ₼</b></span>
                  <span>Əlavə xərc: <b>{(selectedPurchase.extraCost || 0).toFixed(2)} ₼</b></span>
                  <span>ƏDV/vergi: <b>{(selectedPurchase.tax || 0).toFixed(2)} ₼</b></span>
                </div>
              )}

              {selectedPurchase.note && (
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">{selectedPurchase.note}</p>
              )}

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Məhsullar</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {selectedPurchase.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 border-b last:border-b-0 border-slate-100 text-sm">
                      <span className="text-slate-700">{item.name}</span>
                      <span className="text-slate-600">
                        {item.quantity} x {item.cost.toFixed(2)} ₼ = {(item.quantity * item.cost).toFixed(2)} ₼
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Ödənişlər</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {(selectedPurchase.payments || []).length > 0 ? (
                    selectedPurchase.payments!.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-slate-100 text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{getPurchasePaymentMethodLabel(payment.method)} · {payment.amount.toFixed(2)} ₼</p>
                          <p className="text-xs text-slate-500">{new Date(payment.date).toLocaleString('az-AZ')} {payment.note ? `· ${payment.note}` : ''}</p>
                        </div>
                        <CreditCard size={18} className="text-emerald-600" />
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">Ödəniş qeyd olunmayıb</div>
                  )}
                </div>
              </div>

              {getPurchaseRemainingDebt(selectedPurchase) > 0 && selectedPurchase.supplierId && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <CalendarClock size={18} className="text-amber-700" />
                    Qalıq borca ödəniş əlavə et
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.5fr_auto] gap-3">
                    <input
                      type="number"
                      min="0"
                      max={getPurchaseRemainingDebt(selectedPurchase)}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Məbləğ"
                      className="border border-amber-200 bg-white px-3 py-2 rounded-lg outline-none text-sm"
                    />
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PurchasePaymentMethod)}
                      className="border border-amber-200 bg-white px-3 py-2 rounded-lg outline-none text-sm"
                    >
                      <option value="NAGD">Nağd</option>
                      <option value="KART">Kart</option>
                      <option value="BANK">Bank</option>
                    </select>
                    <input
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Qeyd"
                      className="border border-amber-200 bg-white px-3 py-2 rounded-lg outline-none text-sm"
                    />
                    <button
                      onClick={handleAddPayment}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
                    >
                      Ödə
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
