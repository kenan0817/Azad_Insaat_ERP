import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Sparkles, LogOut, Menu, Settings, History, X, Users, Wallet, Receipt, Truck } from 'lucide-react';
import { Product, Sale, DashboardStats, DEFAULT_CATEGORIES, AuditLogEntry, AuditAction, Customer, Expense, Supplier, Purchase } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Assistant from './components/Assistant';
import SettingsPage from './components/Settings';
import AuditLogs from './components/AuditLogs';
import Customers from './components/Customers';
import Expenses from './components/Expenses';
import SalesHistory from './components/SalesHistory';
import Purchases from './components/Purchases';
import { ToastManager, toast } from './components/Toast';

// Mock Data
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Norm Sement 400 (50kq)', category: 'Sement və Qarışıqlar', price: 8.50, cost: 6.50, stock: 150, unit: 'kisə' },
  { id: '2', name: 'Qırmızı Kərpic (İçi boş)', category: 'Kərpic və Blok', price: 0.45, cost: 0.25, stock: 5000, unit: 'ədəd' },
  { id: '3', name: 'Emusiya Ağ (25kq)', category: 'Boya və Lak', price: 45.00, cost: 35.00, stock: 12, unit: 'vedrə' },
  { id: '4', name: 'Lopata (Qar kürəyi)', category: 'Alətlər', price: 12.00, cost: 8.00, stock: 8, unit: 'ədəd' },
  { id: '5', name: 'Alçıpan (Gilan)', category: 'Digər', price: 11.00, cost: 8.50, stock: 45, unit: 'lövhə' },
];

