import React, { useState } from 'react';
import { Product, Supplier, Purchase, AuditAction } from '../types';
import { Truck, Plus, Search, CheckCircle, Package } from 'lucide-react';

interface PurchasesProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  addLog: (action: AuditAction, details: string) => void;
}

const Purchases: React.FC<PurchasesProps> = ({ products, setProducts, suppliers, setSuppliers, purchases, setPurchases, addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'NAGD' | 'KART' | 'BORC'>('NAGD');
  const [cart, setCart] = useState<{product: Product, quantity: number, cost: number}[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddSupplier = () => {
    if (!newSupplierName) return;
    const ns: Supplier = {
      id: Date.now().toString(),
      name: newSupplierName,
      phone: newSupplierPhone,
      debt: 0
    };
    setSuppliers(prev => [...prev, ns]);
    setSelectedSupplierId(ns.id);
    setShowSupplierModal(false);
    setNewSupplierName('');
    setNewSupplierPhone('');
  };

  const addToCart = () => {
    if (!selectedProductId || !quantity || !cost) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    setCart(prev => [...prev, {
      product: prod,
      quantity: Number(quantity),
      cost: Number(cost)
    }]);

    setSelectedProductId('');
    setQuantity('');
    setCost('');
  };

  const removeCartItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'BORC' && !selectedSupplierId) {
      alert("Borca mədaxil üçün təchizatçı seçilməlidir!");
      return;
    }

    const totalCost = cart.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

    const newPurchase: Purchase = {
      id: Date.now().toString(),
      supplierId: selectedSupplierId || undefined,
      date: new Date().toISOString(),
      items: cart.map(c => ({
        productId: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        cost: c.cost
      })),
      totalCost,
      paymentMethod
    };

    // Update stock & cost correctly
    setProducts(prev => prev.map(p => {
      const purchased = cart.find(c => c.product.id === p.id);
      if (purchased) {
        return { ...p, stock: p.stock + purchased.quantity, cost: purchased.cost }; // Update cost to the latest purchased cost
      }
      return p;
    }));

    if (paymentMethod === 'BORC' && selectedSupplierId) {
       setSuppliers(prev => prev.map(s => s.id === selectedSupplierId ? { ...s, debt: s.debt + totalCost } : s));
    }

    setPurchases(prev => [...prev, newPurchase]);
    addLog(AuditAction.UPDATE, `Mədaxil #${newPurchase.id.slice(0,6)} tamamlandı. Cəmi xərc: ${totalCost} ₼. İşçi məhsullar anbara əlavə edildi.`);

    setCart([]);
    setSelectedSupplierId('');
    setPaymentMethod('NAGD');
    alert("Mədaxil uğurla tamamlandı!");
  };

  return (
    <div className="h-full flex flex-col p-6 animate-fade-in bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="text-indigo-600" />
            Mədaxil (Anbara Məhsul Qəbulu)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Anbara yeni malların daxil olması və təchizatçılar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col shadow-indigo-100">
            <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Məhsul Əlavə Et</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Axtar & Seç</label>
                <div className="flex items-center gap-2 mb-2">
                   <Search className="text-slate-400" size={18} />
                   <input type="text" placeholder="Məhsul adı..." className="flex-1 outline-none border-b border-slate-200 pb-1" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="w-full p-2 border border-slate-300 rounded-lg outline-none" value={selectedProductId} onChange={e => {
                  setSelectedProductId(e.target.value);
                  const p = products.find(prod => prod.id === e.target.value);
                  if (p) {
                    setCost(p.cost.toString());
                  }
                }}>
                  <option value="">-- Məhsul Seç --</option>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Anbarda: {p.stock})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Say</label>
                    <input type="number" className="w-full p-2 border border-slate-300 rounded-lg outline-none" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
                 </div>
                 <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Alış Qiyməti (₼/Vahid)</label>
                    <input type="number" className="w-full p-2 border border-slate-300 rounded-lg outline-none" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
                 </div>
              </div>

              <button onClick={addToCart} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg transition-colors flex justify-center items-center gap-2">
                 Siyahıya Əlavə Et <Plus size={18} />
              </button>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden max-h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package size={18} className="text-indigo-500" /> Qaimə Siyahısı ({cart.length})</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-800">{item.product.name}</p>
                    <p className="text-sm text-slate-500">{item.quantity} x {item.cost.toFixed(2)} ₼</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-indigo-700">{(item.quantity * item.cost).toFixed(2)} ₼</span>
                    <button onClick={() => removeCartItem(idx)} className="text-xs text-rose-500 hover:underline">Sil</button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center text-slate-400 py-6">Siyahı boşdur</p>}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4 shrink-0">
               <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-600">Yekun Xərc:</span>
                  <span className="text-2xl font-bold text-slate-900">{cart.reduce((s, i) => s + (i.quantity * i.cost), 0).toFixed(2)} ₼</span>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Təchizatçı</label>
                      <button onClick={() => setShowSupplierModal(true)} className="text-xs text-indigo-600 font-medium hover:underline">+ Yeni</button>
                    </div>
                    <select className="w-full border border-slate-300 p-2 rounded text-sm outline-none bg-white" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
                      <option value="">-- Lazım deyil --</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.debt > 0 ? `(Borc: ${s.debt.toFixed(2)}₼)` : ''}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Ödəniş Üsulu</label>
                    <select className="w-full border border-slate-300 p-2 rounded text-sm outline-none bg-white font-medium" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}>
                      <option value="NAGD">Kasadan Nəğd</option>
                      <option value="KART">Kartdan Köçürmə</option>
                      <option value="BORC">Borca Yaz (Nisyə)</option>
                    </select>
                 </div>
               </div>

               <button onClick={handleCheckout} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm flex justify-center items-center gap-2">
                 <CheckCircle size={20} /> Mədaxili Təsdiqlə
               </button>
            </div>
         </div>
      </div>

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                 <h3 className="font-bold text-slate-800">Yeni Təchizatçı</h3>
              </div>
              <div className="p-4 space-y-3">
                 <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Təchizatçı / Şirkət Adı</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded outline-none" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Əlaqə nömrəsi</label>
                    <input type="text" className="w-full p-2 border border-slate-300 rounded outline-none" value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} />
                 </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                 <button onClick={() => setShowSupplierModal(false)} className="px-4 py-2 rounded text-slate-600 font-medium hover:bg-slate-200">Ləğv et</button>
                 <button onClick={handleAddSupplier} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium shadow hover:bg-indigo-700">Əlavə et</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
