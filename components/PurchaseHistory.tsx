import React, { useState } from 'react';
import { Purchase, Supplier } from '../types';
import { History, Search, Truck } from 'lucide-react';

interface PurchaseHistoryProps {
  purchases: Purchase[];
  suppliers: Supplier[];
}

const PAYMENT_LABELS: Record<string, string> = {
  NAGD: 'Nağd',
  KART: 'Kart',
  BORC: 'Borc',
};

const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ purchases, suppliers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

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

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in bg-slate-50 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <History className="text-indigo-600" />
          Alış Tarixçəsi
        </h1>
        <p className="text-slate-500 text-sm mt-1">Anbara qəbul edilmiş bütün mədaxillər</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm font-medium border-b border-slate-100">
              <th className="p-4">Tarix</th>
              <th className="p-4">Qaimə №</th>
              <th className="p-4">Təchizatçı</th>
              <th className="p-4">Təchizatçı qaiməsi</th>
              <th className="p-4">Məhsul sayı</th>
              <th className="p-4">Ödəniş</th>
              <th className="p-4 text-right">Məbləğ</th>
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
                <td className="p-4 font-mono text-sm font-medium text-slate-800">{purchase.invoiceNo || `#${purchase.id.slice(0, 8)}`}</td>
                <td className="p-4 text-sm text-slate-700">{getSupplierName(purchase.supplierId)}</td>
                <td className="p-4 text-sm text-slate-600">{purchase.supplierInvoiceNo || '—'}</td>
                <td className="p-4 text-sm text-slate-600">{purchase.items.length} məhsul</td>
                <td className="p-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    {PAYMENT_LABELS[purchase.paymentMethod]}
                  </span>
                </td>
                <td className="p-4 text-right font-bold text-indigo-700">{purchase.totalCost.toFixed(2)} ₼</td>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Qaimə {selectedPurchase.invoiceNo || `#${selectedPurchase.id.slice(0, 8)}`}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {new Date(selectedPurchase.date).toLocaleString('az-AZ')} · {getSupplierName(selectedPurchase.supplierId)}
              </p>
              {selectedPurchase.supplierInvoiceNo && (
                <p className="text-xs text-slate-500 mt-1">Təchizatçı qaiməsi: {selectedPurchase.supplierInvoiceNo}</p>
              )}
              {selectedPurchase.note && (
                <p className="text-xs text-slate-600 mt-2 bg-white border border-slate-200 rounded-lg p-2">{selectedPurchase.note}</p>
              )}
            </div>
            <div className="p-6 space-y-2 max-h-64 overflow-y-auto">
              {selectedPurchase.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-slate-600">
                    {item.quantity} x {item.cost.toFixed(2)} ₼
                  </span>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-medium text-slate-600">Yekun:</span>
              <span className="text-xl font-bold text-indigo-700">{selectedPurchase.totalCost.toFixed(2)} ₼</span>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium text-slate-700"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
