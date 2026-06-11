import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Sale, Customer } from '../types';
import { Search, ShoppingCart, Minus, Plus, Trash2, CheckCircle, Package, UserCircle, CreditCard, Banknote, FileText, Printer, Barcode, X } from 'lucide-react';
import { toast } from './Toast';

interface POSProps {
  products: Product[];
  customers: Customer[];
  onCompleteSale: (sale: Sale) => void;
}

const POS: React.FC<POSProps> = ({ products, customers, onCompleteSale }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Bütün');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Checkout States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'NAGD' | 'KART' | 'BORC'>('NAGD');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [discount, setDiscount] = useState<string>('');

  // Mobile Cart State
  const [isCartOpen, setIsCartOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Bütün', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];

  useEffect(() => {
     searchInputRef.current?.focus();
  }, []);

  // Barcode Auto-detection
  useEffect(() => {
    if (searchTerm && searchTerm.length > 3) {
       const matchedProduct = products.find(p => p.sku === searchTerm);
       if (matchedProduct) {
          addToCart(matchedProduct);
          setSearchTerm('');
       }
    }
  }, [searchTerm, products]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Anbarda kifayət qədər məhsul yoxdur!');
      return;
    }
    
    const existing = cart.find(item => item.id === product.id);
    if (existing && existing.quantity >= product.stock) {
       toast.error(`Maksimum anbar sayı: ${product.stock}`);
       return;
    } else if (!existing) {
       toast.success(`${product.name} qaiməyə əlavə edildi.`);
    }

    setCart(prev => {
      const prevExisting = prev.find(item => item.id === product.id);
      if (prevExisting) {
        if (prevExisting.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQty: number) => {
    const existing = cart.find(item => item.id === id);
    if (existing && newQty > existing.stock) {
      toast.error(`Maksimum anbar sayı: ${existing.stock}`);
    }

    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          if (newQty > item.stock) {
            return { ...item, quantity: item.stock };
          }
          if (newQty < 1) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const promptQuantity = (item: CartItem) => {
    const qty = window.prompt(`Miqdarı daxil edin (Maksimum: ${item.stock}):`, item.quantity.toString());
    if (qty !== null) {
      const num = parseInt(qty, 10);
      if (!isNaN(num) && num > 0) {
        updateQuantity(item.id, num);
      }
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'BORC' && !selectedCustomerId) {
      toast.error('Borca satış üçün müştəri seçilməlidir!');
      return;
    }

    const subTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountVal = Number(discount) || 0;
    const finalTotal = Math.max(0, subTotal - discountVal);
    const totalCost = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    
    // profit is based on finalTotal compared to cost
    const profit = finalTotal - totalCost;

    const sale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: [...cart],
      total: finalTotal,
      profit: profit,
      discount: discountVal,
      customerId: selectedCustomerId || undefined,
      paymentMethod
    };

    onCompleteSale(sale);
    setCart([]);
    setSelectedCustomerId('');
    setPaymentMethod('NAGD');
    setDiscount('');
    setLastSale(sale);
    setSuccessMsg('Satış uğurla tamamlandı!');
    setTimeout(() => {
        setSuccessMsg('');
        setIsCartOpen(false);
        searchInputRef.current?.focus();
    }, 4000);
  };
  
  const handlePrint = () => {
    if(!lastSale) return;
    const printContent = `
      <div style="font-family: monospace; width: 300px; padding: 20px; text-align: center;">
        <h2 style="margin:0;">Insaat ERP</h2>
        <p style="margin: 5px 0;">Çek Qaiməsi: #${lastSale.id.slice(0, 6)}</p>
        <p style="margin: 5px 0;">Tarix: ${new Date(lastSale.date).toLocaleString('az-AZ')}</p>
        <hr style="border-top:1px dashed #000; margin:10px 0;"/>
        <table style="width: 100%; text-align: left; font-size: 12px;">
          <tr><th>Məhsul</th><th style="padding-left:10px">Say</th><th style="text-align:right">Cəmi</th></tr>
          ${lastSale.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td style="padding-left:10px">${item.quantity}</td>
              <td style="text-align:right;">${(item.quantity * item.price).toFixed(2)} ₼</td>
            </tr>
          `).join('')}
        </table>
        <hr style="border-top:1px dashed #000; margin:10px 0;"/>
        ${lastSale.discount ? `<p style="margin: 5px 0; text-align:right;">Endirim: -${lastSale.discount.toFixed(2)} ₼</p>` : ''}
        <h3 style="margin:0; text-align:right;">Yekun: ${lastSale.total.toFixed(2)} ₼</h3>
        <p style="margin: 5px 0; text-align:right;">Ödəniş: ${lastSale.paymentMethod === 'NAGD' ? 'Nəğd' : lastSale.paymentMethod === 'KART' ? 'Kart' : 'Borc'}</p>
        <hr style="border-top:1px dashed #000; margin:10px 0;"/>
        <p>Bizi seçdiyiniz üçün təşəkkürlər!</p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Çek Çapı - #' + lastSale.id.slice(0, 6) + '</title></head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filteredProducts = products.filter(p => 
    (selectedCategory === 'Bütün' || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-slate-50 overflow-hidden animate-fade-in z-10 relative">
      
      {/* LEFT PANEL: MAIN CONTENT (Categories + Products -> Mobile Top/Middle) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Top Header & Search */}
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center shrink-0 shadow-sm z-10">
          <div className="relative w-full sm:max-w-md">
            <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Məhsul axtar və ya barkod oxut..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-lg text-sm font-medium transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex-1 overflow-x-auto hide-scrollbar w-full sm:w-auto flex pr-4">
             <div className="flex gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                  >
                    {cat}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-28 lg:pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => {
              const isOutOfStock = product.stock <= 0;
              const cartItem = cart.find(item => item.id === product.id);
              
              return (
              <div 
                key={product.id} 
                className={`relative bg-white rounded-2xl p-4 flex flex-col text-left transition-all border ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed border-slate-200' : cartItem ? 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.1)]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm group'}`}
                onClick={() => { if (!isOutOfStock && !cartItem) addToCart(product); }}
              >
                {/* Visual Header of Card */}
                <div className="flex items-start justify-between mb-3">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{product.category}</span>
                   <span className={`text-[10px] px-2 py-1 rounded-md font-bold leading-none ${isOutOfStock ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>
                     {product.stock} {product.unit}
                   </span>
                </div>
                
                {/* Card Body */}
                <div className={`flex-1 flex flex-col ${!isOutOfStock && !cartItem ? 'cursor-pointer' : ''}`}>
                  <h4 className="font-semibold text-slate-800 text-sm leading-snug mb-4 line-clamp-2">{product.name}</h4>
                  
                  <div className="mt-auto flex items-end justify-between" onClick={(e) => cartItem && e.stopPropagation()}>
                    <div className="font-bold text-slate-900">
                      {product.price.toFixed(2)}<span className="text-sm font-medium text-slate-400 ml-1">₼</span>
                    </div>
                    
                    {!cartItem ? (
                      <div>
                        {!isOutOfStock && (
                          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                            <Plus size={16} strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200/60 p-0.5">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             if (cartItem.quantity === 1) removeFromCart(cartItem.id);
                             else updateQuantity(cartItem.id, cartItem.quantity - 1);
                           }} 
                           className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm rounded-md transition-all"
                         >
                           <Minus size={14} strokeWidth={2.5} />
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             promptQuantity(cartItem);
                           }} 
                           className="min-w-[28px] px-1 h-7 flex items-center justify-center text-sm font-bold text-slate-800"
                         >
                           {cartItem.quantity}
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             updateQuantity(cartItem.id, cartItem.quantity + 1);
                           }} 
                           className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm rounded-md transition-all"
                         >
                           <Plus size={14} strokeWidth={2.5} />
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>

          {filteredProducts.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <Package size={48} className="mb-3 opacity-20"/>
               <p className="font-medium text-lg">Məhsul tapılmadı</p>
               <p className="text-sm mt-1">Axtarış meyarlarını dəyişdirin</p>
             </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: CART & CHECKOUT (Native ERP Receipt Style) */}
      <div className={`
        flex flex-col bg-white z-50 transition-transform duration-300 shadow-2xl lg:shadow-none lg:border-l lg:border-slate-200
        fixed inset-0 lg:static lg:w-[420px] 2xl:w-[480px] lg:translate-y-0
        ${isCartOpen ? 'translate-y-0' : 'translate-y-full'}
      `}>
        {/* Cart Header */}
        <div className="h-[60px] bg-slate-900 text-white px-4 flex items-center justify-between shrink-0 shadow-sm relative z-10">
          <div className="flex items-center gap-3">
             <ShoppingCart size={20} className="text-blue-400" />
             <h2 className="font-bold tracking-wide">Cari Satış <span className="text-slate-400 font-normal ml-1">({cartItemCount})</span></h2>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors group">
                <Trash2 size={18} className="group-hover:text-red-400 transition-colors" />
              </button>
            )}
            <button onClick={() => setIsCartOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cart Items (Receipt Form) */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-2">
           {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-4">
                   <ShoppingCart size={24} className="text-slate-400" />
                </div>
                <p className="font-bold text-slate-500">Qaimə boşdur</p>
             </div>
           ) : (
             <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden auto-rows-max divide-y divide-slate-100">
                {cart.map((item, idx) => (
                  <div key={item.id} className="p-3 flex items-start gap-2 hover:bg-blue-50/50 transition-colors group relative">
                     <div className="w-6 text-xs font-bold text-slate-300 pt-1 shrink-0">{idx + 1}.</div>
                     <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-bold text-slate-800 leading-tight">{item.name}</h4>
                       <div className="text-xs text-slate-500 mt-1 font-mono">{item.price.toFixed(2)} ₼ / {item.unit}</div>
                     </div>
                     <div className="flex flex-col items-end gap-2 shrink-0">
                       <div className="text-sm font-bold text-slate-900">{(item.price * item.quantity).toFixed(2)} ₼</div>
                       
                       {/* Qty Controls */}
                       <div className="flex items-center bg-slate-100 rounded-md border border-slate-200">
                         <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-blue-600 rounded-l transition-colors">
                           <Minus size={14} strokeWidth={2.5} />
                         </button>
                         <button onClick={() => promptQuantity(item)} className="w-10 h-7 flex items-center justify-center text-sm font-bold text-slate-800 bg-white border-x border-slate-200 hover:bg-slate-50">
                           {item.quantity}
                         </button>
                         <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-blue-600 rounded-r transition-colors">
                           <Plus size={14} strokeWidth={2.5} />
                         </button>
                       </div>
                     </div>
                     <button onClick={() => removeFromCart(item.id)} className="absolute top-3 right-3 text-red-500/0 group-hover:text-red-500 p-1 bg-white rounded-md shadow-sm border border-slate-100 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                        <X size={14} strokeWidth={3} />
                     </button>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* Checkout Panel */}
        <div className="bg-white border-t border-slate-200 shrink-0 shadow-[0_-15px_30px_rgba(0,0,0,0.05)] pb-safe">
           
           <div className="p-4 grid gap-4">
             {/* Customer & Discount row */}
             <div className="flex gap-3">
                <div className="flex-1 relative">
                  <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <select 
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none transition-all"
                  >
                    <option value="">Fərdi Müştəri</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28 relative">
                   <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">End</div>
                   <input 
                     type="number" 
                     min="0" step="0.01" placeholder="0.00"
                     className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-right"
                     value={discount} 
                     onChange={(e) => setDiscount(e.target.value)} 
                   />
                </div>
             </div>

             {/* Payment Methods */}
             <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'NAGD', icon: Banknote, label: 'Nəğd' },
                  { id: 'KART', icon: CreditCard, label: 'Kart' },
                  { id: 'BORC', icon: FileText, label: 'Borc' }
                ].map(method => (
                  <button 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`py-3 px-1 rounded-xl text-xs font-bold border-2 flex flex-col items-center gap-1 transition-all ${paymentMethod === method.id ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <method.icon size={20} className={paymentMethod === method.id ? 'text-blue-600' : 'text-slate-400'} /> {method.label}
                  </button>
                ))}
             </div>

             <div className="h-px bg-slate-100"></div>

             {/* Totals & Pay button */}
             <div className="flex items-center gap-4">
                <div className="flex-1">
                   <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ödəniləcək məbləğ</div>
                   <div className="text-3xl font-black text-slate-900 tracking-tighter">
                     {Math.max(0, cartSubtotal - (Number(discount) || 0)).toFixed(2)} <span className="text-xl text-slate-400">₼</span>
                   </div>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className={`w-[160px] h-[60px] rounded-2xl font-black text-lg flex flex-col items-center justify-center transition-all ${
                    cart.length > 0 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 active:scale-[0.97]' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="leading-none mb-1">ÖDƏNİŞ</span>
                  <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest leading-none">Tamamla</span>
                </button>
             </div>
             
             {/* Success Alerts */}
             {successMsg && (
               <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in px-8 text-center rounded-t-3xl border-t border-emerald-500">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                    <CheckCircle size={40} strokeWidth={3} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{successMsg}</h3>
                  <p className="text-slate-500 mb-6 font-medium">Qaimə uğurla uçota alındı.</p>
                  {lastSale && (
                    <button onClick={handlePrint} className="w-full bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform text-lg">
                      <Printer size={24} /> Çap üçün göndər
                    </button>
                  )}
               </div>
             )}
           </div>
        </div>
      </div>
      
      {/* Mobile Floating Action Button (Only visible on small screens when Cart is closed) */}
      {!isCartOpen && cartItemCount > 0 && (
        <div className="lg:hidden fixed bottom-[65px] left-0 right-0 z-40 bg-white border-t border-slate-200 p-3 pt-4 shadow-[0_-15px_30px_rgba(0,0,0,0.05)] pb-safe animate-slide-up">
           <button 
             onClick={() => setIsCartOpen(true)}
             className="w-full bg-blue-600 text-white rounded-xl shadow-md p-3 px-4 flex items-center justify-between font-medium active:scale-[0.98] transition-all"
           >
             <div className="flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                 <ShoppingCart size={18} className="text-white" />
               </div>
               <div className="text-left">
                  <div className="text-[11px] text-blue-100 font-bold uppercase tracking-wider leading-none mb-1">Cari Qaimə</div>
                  <div className="font-semibold text-sm tracking-tight text-white leading-none">{cartItemCount} məhsul</div>
               </div>
             </div>
             <div className="text-lg font-bold bg-black/10 px-3 py-1.5 rounded-lg">
               {Math.max(0, cartSubtotal - (Number(discount) || 0)).toFixed(2)} ₼
             </div>
           </button>
        </div>
      )}
    </div>
  );
};

export default POS;