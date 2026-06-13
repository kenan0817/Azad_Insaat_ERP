import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Product, CartItem, Sale, Customer, AppSettings } from '../types';
import {
  Search, ShoppingCart, Minus, Plus, Trash2, CheckCircle,
  Package, UserCircle, CreditCard, Banknote, FileText, Printer,
  X, LayoutList, LayoutGrid, ChevronDown, Percent, RotateCcw,
  UserPlus, ChevronLeft, TrendingUp, StickyNote,
} from 'lucide-react';
import { toast } from './Toast';
import { generateId } from '../utils/id';
import ConfirmModal from './ConfirmModal';
import POSQuantityModal from './POSQuantityModal';
import POSAddProductModal from './POSAddProductModal';
import POSQuickCustomerModal from './POSQuickCustomerModal';
import SearchHighlight from './SearchHighlight';
import { getFrequentProducts, getTodaySalesSummary } from '../utils/posFrequent';
import { savePOSDraft, loadPOSDraft, clearPOSDraft } from '../services/posDraft';
import { printSaleReceipt } from '../utils/posReceipt';
import { formatQuantity } from '../utils/units';

interface POSProps {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  appSettings: AppSettings;
  cashierName: string;
  onCompleteSale: (sale: Sale) => void;
  onAddCustomer: (customer: Customer) => void;
}

type ViewMode = 'list' | 'grid';
type DiscountType = 'amount' | 'percent';
type MobileStep = 'cart' | 'checkout';