enum Tab {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  POS = 'pos',
  CUSTOMERS = 'customers',
  EXPENSES = 'expenses',
  SALES = 'sales',
  PURCHASES = 'purchases',
  ASSISTANT = 'assistant',
  AUDIT = 'audit',
  SETTINGS = 'settings'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>([
    { id: '1', name: 'Əhməd Məmmədov', phone: '055-123-45-67', debt: 0 },
    { id: '2', name: 'Zaur Əliyev (Usta)', phone: '050-987-65-43', debt: 150.50 }
  ]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Helper to add log
  const addLog = (action: AuditAction, details: string) => {
    const newLog: AuditLogEntry = {
      id: Date.now().toString() + Math.random().toString().slice(2, 5),
      date: new Date().toISOString(),
      action,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Computed Stats
  const validSales = sales.filter(s => s.status !== 'REFUNDED');
  const stats: DashboardStats = {
    totalRevenue: validSales.reduce((acc, s) => acc + s.total, 0),
    totalProfit: validSales.reduce((acc, s) => acc + s.profit, 0),
    totalExpenses: expenses.reduce((acc, e) => acc + e.amount, 0),
    lowStockCount: products.filter(p => p.stock < lowStockThreshold).length,
    totalSalesCount: validSales.length,
  };

  const handleAddProduct = (product: Product) => {
    setProducts([...products, product]);
    addLog(AuditAction.ADD, `${product.name} əlavə edildi. İlkin say: ${product.stock} ${product.unit}`);
    toast.success(`${product.name} uğurla əlavə edildi!`);
  };

  const handleBulkAddProducts = (newProducts: Product[]) => {
    setProducts(prev => [...prev, ...newProducts]);
    addLog(AuditAction.BULK_IMPORT, `${newProducts.length} məhsul CSV faylından idxal edildi.`);
    toast.success(`${newProducts.length} məhsul uğurla idxal edildi!`);
  };

  const handleDeleteProduct = (id: string) => {
    const p = products.find(x => x.id === id);
    if (p) {
      addLog(AuditAction.DELETE, `${p.name} silindi.`);
      toast.info(`${p.name} ləğv edildi.`);
    }
    setProducts(products.filter(p => p.id !== id));
  };
  
  const handleUpdateProduct = (updated: Product) => {
     const old = products.find(p => p.id === updated.id);
     let changesText = '';
     if (old) {
       const changes = [];
       if (old.stock !== updated.stock) changes.push(`Say: ${old.stock} -> ${updated.stock}`);
       if (old.price !== updated.price) changes.push(`Qiymət: ${old.price} -> ${updated.price}`);
       if (old.cost !== updated.cost) changes.push(`Maya: ${old.cost} -> ${updated.cost}`);
       if (old.name !== updated.name) changes.push(`Ad: ${old.name} -> ${updated.name}`);
       if (changes.length > 0) changesText = ` (${changes.join(', ')})`;
     }
     setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
     addLog(AuditAction.UPDATE, `${updated.name} yeniləndi.${changesText}`);
     toast.success(`${updated.name} yeniləndi!`);
  };

  const handleSaleComplete = (sale: Sale) => {
    // 1. Add Sale
    setSales([...sales, sale]);
    
    // 1.5 Update Customer Debt if payment method is BORC
    if (sale.paymentMethod === 'BORC' && sale.customerId) {
      setCustomers(prev => prev.map(c => 
        c.id === sale.customerId ? { ...c, debt: c.debt + sale.total } : c
      ));
    }

    // 2. Decrease Stock
    setProducts(currentProducts => {
      return currentProducts.map(prod => {
        const soldItem = sale.items.find(item => item.id === prod.id);
        if (soldItem) {
          return { ...prod, stock: Math.max(0, prod.stock - soldItem.quantity) };
        }
        return prod;
      });
    });

    // 3. Log
    const itemsSummary = sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    addLog(AuditAction.SALE, `Satış #${sale.id.slice(0,6)}: ${itemsSummary}`);
    toast.success(`Satış uğurla tamamlandı! (#${sale.id.slice(0,6)})`);
  };

  const handleRefundSale = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'REFUNDED') return;

    // Restore stock
    setProducts(currentProducts => {
       return currentProducts.map(prod => {
          const soldItem = sale.items.find(item => item.id === prod.id);
          if (soldItem) {
             return { ...prod, stock: prod.stock + soldItem.quantity };
          }
          return prod;
       });
    });

    // Mark sale as refunded
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'REFUNDED' } : s));

    // Handle customer debt if it was BORC
    if (sale.paymentMethod === 'BORC' && sale.customerId) {
       setCustomers(prev => prev.map(c => 
          c.id === sale.customerId ? { ...c, debt: c.debt - sale.total } : c
       ));
    }

    const itemsSummary = sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    addLog(AuditAction.REFUND, `Çek #${saleId.slice(0,6)} geri qaytarıldı. Məhsullar anbara bərpa edildi: ${itemsSummary}`);
    toast.info(`Satış (#${saleId.slice(0,6)}) ləğv edildi və anbara bərpa olundu.`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard stats={stats} sales={sales} />;
      case Tab.INVENTORY:
        return <Inventory 
          products={products} 
          categories={categories}
          setCategories={setCategories}
          onAddProduct={handleAddProduct} 
          onDeleteProduct={handleDeleteProduct} 
          onUpdateProduct={handleUpdateProduct} 
          onBulkAddProducts={handleBulkAddProducts}
          lowStockThreshold={lowStockThreshold} 
        />;
      case Tab.POS:
        return <POS products={products} customers={customers} onCompleteSale={handleSaleComplete} />;
      case Tab.CUSTOMERS:
        return <Customers customers={customers} setCustomers={setCustomers} addLog={addLog} />;
      case Tab.EXPENSES:
        return <Expenses expenses={expenses} setExpenses={setExpenses} addLog={addLog} />;
      case Tab.PURCHASES:
        return <Purchases products={products} setProducts={setProducts} suppliers={suppliers} setSuppliers={setSuppliers} purchases={purchases} setPurchases={setPurchases} addLog={addLog} />;
      case Tab.SALES:
        return <SalesHistory sales={sales} onRefundSale={handleRefundSale} />;
      case Tab.ASSISTANT:
        return <Assistant products={products} sales={sales} lowStockThreshold={lowStockThreshold} />;
      case Tab.AUDIT:
        return <AuditLogs logs={auditLogs} />;
      case Tab.SETTINGS:
        return <SettingsPage lowStockThreshold={lowStockThreshold} onUpdateThreshold={setLowStockThreshold} />;
      default:
        return <Dashboard stats={stats} sales={sales} />;
    }
  };

  const NavItem = ({ tab, label, icon: Icon }: { tab: Tab, label: string, icon: any }) => (
    <button
      onClick={() => { setActiveTab(tab); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        activeTab === tab 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-medium' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm z-10 transition-all">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-700">
            <Package size={28} className="fill-current" />
            <span className="text-xl font-bold tracking-tight">İnşaat<span className="text-slate-800">ERP</span></span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem tab={Tab.DASHBOARD} label="İdarə Paneli" icon={LayoutDashboard} />
          <NavItem tab={Tab.POS} label="Satış Terminalı" icon={ShoppingCart} />
          <NavItem tab={Tab.SALES} label="Satış Tarixçəsi" icon={Receipt} />
          <NavItem tab={Tab.INVENTORY} label="Anbar & Məhsullar" icon={Package} />
          <NavItem tab={Tab.CUSTOMERS} label="Müştərilər" icon={Users} />
          <NavItem tab={Tab.EXPENSES} label="Xərclər" icon={Wallet} />
          <NavItem tab={Tab.ASSISTANT} label="Ağıllı Köməkçi" icon={Sparkles} />
          <NavItem tab={Tab.AUDIT} label="Sistem Tarixçəsi" icon={History} />
          <NavItem tab={Tab.SETTINGS} label="Tənzimləmələr" icon={Settings} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium">
            <LogOut size={20} />
            <span>Çıxış</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50">
        <ToastManager />
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-20 sticky top-0 shadow-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <Package size={24} />
            <span className="font-bold text-lg">İnşaatERP</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Mobile Menu Drawer (Slide-over) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end md:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Drawer */}
            <div className="relative w-[80%] max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-lg text-slate-800">Menyu</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <NavItem tab={Tab.DASHBOARD} label="İdarə Paneli" icon={LayoutDashboard} />
                <NavItem tab={Tab.POS} label="Satış Terminalı" icon={ShoppingCart} />
                <NavItem tab={Tab.SALES} label="Satış Tarixçəsi" icon={Receipt} />
                <NavItem tab={Tab.PURCHASES} label="Mədaxil (Alış)" icon={Truck} />
                <NavItem tab={Tab.INVENTORY} label="Anbar & Məhsullar" icon={Package} />
                <NavItem tab={Tab.CUSTOMERS} label="Müştərilər" icon={Users} />
                <NavItem tab={Tab.EXPENSES} label="Xərclər" icon={Wallet} />
                <NavItem tab={Tab.ASSISTANT} label="Ağıllı Köməkçi" icon={Sparkles} />
                <NavItem tab={Tab.AUDIT} label="Sistem Tarixçəsi" icon={History} />
                <NavItem tab={Tab.SETTINGS} label="Tənzimləmələr" icon={Settings} />
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 bg-white border border-red-100 rounded-xl shadow-sm font-medium hover:bg-red-50">
                  <LogOut size={20} />
                  <span>Çıxış</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className={`flex-1 overflow-auto ${activeTab === Tab.POS ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
          <div className={`h-full ${activeTab === Tab.POS ? 'w-full' : 'max-w-7xl mx-auto pb-20 md:pb-0'}`}>
            <header className={`mb-6 md:mb-8 hidden ${activeTab === Tab.POS ? 'md:hidden' : 'md:block'}`}>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {activeTab === Tab.DASHBOARD && 'Xoş Gəldiniz'}
                {activeTab === Tab.INVENTORY && 'Anbar İdarəetməsi'}
                {activeTab === Tab.POS && 'Satış Nöqtəsi'}
                {activeTab === Tab.SALES && 'Satış Tarixçəsi'}
                {activeTab === Tab.PURCHASES && 'Mədaxil (Anbara Qəbul)'}
                {activeTab === Tab.CUSTOMERS && 'Müştərilər'}
                {activeTab === Tab.EXPENSES && 'Xərclər'}
                {activeTab === Tab.ASSISTANT && 'Süni İntellekt Dəstəyi'}
                {activeTab === Tab.AUDIT && 'Sistem Hərəkətləri'}
                {activeTab === Tab.SETTINGS && 'Tənzimləmələr'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">Tikinti materialları mağazası idarəetmə sistemi</p>
            </header>
            <div key={activeTab} className="h-full animate-slide-up">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white border-t border-slate-200 flex justify-around items-center h-[65px] shrink-0 pb-safe z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => { setActiveTab(Tab.DASHBOARD); setIsMobileMenuOpen(false); }} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.DASHBOARD ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutDashboard size={22} className={activeTab === Tab.DASHBOARD ? 'fill-blue-50' : ''} />
            <span className="text-[10px] font-medium">Panel</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab(Tab.POS); setIsMobileMenuOpen(false); }} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.POS ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingCart size={22} className={activeTab === Tab.POS ? 'fill-blue-50' : ''} />
            <span className="text-[10px] font-medium">Satış</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab(Tab.INVENTORY); setIsMobileMenuOpen(false); }} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.INVENTORY ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package size={22} className={activeTab === Tab.INVENTORY ? 'fill-blue-50' : ''} />
            <span className="text-[10px] font-medium">Anbar</span>
          </button>

          <button 
            onClick={() => { setActiveTab(Tab.CUSTOMERS); setIsMobileMenuOpen(false); }} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.CUSTOMERS ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={22} className={activeTab === Tab.CUSTOMERS ? 'fill-blue-50' : ''} />
            <span className="text-[10px] font-medium">Müştəri</span>
          </button>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isMobileMenuOpen ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Menu size={22} />
            <span className="text-[10px] font-medium">Menyu</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default App;