import React, { useMemo, useState } from 'react';
import { Customer, Sale, SaleRefundItem } from '../types';
import { History, Search, Printer, RotateCcw, AlertTriangle, X, SlidersHorizontal } from 'lucide-react';
import { formatQuantity } from '../utils/units';
import { getRefundedQuantityForProduct, getSaleNetTotal, getSaleRefundedTotal } from '../utils/erpMath';

interface SalesHistoryProps {
  sales: Sale[];
  customers?: Customer[];
  onRefundSale: (saleId: string, refundItems?: SaleRefundItem[], reason?: string) => void;
  canRefund?: boolean;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';
type PaymentFilter = 'ALL' | 'NAGD' | 'KART' | 'BORC';
type StatusFilter = 'ALL' | 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

const statusLabel: Record<StatusFilter, string> = {
  ALL: 'Bütün statuslar',
  COMPLETED: 'Tamamlanıb',
  PARTIALLY_REFUNDED: 'Hissəvi qaytarılıb',
  REFUNDED: 'Qaytarılıb',
};

const paymentLabel: Record<PaymentFilter, string> = {
  ALL: 'Bütün ödənişlər',
  NAGD: 'Nağd',
  KART: 'Kart',
  BORC: 'Borc',
};

const formatMoney = (value: number) => `${value.toFixed(2)} ₼`;
const saleNo = (sale: Sale) => `Q-${new Date(sale.date).getFullYear()}-${sale.id.slice(0, 8).toUpperCase()}`;

const inDateRange = (date: string, range: DateFilter) => {
  const now = new Date();
  const d = new Date(date);
  if (range === 'today') return d.toDateString() === now.toDateString();
  if (range === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
};

const SalesHistory: React.FC<SalesHistoryProps> = ({
  sales,
  customers = [],
  onRefundSale,
  canRefund = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundTarget, setRefundTarget] = useState<Sale | null>(null);
  const [refundQuantities, setRefundQuantities] = useState<Record<string, string>>({});
  const [refundReason, setRefundReason] = useState('');

  const getCustomerName = (customerId?: string) =>
    customerId ? customers.find((c) => c.id === customerId)?.name || 'Müştəri tapılmadı' : 'Fərdi müştəri';

  const filteredSales = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sales
      .filter((sale) => inDateRange(sale.date, dateFilter))
      .filter((sale) => paymentFilter === 'ALL' || sale.paymentMethod === paymentFilter)
      .filter((sale) => statusFilter === 'ALL' || sale.status === statusFilter)
      .filter((sale) => {
        if (!term) return true;
        const customerName = getCustomerName(sale.customerId).toLowerCase();
        return (
          sale.id.toLowerCase().includes(term) ||
          saleNo(sale).toLowerCase().includes(term) ||
          customerName.includes(term) ||
          sale.items.some((item) => item.name.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, dateFilter, paymentFilter, statusFilter, searchTerm, customers]);

  const summary = useMemo(() => {
    const gross = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const net = filteredSales.reduce((sum, sale) => sum + getSaleNetTotal(sale), 0);
    const refunded = filteredSales.reduce((sum, sale) => sum + getSaleRefundedTotal(sale), 0);
    return { gross, net, refunded, count: filteredSales.length };
  }, [filteredSales]);

  const openRefund = (sale: Sale) => {
    const initial: Record<string, string> = {};
    sale.items.forEach((item) => {
      initial[item.id] = '';
    });
    setRefundQuantities(initial);
    setRefundReason('');
    setRefundTarget(sale);
  };

  const setFullRefund = () => {
    if (!refundTarget) return;
    const next: Record<string, string> = {};
    refundTarget.items.forEach((item) => {
      const max = item.quantity - getRefundedQuantityForProduct(refundTarget, item.id);
      next[item.id] = max > 0 ? String(max) : '';
    });
    setRefundQuantities(next);
  };

  const confirmRefund = () => {
    if (!refundTarget) return;
    const items: SaleRefundItem[] = refundTarget.items
      .map((item) => {
        const max = item.quantity - getRefundedQuantityForProduct(refundTarget, item.id);
        const quantity = Math.min(max, Math.max(0, Number(refundQuantities[item.id]) || 0));
        return {
          productId: item.id,
          name: item.name,
          quantity,
          unit: item.unit,
          price: item.price,
          cost: item.cost,
        };
      })
      .filter((item) => item.quantity > 0);

    if (items.length === 0) return;
    onRefundSale(refundTarget.id, items, refundReason);
    setSelectedSale(null);
    setRefundTarget(null);
  };

  const handlePrint = (sale: Sale) => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; width: 320px; padding: 18px;">
        <h2 style="margin:0 0 6px; text-align:center;">AzadInsaat</h2>
        <p style="margin:4px 0; text-align:center;">Satış qaiməsi: <b>${saleNo(sale)}</b></p>
        <p style="margin:4px 0; text-align:center;">${new Date(sale.date).toLocaleString('az-AZ')}</p>
        <hr style="border-top:1px dashed #000; margin:12px 0;"/>
        <table style="width:100%; font-size:12px;">
          ${sale.items.map((item) => `
            <tr>
              <td>${item.name}<br/><small>${formatQuantity(item.quantity, item.unit)} ${item.unit} x ${formatMoney(item.price)}</small></td>
              <td style="text-align:right;">${formatMoney(item.quantity * item.price)}</td>
            </tr>
          `).join('')}
        </table>
        <hr style="border-top:1px dashed #000; margin:12px 0;"/>
        ${getSaleRefundedTotal(sale) > 0 ? `<p style="text-align:right; margin:4px 0;">Qaytarma: -${formatMoney(getSaleRefundedTotal(sale))}</p>` : ''}
        <h3 style="text-align:right; margin:0;">Net yekun: ${formatMoney(getSaleNetTotal(sale))}</h3>
        <p style="text-align:right; margin:4px 0;">Ödəniş: ${paymentLabel[(sale.paymentMethod || 'NAGD') as PaymentFilter]}</p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Satış qaiməsi</title></head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const StatusBadge = ({ sale }: { sale: Sale }) => {
    if (sale.status === 'REFUNDED') {
      return <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded-md text-xs font-bold">Qaytarılıb</span>;
    }
    if (sale.status === 'PARTIALLY_REFUNDED') {
      return <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold">Hissəvi qaytarılıb</span>;
    }
    return <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">Tamamlanıb</span>;
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-6 animate-fade-in bg-slate-50 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-blue-600" />
            Satış tarixçəsi
          </h1>
          <p className="text-slate-500 text-sm mt-1">Qaimələr, qaytarmalar və satış üzrə filterlər</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500 font-medium">Satış sayı</p>
          <p className="text-xl font-black text-slate-900">{summary.count}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500 font-medium">Brüt məbləğ</p>
          <p className="text-xl font-black text-slate-900 whitespace-nowrap">{formatMoney(summary.gross)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500 font-medium">Qaytarma</p>
          <p className="text-xl font-black text-rose-600 whitespace-nowrap">{formatMoney(summary.refunded)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-500 font-medium">Net satış</p>
          <p className="text-xl font-black text-emerald-600 whitespace-nowrap">{formatMoney(summary.net)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Qaimə, müştəri və ya məhsul adı ilə axtar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-slate-700 min-w-0"
          />
          <SlidersHorizontal className="text-slate-300" size={18} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
            <option value="today">Bugün</option>
            <option value="week">Son 7 gün</option>
            <option value="month">Bu ay</option>
            <option value="all">Bütün dövr</option>
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
            {Object.entries(paymentLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
            {Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="hidden sm:block bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 min-h-0">
        <div className="overflow-auto h-full">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 z-10">
              <tr>
                <th className="p-4">Tarix</th>
                <th className="p-4">Qaimə</th>
                <th className="p-4">Müştəri</th>
                <th className="p-4">Məhsul</th>
                <th className="p-4">Ödəniş</th>
                <th className="p-4 text-right">Net məbləğ</th>
                <th className="p-4">Status</th>
                <th className="p-4 w-[120px] text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setSelectedSale(sale)}>
                  <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(sale.date).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-4 font-mono text-slate-700 whitespace-nowrap">{saleNo(sale)}</td>
                  <td className="p-4 text-slate-600">{getCustomerName(sale.customerId)}</td>
                  <td className="p-4 text-slate-600">{sale.items.reduce((s, i) => s + i.quantity, 0)} vahid</td>
                  <td className="p-4">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                      {paymentLabel[(sale.paymentMethod || 'NAGD') as PaymentFilter]}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-emerald-600 text-right whitespace-nowrap">{formatMoney(getSaleNetTotal(sale))}</td>
                  <td className="p-4"><StatusBadge sale={sale} /></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handlePrint(sale)} className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm transition-colors" title="Qaiməni çap et">
                        <Printer size={16} />
                      </button>
                      {canRefund && sale.status !== 'REFUNDED' && (
                        <button onClick={() => openRefund(sale)} className="p-2 text-rose-500 hover:text-rose-700 bg-white border border-rose-100 hover:border-rose-300 rounded-lg shadow-sm transition-colors" title="Qaytarma et">
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">Məlumat tapılmadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sm:hidden space-y-3">
        {filteredSales.map((sale) => (
          <button key={sale.id} type="button" onClick={() => setSelectedSale(sale)} className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-slate-800 truncate">{saleNo(sale)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{new Date(sale.date).toLocaleString('az-AZ')}</p>
                <p className="text-sm text-slate-600 mt-2 truncate">{getCustomerName(sale.customerId)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-emerald-600 whitespace-nowrap">{formatMoney(getSaleNetTotal(sale))}</p>
                <div className="mt-2 flex justify-end"><StatusBadge sale={sale} /></div>
              </div>
            </div>
          </button>
        ))}
        {filteredSales.length === 0 && <div className="p-10 text-center text-slate-400 bg-white rounded-xl border">Məlumat tapılmadı</div>}
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[92dvh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{saleNo(selectedSale)}</h3>
                <p className="text-sm text-slate-500">{new Date(selectedSale.date).toLocaleString('az-AZ')} · {getCustomerName(selectedSale.customerId)}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Brüt</p>
                  <p className="font-bold text-slate-900 whitespace-nowrap">{formatMoney(selectedSale.total)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Qaytarma</p>
                  <p className="font-bold text-rose-600 whitespace-nowrap">{formatMoney(getSaleRefundedTotal(selectedSale))}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Net</p>
                  <p className="font-bold text-emerald-600 whitespace-nowrap">{formatMoney(getSaleNetTotal(selectedSale))}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="mt-1"><StatusBadge sale={selectedSale} /></div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {selectedSale.items.map((item) => {
                  const returned = getRefundedQuantityForProduct(selectedSale, item.id);
                  return (
                    <div key={item.id} className="p-3 flex justify-between gap-3 border-b last:border-b-0 border-slate-100">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{formatQuantity(item.quantity, item.unit)} {item.unit} x {formatMoney(item.price)}</p>
                        {returned > 0 && <p className="text-xs text-rose-600 mt-1">Qaytarılıb: {formatQuantity(returned, item.unit)} {item.unit}</p>}
                      </div>
                      <p className="font-bold text-slate-900 whitespace-nowrap">{formatMoney(item.quantity * item.price)}</p>
                    </div>
                  );
                })}
              </div>

              {selectedSale.refunds?.length ? (
                <div className="mt-5 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="font-bold text-amber-900 mb-2">Qaytarma tarixçəsi</p>
                  <div className="space-y-2 text-sm text-amber-900">
                    {selectedSale.refunds.map((refund) => (
                      <div key={refund.id} className="flex justify-between gap-3">
                        <span>{new Date(refund.date).toLocaleString('az-AZ')} · {refund.items.map((i) => `${formatQuantity(i.quantity, i.unit)} ${i.name}`).join(', ')}</span>
                        <b className="whitespace-nowrap">{formatMoney(refund.total)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {canRefund && selectedSale.status !== 'REFUNDED' && (
                <div className="mt-5 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                  <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <p className="font-bold mb-1">Qaytarma əməliyyatı</p>
                    <p className="opacity-90 leading-relaxed mb-3">Məhsulları hissəvi və ya tam qaytarmaq mümkündür. Seçilən say anbara geri əlavə olunacaq.</p>
                    <button onClick={() => openRefund(selectedSale)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
                      <RotateCcw size={16} /> Qaytarma et
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => handlePrint(selectedSale)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                <Printer size={18} /> Çap et
              </button>
            </div>
          </div>
        </div>
      )}

      {refundTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-slide-up flex flex-col max-h-[92dvh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Qaytarma</h3>
                <p className="text-sm text-slate-500">{saleNo(refundTarget)}</p>
              </div>
              <button onClick={() => setRefundTarget(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              <button type="button" onClick={setFullRefund} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-sm font-bold">
                Qaytarıla bilən hamısını seç
              </button>
              {refundTarget.items.map((item) => {
                const returned = getRefundedQuantityForProduct(refundTarget, item.id);
                const max = item.quantity - returned;
                return (
                  <div key={item.id} className="border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">Satılıb: {formatQuantity(item.quantity, item.unit)} · Qalıq: {formatQuantity(max, item.unit)} {item.unit}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={max}
                      step={item.unit === 'kq' || item.unit === 'metr' || item.unit === 'litr' ? '0.01' : '1'}
                      disabled={max <= 0}
                      value={refundQuantities[item.id] || ''}
                      onChange={(e) => setRefundQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-right font-bold disabled:bg-slate-100"
                      placeholder="0"
                    />
                  </div>
                );
              })}
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Qaytarma səbəbi və qeyd..."
                className="w-full min-h-[82px] border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-500 text-sm"
              />
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setRefundTarget(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium">Ləğv et</button>
              <button onClick={confirmRefund} className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold">Qaytarmanı təsdiqlə</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