const POS: React.FC<POSProps> = ({
  products,
  customers,
  sales,
  appSettings,
  cashierName,
  onCompleteSale,
  onAddCustomer,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Bütün');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'NAGD' | 'KART' | 'BORC'>('NAGD');
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [discount, setDiscount] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState<MobileStep>('cart');
  const [quantityEdit, setQuantityEdit] = useState<CartItem | null>(null);
  const [addProduct, setAddProduct] = useState<Product | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLargeSaleConfirm, setShowLargeSaleConfirm] = useState(false);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => ['Bütün', ...Array.from(new Set(products.map((p) => p.category))).filter(Boolean)],
    [products]
  );

  const inStockProducts = useMemo(() => products.filter((p) => p.stock > 0), [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return inStockProducts.filter((p) => {
      const matchCategory = selectedCategory === 'Bütün' || p.category === selectedCategory;
      const matchSearch = !term ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term);
      return matchCategory && matchSearch;
    });
  }, [inStockProducts, selectedCategory, searchTerm]);

  const frequentProducts = useMemo(
    () => getFrequentProducts(products, sales, 10),
    [products, sales]
  );

  const todaySummary = useMemo(() => getTodaySalesSummary(sales), [sales]);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const discountValue = useMemo(() => {
    const raw = Number(discount) || 0;
    if (discountType === 'percent') return Math.min(cartSubtotal, (cartSubtotal * raw) / 100);
    return Math.min(cartSubtotal, raw);
  }, [discount, discountType, cartSubtotal]);

  const finalTotal = Math.max(0, cartSubtotal - discountValue);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(term) || c.phone.includes(term)
    );
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const lastSale = useMemo(
    () => [...sales].filter((s) => s.status !== 'REFUNDED').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
    [sales]
  );

  useEffect(() => {
    if (draftRestored) return;
    const draft = loadPOSDraft();
    if (draft?.cart?.length) {
      setCart(draft.cart);
      setSelectedCustomerId(draft.selectedCustomerId || '');
      setPaymentMethod(draft.paymentMethod || 'NAGD');
      setDiscount(draft.discount || '');
      setDiscountType(draft.discountType || 'amount');
      setSaleNote(draft.saleNote || '');
      toast.info('Əvvəlki qaimə bərpa edildi');
    }
    setDraftRestored(true);
    searchInputRef.current?.focus();
  }, [draftRestored]);

  useEffect(() => {
    if (!draftRestored) return;
    savePOSDraft({
      cart,
      selectedCustomerId,
      paymentMethod,
      discount,
      discountType,
      saleNote,
    });
  }, [cart, selectedCustomerId, paymentMethod, discount, discountType, saleNote, draftRestored]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addProductWithQty = useCallback((product: Product, qty: number) => {
    if (product.stock <= 0) {
      toast.error('Anbarda məhsul yoxdur');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const newQty = existing ? existing.quantity + qty : qty;
      if (newQty > product.stock) {
        toast.error(`Maksimum: ${product.stock} ${product.unit}`);
        return prev;
      }
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
    toast.success(`${product.name} — ${formatQuantity(qty, product.unit)} ${product.unit}`);
  }, []);

  const openProductPicker = (product: Product) => setAddProduct(product);

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id));

  const updateQuantity = (id: string, newQty: number) => {
    if (newQty < 0.01) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, quantity: Math.min(item.stock, newQty) };
      })
    );
  };

  const executeCheckout = useCallback(() => {
    const totalCost = cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);
    const sale: Sale = {
      id: generateId(),
      date: new Date().toISOString(),
      items: [...cart],
      total: finalTotal,
      profit: finalTotal - totalCost,
      discount: discountValue > 0 ? discountValue : undefined,
      customerId: selectedCustomerId || undefined,
      paymentMethod,
      note: saleNote.trim() || undefined,
      cashierName,
    };

    onCompleteSale(sale);
    setCart([]);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setPaymentMethod('NAGD');
    setDiscount('');
    setSaleNote('');
    clearPOSDraft();
    setCompletedSale(sale);
    setIsCartOpen(false);
    setMobileStep('cart');
    searchInputRef.current?.focus();
  }, [cart, finalTotal, discountValue, selectedCustomerId, paymentMethod, saleNote, cashierName, onCompleteSale]);

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    if (paymentMethod === 'BORC' && !selectedCustomerId) {
      toast.error('Borca satış üçün müştəri seçin');
      setIsCartOpen(true);
      setMobileStep('checkout');
      return;
    }
    const belowCostItem = cart.find((item) => item.price < item.cost);
    if (belowCostItem) {
      toast.info(`${belowCostItem.name} maya dəyərindən aşağı satılır`);
    }
    if (finalTotal >= appSettings.largeSaleThreshold) {
      setShowLargeSaleConfirm(true);
      return;
    }
    executeCheckout();
  }, [cart.length, paymentMethod, selectedCustomerId, finalTotal, appSettings.largeSaleThreshold, executeCheckout]);

  const handleRepeatLastSale = () => {
    if (!lastSale) {
      toast.info('Əvvəlki satış yoxdur');
      return;
    }
    const newCart: CartItem[] = [];
    for (const item of lastSale.items) {
      const product = products.find((p) => p.id === item.id);
      if (!product || product.stock <= 0) continue;
      newCart.push({
        ...product,
        quantity: Math.min(item.quantity, product.stock),
      });
    }
    if (newCart.length === 0) {
      toast.error('Əvvəlki satışdakı məhsullar anbarda yoxdur');
      return;
    }
    setCart(newCart);
    if (lastSale.customerId) setSelectedCustomerId(lastSale.customerId);
    toast.success('Əvvəlki satış qaiməyə yükləndi');
    setIsCartOpen(true);
  };

  const handleQuickCustomer = (name: string, phone: string) => {
    const customer: Customer = { id: generateId(), name, phone, debt: 0 };
    onAddCustomer(customer);
    setSelectedCustomerId(customer.id);
    setShowQuickCustomer(false);
    setShowCustomerList(false);
    toast.success('Müştəri əlavə edildi');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      e.preventDefault();
      openProductPicker(filteredProducts[0]);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (completedSale || quantityEdit || addProduct || showClearConfirm || showLargeSaleConfirm) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsCartOpen(false);
        setMobileStep('cart');
        setShowCustomerList(false);
      }
      if (e.key === 'Enter' && !isInput && cart.length > 0 && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [completedSale, quantityEdit, addProduct, showClearConfirm, showLargeSaleConfirm, cart.length, handleCheckout]);

  const debtAfterSale =
    selectedCustomer && paymentMethod === 'BORC'
      ? selectedCustomer.debt + finalTotal
      : null;

  const cartItemsList = (
    <ul className="divide-y divide-slate-100">
      {cart.map((item, idx) => (
        <li key={item.id} className="p-3 flex gap-2 items-center">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0 hidden sm:block" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 hidden sm:block">
              <Package size={16} className="text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</p>
            <p className="text-xs text-slate-500">{item.price.toFixed(2)} ₼ / {item.unit}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity - (item.unit === 'kq' || item.unit === 'metr' || item.unit === 'litr' ? 0.5 : 1))}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={() => setQuantityEdit(item)}
              className="min-w-[40px] h-10 px-1 font-bold text-sm border border-slate-200 rounded-lg bg-white"
            >
              {formatQuantity(item.quantity, item.unit)}
            </button>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity + (item.unit === 'kq' || item.unit === 'metr' || item.unit === 'litr' ? 0.5 : 1))}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="text-right shrink-0 w-14">
            <p className="font-bold text-sm">{(item.price * item.quantity).toFixed(2)}</p>
            <button type="button" onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 mt-0.5">
              Sil
            </button>
          </div>
        </li>
      ))}
    </ul>
  );

  const checkoutPanel = (
    <div className="space-y-3">
      {selectedCustomer && (
        <div className={`rounded-xl p-3 text-sm border ${paymentMethod === 'BORC' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
          <p className="font-medium text-slate-800">{selectedCustomer.name}</p>
          <p className="text-slate-600 mt-0.5">Cari borc: <b>{selectedCustomer.debt.toFixed(2)} ₼</b></p>
          {debtAfterSale !== null && (
            <p className="text-amber-800 mt-1 font-medium">Satışdan sonra borc: {debtAfterSale.toFixed(2)} ₼</p>
          )}
        </div>
      )}

      <div ref={customerRef} className="relative">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Müştəri</label>
          <button type="button" onClick={() => setShowQuickCustomer(true)} className="text-xs text-blue-600 font-medium flex items-center gap-1">
            <UserPlus size={14} /> Yeni
          </button>
        </div>
        <div className="relative">
          <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Fərdi müştəri — axtar..."
            value={showCustomerList ? customerSearch : selectedCustomer?.name || ''}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setShowCustomerList(true);
              if (!e.target.value) setSelectedCustomerId('');
            }}
            onFocus={() => {
              setShowCustomerList(true);
              setCustomerSearch(selectedCustomer?.name || '');
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        </div>
        {showCustomerList && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
            <button type="button" onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); setShowCustomerList(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b">
              Fərdi müştəri
            </button>
            {filteredCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(''); setShowCustomerList(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-slate-500 ml-2">{c.phone}</span>
                {c.debt > 0 && <span className="text-red-500 text-xs ml-1">({c.debt.toFixed(2)} ₼)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
          <StickyNote size={12} /> Qeyd
        </label>
        <input
          type="text"
          placeholder="Çatdırılma, usta adı..."
          value={saleNote}
          onChange={(e) => setSaleNote(e.target.value)}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Endirim</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDiscountType('amount')} className={`px-3 py-2 rounded-lg text-sm font-bold border ${discountType === 'amount' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}>₼</button>
          <button type="button" onClick={() => setDiscountType('percent')} className={`px-3 py-2 rounded-lg text-sm font-bold border flex items-center gap-1 ${discountType === 'percent' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}><Percent size={14} />%</button>
          <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-right outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Ödəniş</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'NAGD' as const, icon: Banknote, label: 'Nəğd' },
            { id: 'KART' as const, icon: CreditCard, label: 'Kart' },
            { id: 'BORC' as const, icon: FileText, label: 'Borc' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaymentMethod(m.id)}
              className={`py-3 rounded-xl border-2 flex flex-col items-center gap-1 min-h-[68px] ${paymentMethod === m.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
            >
              <m.icon size={20} />
              <span className="text-xs font-bold">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 pt-2 border-t border-slate-100">
        <div>
          {discountValue > 0 && <p className="text-sm text-slate-400 line-through">{cartSubtotal.toFixed(2)} ₼</p>}
          <p className="text-2xl font-black text-slate-900">{finalTotal.toFixed(2)} <span className="text-base text-slate-400">₼</span></p>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className={`px-5 py-3.5 rounded-xl font-bold text-sm min-h-[52px] ${cart.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}
        >
          Satışı tamamla
        </button>
      </div>
    </div>
  );

  const cartPanel = (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          {mobileStep === 'checkout' && (
            <button type="button" onClick={() => setMobileStep('cart')} className="lg:hidden p-2 -ml-2 text-slate-500">
              <ChevronLeft size={22} />
            </button>
          )}
          <ShoppingCart size={20} className="text-blue-600" />
          <h2 className="font-bold text-slate-800">{mobileStep === 'checkout' ? 'Ödəniş' : 'Qaimə'}</h2>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{cartItemCount}</span>
        </div>
        <div className="flex items-center gap-1">
          {lastSale && mobileStep === 'cart' && (
            <button type="button" onClick={handleRepeatLastSale} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg" title="Əvvəlki satışı təkrarla">
              <RotateCcw size={18} />
            </button>
          )}
          {cart.length > 0 && (
            <button type="button" onClick={() => setShowClearConfirm(true)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg">
              <Trash2 size={18} />
            </button>
          )}
          <button type="button" onClick={() => { setIsCartOpen(false); setMobileStep('cart'); }} className="lg:hidden p-2 text-slate-500 rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className={`${mobileStep === 'checkout' ? 'hidden lg:block' : ''} p-2`}>
          {cart.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium text-slate-500">Qaimə boşdur</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">{cartItemsList}</div>
          )}
        </div>
        <div className={`p-4 ${mobileStep === 'cart' ? 'hidden lg:block' : ''} lg:block`}>
          {checkoutPanel}
        </div>
      </div>

      {cart.length > 0 && mobileStep === 'cart' && (
        <div className="lg:hidden p-4 border-t border-slate-100 shrink-0 pb-safe bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 text-sm">Cəm</span>
            <span className="text-xl font-black text-slate-900">{finalTotal.toFixed(2)} ₼</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileStep('checkout')}
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl"
          >
            Ödənişə keç
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-slate-100 overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-3 shrink-0 space-y-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <TrendingUp size={16} className="text-emerald-600" />
              <span>Bugün: <b>{todaySummary.count}</b> satış · <b>{todaySummary.revenue.toFixed(2)}</b> ₼</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Məhsul axtar..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <div className="hidden sm:flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
              <button type="button" onClick={() => setViewMode('list')} className={`p-3 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}><LayoutList size={20} /></button>
              <button type="button" onClick={() => setViewMode('grid')} className={`p-3 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}><LayoutGrid size={20} /></button>
            </div>
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500">
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {frequentProducts.length > 0 && !searchTerm && (
          <div className="px-3 py-2 bg-white border-b border-slate-100 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Tez-tez satılan</p>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {frequentProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openProductPicker(p)}
                  className="shrink-0 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl text-sm font-medium text-blue-800 max-w-[140px] truncate"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 lg:pb-4">
          {viewMode === 'list' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[320px]">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <tr>
                    <th className="p-3 pl-4">Məhsul</th>
                    <th className="p-3 text-center hidden sm:table-cell">Stok</th>
                    <th className="p-3 text-right">Qiymət</th>
                    <th className="p-3 pr-4 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((c) => c.id === product.id);
                    return (
                      <tr key={product.id} className="hover:bg-blue-50/30 cursor-pointer" onClick={() => openProductPicker(product)}>
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-2">
                            {product.imageUrl && <img src={product.imageUrl} alt="" className="w-8 h-8 rounded object-cover hidden sm:block" />}
                            <div>
                              <p className="font-semibold text-slate-800 text-sm"><SearchHighlight text={product.name} query={searchTerm} /></p>
                              <p className="text-xs text-slate-400">{product.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center text-sm hidden sm:table-cell">{product.stock} {product.unit}</td>
                        <td className="p-3 text-right font-bold whitespace-nowrap tabular-nums">{product.price.toFixed(2)} ₼</td>
                        <td className="p-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => openProductPicker(product)} className="min-h-[44px] px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl">
                            {inCart ? `× ${formatQuantity(inCart.quantity, product.unit)}` : <Plus size={16} className="inline" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.id === product.id);
                return (
                  <button key={product.id} type="button" onClick={() => openProductPicker(product)} className={`text-left bg-white rounded-xl p-4 border min-h-[110px] ${inCart ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:shadow-md'}`}>
                    <div className="flex gap-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package size={20} className="text-slate-400" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 line-clamp-2 text-sm"><SearchHighlight text={product.name} query={searchTerm} /></p>
                        <p className="text-lg font-bold text-slate-900 mt-2 whitespace-nowrap tabular-nums">{product.price.toFixed(2)} ₼</p>
                        <p className="text-xs text-slate-500">{product.stock} {product.unit}{inCart && <span className="text-blue-600 font-bold ml-2">× {formatQuantity(inCart.quantity, product.unit)}</span>}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <Package size={48} className="mx-auto mb-3 opacity-25" />
              <p className="font-medium text-lg text-slate-500">Məhsul tapılmadı</p>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-col w-[400px] xl:w-[440px] border-l border-slate-200 bg-white shrink-0 min-h-0">
        {cartPanel}
      </div>

      {!isCartOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t px-4 py-3 pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <button type="button" onClick={() => setIsCartOpen(true)} className="w-full flex justify-between items-center min-h-[52px]">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                <ShoppingCart size={20} />
                {cartItemCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartItemCount}</span>}
              </div>
              <div className="text-left"><p className="text-xs text-slate-500">Qaimə</p><p className="font-bold">{cartItemCount} məhsul</p></div>
            </div>
            <p className="text-xl font-black text-blue-600 whitespace-nowrap tabular-nums">{finalTotal.toFixed(2)} ₼</p>
          </button>
        </div>
      )}

      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => { setIsCartOpen(false); setMobileStep('cart'); }} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[88vh] min-h-[45vh] animate-slide-up">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2 shrink-0" />
            {cartPanel}
          </div>
        </div>
      )}

      {completedSale && (
        <div className="fixed z-[80] inset-0 lg:inset-auto lg:top-0 lg:right-0 lg:bottom-0 lg:w-96 bg-white lg:shadow-2xl lg:border-l border-slate-200 flex flex-col animate-slide-in-right">
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Satış tamamlandı</h3>
            <p className="text-slate-500 text-sm mt-1">#{completedSale.id.slice(0, 8)}</p>
            <p className="text-3xl font-black text-emerald-600 my-4">{completedSale.total.toFixed(2)} ₼</p>
            <button
              type="button"
              onClick={() =>
                printSaleReceipt(
                  completedSale,
                  appSettings,
                  customers.find((c) => c.id === completedSale.customerId)?.name
                )
              }
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 mb-2"
            >
              <Printer size={18} /> Qaiməni çap et
            </button>
            <button
              type="button"
              onClick={() => { setCompletedSale(null); searchInputRef.current?.focus(); }}
              className="w-full py-3 bg-slate-100 text-slate-800 font-bold rounded-xl"
            >
              Yeni satış
            </button>
          </div>
          <button type="button" onClick={() => setCompletedSale(null)} className="lg:hidden p-4 text-center text-slate-500 border-t">Bağla</button>
        </div>
      )}

      {addProduct && (
        <POSAddProductModal
          product={addProduct}
          onConfirm={(qty) => { addProductWithQty(addProduct, qty); setAddProduct(null); }}
          onCancel={() => setAddProduct(null)}
        />
      )}
      {quantityEdit && (
        <POSQuantityModal
          productName={quantityEdit.name}
          currentQty={quantityEdit.quantity}
          maxStock={quantityEdit.stock}
          unit={quantityEdit.unit}
          onConfirm={(qty) => { updateQuantity(quantityEdit.id, qty); setQuantityEdit(null); }}
          onCancel={() => setQuantityEdit(null)}
        />
      )}
      {showQuickCustomer && <POSQuickCustomerModal onSave={handleQuickCustomer} onCancel={() => setShowQuickCustomer(false)} />}
      {showClearConfirm && (
        <ConfirmModal title="Qaiməni təmizlə" message="Bütün məhsullar silinəcək." confirmLabel="Təmizlə" variant="danger" onConfirm={() => { setCart([]); clearPOSDraft(); setShowClearConfirm(false); }} onCancel={() => setShowClearConfirm(false)} />
      )}
      {showLargeSaleConfirm && (
        <ConfirmModal
          title="Böyük satış təsdiqi"
          message={`${finalTotal.toFixed(2)} ₼ məbləğində satışı təsdiqləyirsiniz?`}
          confirmLabel="Satışı tamamla"
          variant="warning"
          onConfirm={() => { setShowLargeSaleConfirm(false); executeCheckout(); }}
          onCancel={() => setShowLargeSaleConfirm(false)}
        />
      )}
    </div>
  );
};

export default POS;
