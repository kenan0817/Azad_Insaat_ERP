import React, { useState, useRef, useMemo } from 'react';
import { Product } from '../types';
import { Plus, Search, Trash2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, X, Save, Upload, Download, FileSpreadsheet, Edit, Package, Image as ImageIcon, Barcode, TrendingUp, Layers } from 'lucide-react';
import { toast } from './Toast';

const COMMON_UNITS = ['ədəd', 'kq', 'metr', 'litr', 'rulon', 'lövhə', 'kisə', 'vedrə', 'qutu'];

interface InventoryProps {
  products: Product[];
  categories: string[];
  setCategories: (c: string[]) => void;
  onAddProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateProduct: (p: Product) => void;
  onBulkAddProducts: (products: Product[]) => void;
  lowStockThreshold: number;
}

const Inventory: React.FC<InventoryProps> = ({ products, categories, setCategories, onAddProduct, onDeleteProduct, onUpdateProduct, lowStockThreshold, onBulkAddProducts }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
      id: Date.now().toString(),
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
    const headers = "name,category,price,cost,stock,unit,imageUrl,sku";
    const sample = "Yeni Məhsul,Digər,10.00,8.00,50,ədəd,,123456789";
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
    const headers = "Ad,Kateqoriya,Maya Dəyəri,Satış Qiyməti,Say,Vahid,SKU";
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
                  id: Date.now().toString() + Math.random().toString().slice(2, 6) + i,
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
        <label className="block text-sm font-medium text-slate-700 mb-1">SKU / Barkod</label>
        <div className="relative">
          <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            className="w-full border border-slate-300 pl-10 pr-3 py-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
            placeholder="Barkodu daxil edin..."
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
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0 h-full flex flex-col">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".csv" 
      />

      {/* Analytics header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 px-1 pt-1">
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-slate-500 mb-1">Ümumi Məhsul Çeşidi</p>
               <h3 className="text-2xl font-bold text-slate-800">{totalItems}</h3>
            </div>
            <div className="bg-indigo-50 text-indigo-600 rounded-lg p-3">
               <Layers size={24} />
            </div>
         </div>
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-slate-500 mb-1">Kritik Stok (&lt; {lowStockThreshold})</p>
               <h3 className="text-2xl font-bold text-slate-800">{lowStockItems}</h3>
            </div>
            <div className="bg-amber-50 text-amber-600 rounded-lg p-3">
               <AlertCircle size={24} />
            </div>
         </div>
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-slate-500 mb-1">Anbarın Dəyəri (Maya)</p>
               <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{totalStockValue.toFixed(2)} ₼</h3>
            </div>
            <div className="bg-blue-50 text-blue-600 rounded-lg p-3">
               <Package size={24} />
            </div>
         </div>
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
            <div>
               <p className="text-sm font-medium text-slate-500 mb-1">Potensial Gəlir (Satış)</p>
               <h3 className="text-2xl font-bold text-emerald-600 tracking-tight">{potentialRevenue.toFixed(2)} ₼</h3>
            </div>
            <div className="bg-emerald-50 text-emerald-600 rounded-lg p-3">
               <TrendingUp size={24} />
            </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 flex-1 relative">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="relative w-full lg:w-96 shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Ad, kateqoriya və ya barkodla axtar..." 
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
                <span className="hidden sm:inline text-sm">Export</span>
              </button>
              <button 
                onClick={handleDownloadTemplate} 
                className="p-2 text-slate-500 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Şablonu yüklə"
              >
                <Download size={18} />
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-2 text-slate-500 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                title="CSV İdxal et"
              >
                <Upload size={18} />
                <span className="hidden sm:inline text-sm">Import</span>
              </button>
              
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

              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all font-medium ml-auto lg:ml-0"
              >
                <Plus size={18} />
                <span className="text-sm">Yeni Məhsul</span>
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
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
                             {product.sku && <span className="text-xs text-slate-400 font-mono tracking-wider"><Barcode className="inline mr-1" size={12}/>{product.sku}</span>}
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
                         <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] h-8 overflow-hidden hover:border-indigo-300 transition-colors">
                            <button 
                               onClick={(e) => { e.stopPropagation(); onUpdateProduct({...product, stock: Math.max(0, product.stock - 1)}); }}
                               className="px-2.5 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold text-lg leading-none border-r border-slate-100 bg-slate-50 hover:text-indigo-600"
                            >-</button>
                            <span className="w-12 text-center text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                            <button 
                               onClick={(e) => { e.stopPropagation(); onUpdateProduct({...product, stock: product.stock + 1}); }}
                               className="px-2.5 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold text-lg leading-none border-l border-slate-100 bg-slate-50 hover:text-indigo-600"
                            >+</button>
                         </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                         <div className="flex justify-between items-start">
                             <div>
                               <h3 className="font-bold text-slate-800 truncate leading-tight">{product.name}</h3>
                               <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>
                               {product.sku && <p className="text-xs text-slate-400 font-mono mt-0.5"><Barcode className="inline mr-1" size={10}/>{product.sku}</p>}
                             </div>
                             <div className="text-right shrink-0 ml-2">
                                <div className="font-bold text-emerald-600">{product.price.toFixed(2)} ₼</div>
                                <div className="text-[10px] text-slate-400 line-through">{product.cost.toFixed(2)} ₼</div>
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <div className="flex flex-col items-start gap-1">
                      {isLow ? (
                          <span className="text-[10px] uppercase font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">Kritik</span>
                      ) : (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">Kifayət qədər</span>
                      )}
                   </div>
                   
                   <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm h-8">
                      <button 
                         onClick={() => onUpdateProduct({...product, stock: Math.max(0, product.stock - 1)})}
                         className="px-3 h-full hover:bg-slate-100 text-slate-500 transition-colors font-bold rounded-l-md border-r border-slate-100"
                      >-</button>
                      <span className="w-10 text-center text-sm font-bold text-slate-800 font-mono">{product.stock}</span>
                      <button 
                         onClick={() => onUpdateProduct({...product, stock: product.stock + 1})}
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
                 </div>
              </div>
           )})}
        </div>
      </div>

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
