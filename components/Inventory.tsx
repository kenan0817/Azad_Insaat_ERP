import React, { useState, useRef, useMemo } from 'react';
import { InventoryMovement, Product } from '../types';
import { Plus, Search, Trash2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, X, Save, Upload, Download, FileSpreadsheet, Edit, Package, Image as ImageIcon, Hash, TrendingUp, Layers, History } from 'lucide-react';
import { toast } from './Toast';
import { generateId } from '../utils/id';

const COMMON_UNITS = ['ədəd', 'kq', 'metr', 'litr', 'rulon', 'lövhə', 'kisə', 'vedrə', 'qutu'];

interface InventoryProps {
  products: Product[];
  categories: string[];
  setCategories: (c: string[]) => void;
  onAddProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (p: Product) => void;
  onBulkAddProducts: (products: Product[]) => void;
  onAdjustStock: (productId: string, quantityChange: number, note: string, type?: InventoryMovement['type']) => void;
  inventoryMovements: InventoryMovement[];
  lowStockThreshold: number;
  readOnly?: boolean;
}

const Inventory: React.FC<InventoryProps> = ({ products, categories, setCategories, onAddProduct, onDeleteProduct, onUpdateProduct, onAdjustStock, inventoryMovements, lowStockThreshold, onBulkAddProducts, readOnly = false }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [stockAdjustQty, setStockAdjustQty] = useState('');
  const [stockAdjustMode, setStockAdjustMode] = useState<'IN' | 'OUT'>('IN');
  const [stockAdjustNote, setStockAdjustNote] = useState('');

  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStock, setFilterStock] = useState<'ALL' | 'LOW'>('ALL');

  // New Product State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    category: categories[0] || 'Digər',
    price: 0,
    cost: 0,
    stock: 0,
    unit: 'ədəd',
    imageUrl: '',
    sku: ''
  });

  const handleSave = () => {
    if (!newProduct.name || !newProduct.price) return;
    
    // Add to categories if it doesn't exist
    if (newProduct.category && !categories.includes(newProduct.category)) {
      setCategories([...categories, newProduct.category]);
    }

    const product: Product = {
      id: generateId(),
      name: newProduct.name,
      category: newProduct.category || categories[0] || 'Digər',
      price: Number(newProduct.price),
      cost: Number(newProduct.cost),
      stock: Number(newProduct.stock),
      unit: newProduct.unit || 'ədəd',
      imageUrl: newProduct.imageUrl,
      sku: newProduct.sku
    };

    onAddProduct(product);
    setShowAddModal(false);
    setNewProduct({ name: '', category: categories[0] || 'Digər', price: 0, cost: 0, stock: 0, unit: 'ədəd', imageUrl: '', sku: '' });
  };

  const handleUpdateProduct = () => {
    if (!editingProduct || !editingProduct.name || editingProduct.price < 0) return;
    
    // Add to categories if it doesn't exist
    if (editingProduct.category && !categories.includes(editingProduct.category)) {
      setCategories([...categories, editingProduct.category]);
    }
    
    onUpdateProduct(editingProduct);
    setEditingProduct(null);
  };

  const handleDownloadTemplate = () => {
    const headers = "name,category,price,cost,stock,unit,imageUrl,internalCode";
    const sample = "Yeni Məhsul,Digər,10.00,8.00,50,ədəd,,M-001";
    const csvContent = "\uFEFF" + headers + "\n" + sample; 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mehsul_sablonu.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportData = () => {
    const headers = "Ad,Kateqoriya,Maya Dəyəri,Satış Qiyməti,Say,Vahid,Daxili Kod";
    const rows = products.map(p => `${p.name},${p.category},${p.cost},${p.price},${p.stock},${p.unit},${p.sku || ''}`);
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `anbar_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      
      const lines = text.split('\n');
      const parsedProducts: Product[] = [];
      
      for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(',');
          if (parts.length < 6) continue;

          const [name, category, price, cost, stock, unit, imageUrl, sku] = parts;
          
          if (name && !isNaN(Number(price))) {
              const matchedCategory = categories.find(c => c.toLowerCase() === category.trim().toLowerCase()) || category.trim() || 'Digər';
              if (matchedCategory && !categories.includes(matchedCategory)) {
                  // We could update categories here, but simpler to just use it, and let users manage main categories. But better to add it locally so it works.
              }

              parsedProducts.push({
                  id: generateId(),
                  name: name.trim(),
                  category: matchedCategory,
                  price: Number(price),
                  cost: Number(cost) || 0,
                  stock: Number(stock) || 0,
                  unit: unit?.trim() || 'ədəd',
                  imageUrl: imageUrl?.trim() || '',
                  sku: sku?.trim() || ''
              });
          }
      }
      
      if (parsedProducts.length > 0) {
          onBulkAddProducts(parsedProducts);
          if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
          toast.error('Fayldan heç bir məhsul oxuna bilmədi. Zəhmət olmasa şablonu yoxlayın.');
      }
    };
    reader.readAsText(file);
  };

  const handleSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const openStockAdjust = (product: Product, mode: 'IN' | 'OUT') => {
    setStockAdjustProduct(product);
    setStockAdjustMode(mode);
    setStockAdjustQty('1');
    setStockAdjustNote(mode === 'IN' ? 'Manual stok artımı' : 'Manual stok azalması');
  };

  const handleConfirmStockAdjust = () => {
    if (!stockAdjustProduct) return;
    const qty = Number(stockAdjustQty);
    if (!qty || qty <= 0) {
      toast.error('Düzgün say daxil edin');
      return;
    }
    const signedQty = stockAdjustMode === 'IN' ? qty : -qty;
    onAdjustStock(stockAdjustProduct.id, signedQty, stockAdjustNote.trim() || 'Manual stok düzəlişi', stockAdjustMode === 'IN' ? 'ADJUSTMENT' : 'LOSS');
    setStockAdjustProduct(null);
    setStockAdjustQty('');
    setStockAdjustNote('');
  };

  const getSortIcon = (columnKey: keyof Product) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp size={14} className="text-indigo-600" /> : 
      <ArrowDown size={14} className="text-indigo-600" />;
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    const matchesStock = filterStock === 'ALL' || (filterStock === 'LOW' && p.stock < lowStockThreshold);

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Sort Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    if (key === 'name' || key === 'category') {
       const valA = a[key].toLowerCase();
       const valB = b[key].toLowerCase();
       if (valA < valB) return direction === 'asc' ? -1 : 1;
       if (valA > valB) return direction === 'asc' ? 1 : -1;
       return 0;
    }
    
    const valA = Number(a[key as keyof Product]);
    const valB = Number(b[key as keyof Product]);
    return direction === 'asc' ? valA - valB : valB - valA;
  });

  // Analytics
  const totalItems = products.length;
  const lowStockItems = products.filter(p => p.stock < lowStockThreshold).length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
  const potentialRevenue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const recentMovements = inventoryMovements.slice(0, 5);

  const getMovementLabel = (type: InventoryMovement['type']) => {
    if (type === 'SALE') return 'Satış';
    if (type === 'PURCHASE') return 'Mədaxil';
    if (type === 'REFUND') return 'Qaytarma';
    if (type === 'LOSS') return 'Azaltma';
    return 'Düzəliş';
  };

  // Common Form Fields Component
  const renderProductFormFields = (prod: any, setProd: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <div className="xl:col-span-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Şəkil URL</label>
        <div className="flex gap-3 items-center">
            <div className="relative flex-1">
                <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    className="w-full border border-slate-300 pl-10 pr-3 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="https://example.com/image.jpg"
                    value={prod.imageUrl || ''}
                    onChange={e => setProd({...prod, imageUrl: e.target.value})}
                />
            </div>
            {prod.imageUrl && (
                <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 shadow-sm group relative">
                    <img 
                        src={prod.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => (e.currentTarget.style.display = 'none')} 
                    />
                </div>
            )}
        </div>
      </div>

      <div className="xl:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Məhsul Adı <span className="text-red-500">*</span></label>
        <input 
          type="text" 
          className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
          placeholder="Məs: Sement 50kq"
          value={prod.name}
          onChange={e => setProd({...prod, name: e.target.value})}
        />
      </div>
      <div className="xl:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Daxili məhsul kodu</label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            className="w-full border border-slate-300 pl-10 pr-3 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
            placeholder="Məs: M-001"
            value={prod.sku || ''}
            onChange={e => setProd({...prod, sku: e.target.value})}
          />
        </div>
      </div>
      <div className="xl:col-span-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">Kateqoriya <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          <select 
            className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            value={prod.category}
            onChange={e => setProd({...prod, category: e.target.value})}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button 
            type="button"
            onClick={() => {
              const newCat = window.prompt('Yeni kateqoriya adını daxil edin:');
              if (newCat && newCat.trim() && !categories.includes(newCat.trim())) {
                const cat = newCat.trim();
                setCategories([...categories, cat]);
                setProd({...prod, category: cat});
              }
            }}
            className="p-3 shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center"
            title="Yeni kateqoriya əlavə et"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Vahid <span className="text-red-500">*</span></label>
        <div className="relative">
          <input 
            type="text" 
            placeholder="ədəd..."
            className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            value={prod.unit}
            onChange={e => setProd({...prod, unit: e.target.value})}
            list="unit-options"
          />
          <datalist id="unit-options">
            {COMMON_UNITS.map(u => <option key={u} value={u} />)}
          </datalist>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Maya Dəyəri (₼) <span className="text-red-500">*</span></label>
        <input 
          type="number" 
          min="0"
          step="0.01"
          className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white font-mono"
          value={prod.cost}
          onChange={e => setProd({...prod, cost: e.target.value === '' ? '' : Number(e.target.value)})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Satış Qiyməti (₼) <span className="text-red-500">*</span></label>
        <input 
          type="number" 
          min="0"
          step="0.01"
          className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white font-mono"
          value={prod.price}
          onChange={e => setProd({...prod, price: e.target.value === '' ? '' : Number(e.target.value)})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Anbardakı Say</label>
        <input 
          type="number" 
          min="0"
          className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white font-mono font-bold"
          value={prod.stock}
          onChange={e => setProd({...prod, stock: e.target.value === '' ? '' : Number(e.target.value)})}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-3 md:space-y-6 animate-fade-in h-full flex flex-col">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".csv" 
      />

      {/* Analytics header */}
      <div className="hidden grid-cols-4 gap-1.5 shrink-0 px-1 pt-1">
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-2 py-1.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none">Məhsul</p>
            <p className="text-base font-black text-slate-900 leading-tight mt-1">{totalItems}</p>
         </div>
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-2 py-1.5">
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none">Kritik</p>
            <p className="text-base font-black text-amber-600 leading-tight mt-1">{lowStockItems}</p>
         </div>
         <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-2 py-1.5 col-span-2">
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none">Anbar dəyəri</p>
            <p className="text-base font-black text-slate-900 leading-tight whitespace-nowrap mt-1">{totalStockValue.toFixed(2)} ₼</p>
         </div>
      </div>

      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 shrink-0 px-1 pt-1">
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-5 flex items-center justify-between min-h-[86px] sm:min-h-0">
            <div>
               <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Ümumi Məhsul Çeşidi</p>
               <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{totalItems}</h3>
            </div>
            <div className="bg-indigo-50 text-indigo-600 rounded-lg p-2 sm:p-3">
               <Layers size={20} />
            </div>
         </div>
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-5 flex items-center justify-between min-h-[86px] sm:min-h-0">
            <div>
               <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Kritik Stok (&lt; {lowStockThreshold})</p>
               <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{lowStockItems}</h3>
            </div>
            <div className="bg-amber-50 text-amber-600 rounded-lg p-2 sm:p-3">
               <AlertCircle size={20} />
            </div>
         </div>
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-5 flex items-center justify-between min-h-[86px] sm:min-h-0">
            <div>
               <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Anbarın Dəyəri</p>
               <h3 className="text-base sm:text-2xl font-bold text-slate-800 tracking-tight whitespace-nowrap">{totalStockValue.toFixed(2)} ₼</h3>
            </div>
            <div className="bg-blue-50 text-blue-600 rounded-lg p-2 sm:p-3">
               <Package size={20} />
            </div>
         </div>
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-5 flex items-center justify-between min-h-[86px] sm:min-h-0">
            <div>
               <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1">Potensial Gəlir</p>
               <h3 className="text-base sm:text-2xl font-bold text-emerald-600 tracking-tight whitespace-nowrap">{potentialRevenue.toFixed(2)} ₼</h3>
            </div>
            <div className="bg-emerald-50 text-emerald-600 rounded-lg p-2 sm:p-3">
               <TrendingUp size={20} />
            </div>
         </div>
      </div>

      {recentMovements.length > 0 && (
        <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <History size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800">Son stok hərəkətləri</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="border border-slate-100 bg-slate-50 rounded-lg p-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{getMovementLabel(movement.type)}</span>
                  <span className={`text-sm font-black whitespace-nowrap ${movement.quantityChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange} {movement.unit}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate mt-1">{movement.productName}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(movement.date).toLocaleDateString('az-AZ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="md:hidden flex-1 min-h-0 flex flex-col gap-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 shrink-0">
          <div className="flex items-center justify-between gap-2 px-1 pb-1 text-[11px] font-bold text-slate-500">
            <span>{totalItems} məhsul</span>
            <span className={lowStockItems > 0 ? 'text-amber-600' : 'text-emerald-600'}>{lowStockItems} kritik</span>
            <span className="text-slate-700">{totalStockValue.toFixed(2)} ₼</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Məhsul axtar..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                className="h-10 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all font-bold flex items-center gap-1.5 shrink-0"
              >
                <Plus size={17} />
                <span>Yeni</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={handleExportData}
              className="w-8 h-8 text-emerald-600 border border-emerald-100 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0"
              title="İxrac"
            >
              <FileSpreadsheet size={16} />
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="w-8 h-8 text-slate-500 border border-slate-200 rounded-xl flex items-center justify-center shrink-0"
              title="Şablonu yüklə"
            >
              <Download size={16} />
            </button>
            {!readOnly && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 text-slate-500 border border-slate-200 rounded-xl flex items-center justify-center shrink-0"
                title="CSV idxal et"
              >
                <Upload size={16} />
              </button>
            )}
            <button
              onClick={() => setFilterStock(filterStock === 'ALL' ? 'LOW' : 'ALL')}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap flex items-center gap-1 shrink-0 ${
                filterStock === 'LOW'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <AlertCircle size={13} />
              {filterStock === 'LOW' ? 'Kritik' : 'Bütün stok'}
            </button>
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border shrink-0 ${filterCategory === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              Bütün
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border shrink-0 ${filterCategory === c ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 pb-4">
          {sortedProducts.map(product => {
            const isLow = product.stock < lowStockThreshold;
            return (
              <div key={product.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 space-y-1.5">
                <div className="flex items-start gap-2.5">
                  {product.imageUrl ? (
                    <div className="w-10 h-10 shrink-0 rounded-xl border border-slate-100 overflow-hidden bg-slate-50">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 shrink-0 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400">
                      <Package size={17} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 leading-tight truncate">{product.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{product.category}</p>
                    {product.sku && <p className="text-xs text-slate-400 font-mono mt-0.5"><Hash className="inline mr-1" size={10}/>{product.sku}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-sm text-emerald-600 whitespace-nowrap">{product.price.toFixed(2)} ₼</p>
                    <p className="text-[10px] text-slate-400 line-through whitespace-nowrap">{product.cost.toFixed(2)} ₼</p>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                  <span className={`text-[11px] font-bold whitespace-nowrap ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isLow ? 'Kritik' : 'Stok'}: {product.stock} {product.unit}
                  </span>

                  {readOnly ? (
                    <span className="text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm h-8">
                        <button
                          onClick={() => openStockAdjust(product, 'OUT')}
                          className="px-2.5 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold rounded-l-lg border-r border-slate-100"
                        >-</button>
                        <span className="w-11 text-center text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                        <button
                          onClick={() => openStockAdjust(product, 'IN')}
                          className="px-2.5 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold rounded-r-lg border-l border-slate-100"
                        >+</button>
                      </div>
                      <button onClick={() => setEditingProduct({...product})} className="w-8 h-8 bg-white border border-slate-200 text-amber-600 rounded-lg shadow-sm flex items-center justify-center">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => onDeleteProduct(product.id)} className="w-8 h-8 bg-white border border-slate-200 text-red-500 rounded-lg shadow-sm flex items-center justify-center">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {sortedProducts.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
              <Package size={44} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-slate-600">Məhsul tapılmadı</p>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex bg-white rounded-xl shadow-sm border border-slate-200 flex-col min-h-0 flex-1 relative">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="relative w-full lg:w-96 shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Məhsul axtar..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button 
                onClick={handleExportData} 
                className="p-2 text-emerald-600 border border-emerald-100 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 font-medium bg-emerald-50/30"
                title="Bütün məlumatları CSV kimi yüklə"
              >
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline text-sm">İxrac</span>
              </button>
              <button 
                onClick={handleDownloadTemplate} 
                className="p-2 text-slate-500 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Şablonu yüklə"
              >
                <Download size={18} />
              </button>
              {!readOnly && (
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-2 text-slate-500 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                  title="CSV İdxal et"
                >
                  <Upload size={18} />
                  <span className="hidden sm:inline text-sm">İdxal</span>
                </button>
              )}
              
              <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

              <button 
                onClick={() => setFilterStock(filterStock === 'ALL' ? 'LOW' : 'ALL')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
                  filterStock === 'LOW' 
                    ? 'bg-amber-50 border-amber-200 text-amber-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle size={16} className={filterStock === 'LOW' ? 'text-amber-600' : 'text-slate-400'} />
                <span className="text-sm">{filterStock === 'LOW' ? 'Kritik Stok' : 'Bütün Stok'}</span>
              </button>

              {!readOnly && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all font-medium ml-auto lg:ml-0"
                >
                  <Plus size={18} />
                  <span className="text-sm">Yeni Məhsul</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
             <button 
                onClick={() => setFilterCategory('ALL')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterCategory === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
             >
                Bütün
             </button>
             {categories.map(c => (
                <button 
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${filterCategory === c ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {c}
                </button>
             ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-auto flex-1 bg-white">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm border-b border-slate-200">
                <tr className="text-slate-600 text-xs uppercase tracking-wider font-semibold select-none">
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">Məhsul {getSortIcon('name')}</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1.5">Kateqoriya {getSortIcon('category')}</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap text-right" onClick={() => handleSort('cost')}>
                    <div className="flex justify-end items-center gap-1.5">Maya Dəyəri {getSortIcon('cost')}</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap text-right" onClick={() => handleSort('price')}>
                    <div className="flex justify-end items-center gap-1.5">Satış Qiyməti {getSortIcon('price')}</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap text-center" onClick={() => handleSort('stock')}>
                    <div className="flex justify-center items-center gap-1.5">Stok və Say {getSortIcon('stock')}</div>
                  </th>
                  <th className="p-4 text-right whitespace-nowrap">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedProducts.map(product => {
                  const marginRaw = ((product.price - product.cost) / product.price) * 100;
                  const marginStr = isNaN(marginRaw) || !isFinite(marginRaw) ? '0' : marginRaw.toFixed(0);
                  const isLow = product.stock < lowStockThreshold;
                  
                  return (
                  <tr key={product.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="p-4 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white" />
                          ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                 <Package size={20} />
                              </div>
                          )}
                          <div>
                             <span className="block font-bold text-slate-800">{product.name}</span>
                             {product.sku && <span className="text-xs text-slate-400 font-mono tracking-wider"><Hash className="inline mr-1" size={12}/>{product.sku}</span>}
                          </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full whitespace-nowrap border border-slate-200/60 shadow-sm">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-sm text-right">{product.cost.toFixed(2)} ₼</td>
                    <td className="p-4 text-right">
                       <span className="font-bold text-slate-800 font-mono block text-sm">{product.price.toFixed(2)} ₼</span>
                       <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Mənfəət: {marginStr}%</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-1.5">
                         {isLow ? (
                            <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full tracking-wider border border-red-100 flex items-center gap-1 shadow-sm">
                               <AlertCircle size={10} /> Kritik Stok
                            </span>
                         ) : (
                            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full tracking-wider border border-emerald-100 shadow-sm">
                               Kifayət qədər
                            </span>
                         )}
                         {readOnly ? (
                           <span className="text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                         ) : (
                           <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] h-8 overflow-hidden hover:border-indigo-300 transition-colors">
                              <button 
                                 onClick={(e) => { e.stopPropagation(); openStockAdjust(product, 'OUT'); }}
                                 className="px-2.5 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold text-lg leading-none border-r border-slate-100 bg-slate-50 hover:text-indigo-600"
                              >-</button>
                              <span className="w-12 text-center text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                              <button 
                                 onClick={(e) => { e.stopPropagation(); openStockAdjust(product, 'IN'); }}
                                 className="px-2.5 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold text-lg leading-none border-l border-slate-100 bg-slate-50 hover:text-indigo-600"
                              >+</button>
                           </div>
                         )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {!readOnly && (
                        <div className="flex justify-end gap-1 opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingProduct({...product})}
                            className="bg-white border text-amber-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50 p-2 rounded-lg transition-all shadow-sm"
                            title="Düzəliş et"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => onDeleteProduct(product.id)}
                            className="bg-white border text-red-600 border-slate-200 hover:border-red-300 hover:bg-red-50 p-2 rounded-lg transition-all shadow-sm"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
                {sortedProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-16 text-center text-slate-500 bg-slate-50/50">
                      <Package size={48} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-lg text-slate-600">Axtardığınız məlumat tapılmadı.</p>
                      <p className="text-sm mt-1">Axtarış sözünü və ya filteri dəyişməyi yoxlayın.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100 overflow-y-auto">
           {sortedProducts.map(product => {
             const isLow = product.stock < lowStockThreshold;
             return (
              <div key={product.id} className="p-4 bg-white space-y-3">
                 <div className="flex gap-3">
                     {product.imageUrl ? (
                        <div className="w-16 h-16 shrink-0 rounded-lg border border-slate-100 overflow-hidden bg-slate-50">
                           <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                     ) : (
                        <div className="w-16 h-16 shrink-0 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400">
                          <Package size={24} />
                        </div>
                     )}
                     <div className="flex-1 min-w-0">
                         <div className="min-w-0">
                             <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 break-words">{product.name}</h3>
                             <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>
                             {product.sku && <p className="text-xs text-slate-400 font-mono mt-0.5"><Hash className="inline mr-1" size={10}/>{product.sku}</p>}
                             <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                                <span className="font-bold text-emerald-600 whitespace-nowrap">{product.price.toFixed(2)} ₼</span>
                                <span className="text-[10px] text-slate-400 line-through whitespace-nowrap">{product.cost.toFixed(2)} ₼</span>
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <div className="flex flex-col items-start gap-1">
                      {isLow ? (
                          <span className="text-[10px] uppercase font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">Kritik</span>
                      ) : (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">Kifayət qədər</span>
                      )}
                   </div>
                   
                   {readOnly ? (
                     <span className="text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                   ) : (
                     <>
                       <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm h-8">
                          <button 
                             onClick={() => openStockAdjust(product, 'OUT')}
                             className="px-3 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold rounded-l-md border-r border-slate-100"
                          >-</button>
                          <span className="w-10 text-center text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                          <button 
                             onClick={() => openStockAdjust(product, 'IN')}
                             className="px-3 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold rounded-r-md border-l border-slate-100"
                          >+</button>
                       </div>
                       <div className="flex gap-1">
                         <button onClick={() => setEditingProduct({...product})} className="p-2 bg-white border border-slate-200 text-amber-600 rounded-md shadow-sm hover:bg-amber-50">
                           <Edit size={16} />
                         </button>
                         <button onClick={() => onDeleteProduct(product.id)} className="p-2 bg-white border border-slate-200 text-red-500 rounded-md shadow-sm hover:bg-red-50">
                           <Trash2 size={16} />
                         </button>
                       </div>
                     </>
                   )}
                 </div>
              </div>
           )})}
        </div>
      </div>

      {stockAdjustProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Stok düzəlişi</h3>
                <p className="text-sm text-slate-500">{stockAdjustProduct.name}</p>
              </div>
              <button onClick={() => setStockAdjustProduct(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustMode('IN')}
                  className={`py-3 rounded-xl border-2 font-bold ${stockAdjustMode === 'IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
                >
                  Artım
                </button>
                <button
                  type="button"
                  onClick={() => setStockAdjustMode('OUT')}
                  className={`py-3 rounded-xl border-2 font-bold ${stockAdjustMode === 'OUT' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}
                >
                  Azaltma
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Say ({stockAdjustProduct.unit})</label>
                <input
                  type="number"
                  min="0"
                  step={stockAdjustProduct.unit === 'kq' || stockAdjustProduct.unit === 'metr' || stockAdjustProduct.unit === 'litr' ? '0.01' : '1'}
                  value={stockAdjustQty}
                  onChange={(e) => setStockAdjustQty(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Səbəb / qeyd</label>
                <textarea
                  value={stockAdjustNote}
                  onChange={(e) => setStockAdjustNote(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[84px]"
                  placeholder="Məs: sayım fərqi, zədəli məhsul, düzəliş..."
                />
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600">
                Cari stok: <b>{stockAdjustProduct.stock} {stockAdjustProduct.unit}</b>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setStockAdjustProduct(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium">Ləğv et</button>
              <button onClick={handleConfirmStockAdjust} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold">Təsdiqlə</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal - Reusable Layout */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full h-auto rounded-2xl max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-scale-in">
             <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 rounded-t-2xl">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 {showAddModal ? <><Plus className="text-indigo-600"/> Yeni Məhsul Yarat</> : <><Edit className="text-amber-600"/> Məhsulu Redaktə Et</>}
               </h3>
               <button 
                 onClick={() => { setShowAddModal(false); setEditingProduct(null); }} 
                 className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
               >
                 <X size={24} />
               </button>
             </div>
             
             <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                {showAddModal 
                   ? renderProductFormFields(newProduct, setNewProduct)
                   : renderProductFormFields(editingProduct, setEditingProduct)
                }
             </div>

             <div className="bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-2xl">
               <button 
                 onClick={() => { setShowAddModal(false); setEditingProduct(null); }}
                 className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
               >
                 Ləğv et
               </button>
               {showAddModal ? (
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Save size={18} />
                    Əlavə Et
                  </button>
               ) : (
                  <button 
                    onClick={handleUpdateProduct}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium flex justify-center items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Save size={18} />
                    Yadda Saxla
                  </button>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
