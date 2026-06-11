import React, { useState } from 'react';
import { Sale, AuditAction, Product } from '../types';
import { History, Search, Printer, RotateCcw, AlertTriangle, X } from 'lucide-react';

interface SalesHistoryProps {
  sales: Sale[];
  onRefundSale: (saleId: string) => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, onRefundSale }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = sales
    .filter(s => s.id.includes(searchTerm) || s.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePrint = (sale: Sale) => {
    // Basic implementation for printing a specific sale receipt
    const printContent = `
      <div style="font-family: monospace; width: 300px; padding: 20px; text-align: center;">
        <h2 style="margin:0;">Insaat ERP</h2>
        <p style="margin: 5px 0;">Çek Qaiməsi: #${sale.id.slice(0, 6)}</p>
        <p style="margin: 5px 0;">Tarix: ${new Date(sale.date).toLocaleString('az-AZ')}</p>
        <hr style="border-top:1px dashed #000; margin:10px 0;"/>
        <table style="width: 100%; text-align: left; font-size: 12px;">
          <tr><th>Məhsul</th><th>Cəmi</th></tr>
          ${sale.items.map(item => `
            <tr>
              <td>${item.name} <br/> <small>${item.quantity} x ${item.price} ₼</small></td>
              <td style="text-align:right;">${(item.quantity * item.price).toFixed(2)} ₼</td>
            </tr>
          `).join('')}
        </table>
        <hr style="border-top:1px dashed #000; margin:10px 0;"/>
        <h3 style="margin:0; text-align:right;">Yekun: ${sale.total.toFixed(2)} ₼</h3>
        <p style="margin: 5px 0; text-align:right;">Ödəniş: ${sale.paymentMethod || 'NAGD'}</p>
        <hr style="border-top:1px dashed #000; margin:10px 0;"/>
        <p>Bizi seçdiyiniz üçün təşəkkürlər!</p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Çek Çapı</title></head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleRefund = (sale: Sale) => {
     if(confirm(`Çek #${sale.id.slice(0, 6)} geri qaytarılsın? Məhsullar anbara bərpa olunacaq.`)) {
         onRefundSale(sale.id);
         setSelectedSale(null);
     }
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in bg-slate-50 overflow-y-auto">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-blue-600" />
            Satış Tarixçəsi
          </h1>
          <p className="text-slate-500 text-sm mt-1">Bütün satışlar, çek çıxarışı və geri qaytarma</p>
        </div>
      </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Çek nömrəsi və ya məhsul adı ilə axtar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-slate-700"
        />
      </div>

      <div className="bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="p-4">Tarix</th>
                <th className="p-4">Çek No</th>
                <th className="p-4">Məhsul Sayı</th>
                <th className="p-4">Ödəniş Tipi</th>
                <th className="p-4">Məbləğ</th>
                <th className="p-4">Status</th>
                <th className="p-4 w-[120px] text-right">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filteredSales.map(sale => (
                 <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedSale(sale)}>
                   <td className="p-4 text-slate-500">
                    {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </td>
                   <td className="p-4 font-mono text-slate-700">#{sale.id.slice(0,6)}</td>
                   <td className="p-4 text-slate-600">{sale.items.reduce((s, i) => s + i.quantity, 0)} ədəd</td>
                   <td className="p-4">
                     <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                        {sale.paymentMethod || 'NAGD'}
                     </span>
                   </td>
                   <td className="p-4 font-bold text-emerald-600">{sale.total.toFixed(2)} ₼</td>
                   <td className="p-4">
                     {sale.status === 'REFUNDED' ? (
                       <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-fit">Qaytarılıb</span>
                     ) : (
                       <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold w-fit block">Tamamlanıb</span>
                     )}
                   </td>
                   <td className="p-4">
                     <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                       <button onClick={() => handlePrint(sale)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-sm transition-colors" title="Çap et">
                         <Printer size={16} />
                       </button>
                      
                     </div>
                   </td>
                 </tr>
               ))}
               {filteredSales.length === 0 && (
                <tr>
                   <td colSpan={7} className="p-8 text-center text-slate-400">
                      Məlumat tapılmadı
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Sale Detail Modal */}
       {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <h3 className="font-bold text-lg text-slate-800">
                 Çek Detalları: #{selectedSale.id.slice(0, 6)}
               </h3>
               <button 
                  onClick={() => setSelectedSale(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
             </div>
             
             <div className="p-6 overflow-y-auto flex-1">
                 <div className="flex justify-between text-sm mb-4">
                   <div className="text-slate-500">
                      Tarix: <span className="font-medium text-slate-800">{new Date(selectedSale.date).toLocaleString()}</span>
                   </div>
                   <div className="text-slate-500">
                      Status: {selectedSale.status === 'REFUNDED' ? (
                          <span className="text-rose-600 font-bold ml-1">QAYTARILIB</span>
                        ) : (
                          <span className="text-emerald-600 font-bold ml-1">TAMAMLANIB</span>
                      )}
                   </div>
                 </div>

                 <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden mb-6">
                    <table className="w-full text-sm">
                       <thead className="bg-slate-100 text-slate-600 text-left border-b border-slate-200">
                           <tr>
                              <th className="p-3 font-medium">Məhsul</th>
                              <th className="p-3 font-medium text-center">Say</th>
                              <th className="p-3 font-medium text-right">Məbləğ</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {selectedSale.items.map((item, idx) => (
                            <tr key={idx}>
                               <td className="p-3 text-slate-800">{item.name} <br/><span className="text-slate-500 text-xs">{item.price} ₼ / {item.unit}</span></td>
                               <td className="p-3 text-center font-medium bg-white">{item.quantity}</td>
                               <td className="p-3 text-right font-bold text-slate-800">{(item.quantity * item.price).toFixed(2)} ₼</td>
                            </tr>
                          ))}
                       </tbody>
                       <tfoot className="border-t-2 border-slate-200 bg-white">
                         {selectedSale.discount ? (
                           <tr>
                              <td colSpan={2} className="p-3 text-right font-medium text-slate-500">Endirim:</td>
                              <td className="p-3 text-right font-bold text-rose-500">- {selectedSale.discount.toFixed(2)} ₼</td>
                           </tr>
                         ) : null}
                         <tr>
                            <td colSpan={2} className="p-3 text-right font-bold text-slate-600">Yekun:</td>
                            <td className="p-3 text-right font-bold text-emerald-600 text-lg">{selectedSale.total.toFixed(2)} ₼</td>
                         </tr>
                       </tfoot>
                    </table>
                 </div>

                 {selectedSale.status !== 'REFUNDED' && (
                     <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 border border-red-100">
                        <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                        <div className="text-sm">
                           <p className="font-bold mb-1">Geri Qaytarma İşləmi</p>
                           <p className="opacity-90 leading-relaxed mb-3">Bu əməliyyat çekdəki bütün məhsulları <b>anbara geri əlavə edəcək</b> və gəliri/mənfəəti siləcək. Bu əməliyyat geri alına bilməz.</p>
                           <button onClick={() => handleRefund(selectedSale)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2">
                             <RotateCcw size={16} /> Çeki Geri Qaytar (Refund)
                           </button>
                        </div>
                     </div>
                 )}
             </div>

             <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
               <button onClick={() => handlePrint(selectedSale)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                  <Printer size={18} /> Çeki Çap Et
               </button>
             </div>
          </div>
        </div>
       )}

    </div>
  );
};

export default SalesHistory;
