import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Sparkles, LogOut, Menu, Settings,
  History, X, Users, Wallet, Receipt, Truck, ClipboardList, Building2,
} from 'lucide-react';
import {
  Product, Sale, DashboardStats, AuditLogEntry, AuditAction,
  Customer, Expense, Supplier, Purchase, User, AppSettings,
  DebtLedgerEntry, InventoryMovement, SaleRefundItem,
} from './types';
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
import PurchaseHistory from './components/PurchaseHistory';
import Suppliers from './components/Suppliers';
import Login from './components/Login';
import BrandLogo from './components/BrandLogo';
import { ToastManager, toast } from './components/Toast';
import { generateId } from './utils/id';
import { createDefaultAdmin, getDefaultCredentialsHint } from './services/auth';
import {
  loadPersistedData, savePersistedData, getDefaultPersistedData,
  saveSession, loadSession, clearSession, PersistedData, DEFAULT_APP_SETTINGS,
} from './services/storage';
import { canAccessTab, TabKey } from './services/permissions';
import { getRefundedQuantityForProduct, getSaleNetProfit, getSaleNetTotal } from './utils/erpMath';

enum Tab {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  POS = 'pos',
  CUSTOMERS = 'customers',
  EXPENSES = 'expenses',
  SALES = 'sales',
  PURCHASES = 'purchases',
  PURCHASE_HISTORY = 'purchaseHistory',
  SUPPLIERS = 'suppliers',
  ASSISTANT = 'assistant',
  AUDIT = 'audit',
  SETTINGS = 'settings',
}

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [debtLedger, setDebtLedger] = useState<DebtLedgerEntry[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isFirstSetup, setIsFirstSetup] = useState(false);

  // Initialize data from localStorage
  useEffect(() => {
    const init = async () => {
      let data = loadPersistedData();
      if (!data) {
        const defaults = getDefaultPersistedData();
        const admin = await createDefaultAdmin();
        data = { ...defaults, users: [admin] };
        savePersistedData(data);
        setIsFirstSetup(true);
      }

      setProducts(data.products);
      setCustomers(data.customers);
      setSales(data.sales);
      setExpenses(data.expenses);
      setSuppliers(data.suppliers);
      setPurchases(data.purchases);
      setAuditLogs(data.auditLogs);
      setDebtLedger(data.debtLedger);
      setInventoryMovements(data.inventoryMovements);
      setCategories(data.categories);
      setUsers(data.users);
      setAppSettings({ ...DEFAULT_APP_SETTINGS, ...data.appSettings });

      const sessionId = loadSession();
      if (sessionId) {
        const user = data.users.find((u) => u.id === sessionId);
        if (user) setCurrentUser(user);
      }

      setIsReady(true);
    };
    init();
  }, []);

  // Persist data on changes
  useEffect(() => {
    if (!isReady) return;
    const data: PersistedData = {
      products, customers, sales, expenses, suppliers, purchases,
      auditLogs, debtLedger, inventoryMovements, categories, users, appSettings,
    };
    savePersistedData(data);
  }, [
    isReady, products, customers, sales, expenses, suppliers, purchases,
    auditLogs, debtLedger, inventoryMovements, categories, users, appSettings,
  ]);

  const addLog = useCallback((action: AuditAction, details: string) => {
    const newLog: AuditLogEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      action,
      details,
      userId: currentUser?.id,
      userName: currentUser?.name,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [currentUser]);

  const addDebtEntry = useCallback((entry: Omit<DebtLedgerEntry, 'id' | 'date' | 'userName'>) => {
    const newEntry: DebtLedgerEntry = {
      id: generateId(),
      date: new Date().toISOString(),
      userName: currentUser?.name,
      ...entry,
    };
    setDebtLedger((prev) => [newEntry, ...prev]);
  }, [currentUser]);

  const addInventoryMovement = useCallback((entry: Omit<InventoryMovement, 'id' | 'date' | 'userName'>) => {
    const newEntry: InventoryMovement = {
      id: generateId(),
      date: new Date().toISOString(),
      userName: currentUser?.name,
      ...entry,
    };
    setInventoryMovements((prev) => [newEntry, ...prev]);
  }, [currentUser]);

  const handleAdjustStock = (productId: string, quantityChange: number, note: string, type: InventoryMovement['type'] = 'ADJUSTMENT') => {
    const product = products.find((p) => p.id === productId);
    if (!product || quantityChange === 0) return;
    const stockAfter = Math.max(0, product.stock + quantityChange);
    const appliedChange = stockAfter - product.stock;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: stockAfter } : p))
    );
    addInventoryMovement({
      productId,
      productName: product.name,
      type,
      quantityChange: appliedChange,
      stockAfter,
      unit: product.unit,
      note,
    });
    addLog(AuditAction.UPDATE, `${product.name} stok düzəlişi: ${product.stock} -> ${stockAfter}. ${note}`);
    toast.success('Stok düzəlişi qeyd edildi');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    saveSession(user.id);
    const defaultTab = user.role === 'MUDIR' ? Tab.DASHBOARD : Tab.POS;
    setActiveTab(defaultTab);
    if (user.mustChangePassword) {
      setActiveTab(Tab.SETTINGS);
      toast.info('Zəhmət olmasa şifrənizi dəyişin');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    clearSession();
    setActiveTab(Tab.DASHBOARD);
    toast.info('Sistemdən çıxış edildi');
  };

  const validSales = sales.filter((s) => s.status !== 'REFUNDED');
  const stats: DashboardStats = {
    totalRevenue: validSales.reduce((acc, s) => acc + getSaleNetTotal(s), 0),
    totalProfit: validSales.reduce((acc, s) => acc + getSaleNetProfit(s), 0),
    totalExpenses: expenses.reduce((acc, e) => acc + e.amount, 0),
    lowStockCount: products.filter((p) => p.stock < appSettings.lowStockThreshold).length,
    totalSalesCount: validSales.length,
  };

  const handleAddProduct = (product: Product) => {
    setProducts((prev) => [...prev, product]);
    addLog(AuditAction.ADD, `${product.name} əlavə edildi. İlkin say: ${product.stock} ${product.unit}`);
    toast.success(`${product.name} uğurla əlavə edildi!`);
  };

  const handleBulkAddProducts = (newProducts: Product[]) => {
    setProducts((prev) => [...prev, ...newProducts]);
    addLog(AuditAction.BULK_IMPORT, `${newProducts.length} məhsul CSV faylından idxal edildi.`);
    toast.success(`${newProducts.length} məhsul uğurla idxal edildi!`);
  };

  const handleDeleteProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p) {
      addLog(AuditAction.DELETE, `${p.name} silindi.`);
      toast.info(`${p.name} ləğv edildi.`);
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateProduct = (updated: Product) => {
    const old = products.find((p) => p.id === updated.id);
    let changesText = '';
    if (old) {
      const changes: string[] = [];
      if (old.stock !== updated.stock) changes.push(`Say: ${old.stock} -> ${updated.stock}`);
      if (old.price !== updated.price) changes.push(`Qiymət: ${old.price} -> ${updated.price}`);
      if (old.cost !== updated.cost) changes.push(`Maya: ${old.cost} -> ${updated.cost}`);
      if (old.name !== updated.name) changes.push(`Ad: ${old.name} -> ${updated.name}`);
      if (changes.length > 0) changesText = ` (${changes.join(', ')})`;
    }
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    addLog(AuditAction.UPDATE, `${updated.name} yeniləndi.${changesText}`);
    toast.success(`${updated.name} yeniləndi!`);
  };

  const handleSaleComplete = (sale: Sale) => {
    setSales((prev) => [...prev, sale]);

    if (sale.paymentMethod === 'BORC' && sale.customerId) {
      const customer = customers.find((c) => c.id === sale.customerId);
      const balanceAfter = (customer?.debt || 0) + sale.total;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customerId ? { ...c, debt: c.debt + sale.total } : c
        )
      );
      addDebtEntry({
        entityType: 'CUSTOMER',
        entityId: sale.customerId,
        type: 'SALE',
        direction: 'INCREASE',
        amount: sale.total,
        balanceAfter,
        refId: sale.id,
        note: `Borca satış #${sale.id.slice(0, 8)}`,
      });
    }

    const movements: InventoryMovement[] = [];
    setProducts((currentProducts) =>
      currentProducts.map((prod) => {
        const soldItem = sale.items.find((item) => item.id === prod.id);
        if (soldItem) {
          const stockAfter = Math.max(0, prod.stock - soldItem.quantity);
          movements.push({
            id: generateId(),
            date: new Date().toISOString(),
            productId: prod.id,
            productName: prod.name,
            type: 'SALE',
            quantityChange: -soldItem.quantity,
            stockAfter,
            unit: prod.unit,
            refId: sale.id,
            note: `Satış #${sale.id.slice(0, 8)}`,
            userName: currentUser?.name,
          });
          return { ...prod, stock: stockAfter };
        }
        return prod;
      })
    );
    if (movements.length > 0) {
      setInventoryMovements((prev) => [...movements, ...prev]);
    }

    const itemsSummary = sale.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
    addLog(AuditAction.SALE, `Satış #${sale.id.slice(0, 6)}: ${itemsSummary}`);
    toast.success(`Satış uğurla tamamlandı! (#${sale.id.slice(0, 6)})`);
  };

  const handleRefundSale = (saleId: string, refundItems?: SaleRefundItem[], reason?: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'REFUNDED') return;

    const itemsToRefund: SaleRefundItem[] = (refundItems && refundItems.length > 0)
      ? refundItems
      : sale.items
          .map((item) => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity - getRefundedQuantityForProduct(sale, item.id),
            unit: item.unit,
            price: item.price,
            cost: item.cost,
          }))
          .filter((item) => item.quantity > 0);

    if (itemsToRefund.length === 0) return;

    const subtotalBeforeDiscount = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountRate = subtotalBeforeDiscount > 0 ? (sale.discount || 0) / subtotalBeforeDiscount : 0;
    const refundTotal = itemsToRefund.reduce(
      (sum, item) => sum + item.price * item.quantity * (1 - discountRate),
      0
    );

    const movements: InventoryMovement[] = [];
    setProducts((currentProducts) =>
      currentProducts.map((prod) => {
        const refundedItem = itemsToRefund.find((item) => item.productId === prod.id);
        if (refundedItem) {
          const stockAfter = prod.stock + refundedItem.quantity;
          movements.push({
            id: generateId(),
            date: new Date().toISOString(),
            productId: prod.id,
            productName: prod.name,
            type: 'REFUND',
            quantityChange: refundedItem.quantity,
            stockAfter,
            unit: prod.unit,
            refId: sale.id,
            note: reason || `Satış qaytarma #${sale.id.slice(0, 8)}`,
            userName: currentUser?.name,
          });
          return { ...prod, stock: stockAfter };
        }
        return prod;
      })
    );
    if (movements.length > 0) {
      setInventoryMovements((prev) => [...movements, ...prev]);
    }

    setSales((prev) =>
      prev.map((s) => {
        if (s.id !== saleId) return s;
        const refundedTotal = (s.refundedTotal || 0) + refundTotal;
        const soldQuantity = s.items.reduce((sum, item) => sum + item.quantity, 0);
        const previousRefundedQuantity = s.items.reduce(
          (sum, item) => sum + getRefundedQuantityForProduct(s, item.id),
          0
        );
        const refundedQuantity = previousRefundedQuantity +
          itemsToRefund.reduce((sum, item) => sum + item.quantity, 0);
        const status = refundedQuantity >= soldQuantity ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        return {
          ...s,
          status,
          refundedTotal,
          refunds: [
            ...(s.refunds || []),
            {
              id: generateId(),
              date: new Date().toISOString(),
              items: itemsToRefund,
              total: refundTotal,
              reason: reason?.trim() || undefined,
              cashierName: currentUser?.name,
            },
          ],
        };
      })
    );

    if (sale.paymentMethod === 'BORC' && sale.customerId) {
      const customer = customers.find((c) => c.id === sale.customerId);
      const currentDebt = customer?.debt || 0;
      const appliedDebtReduction = Math.min(currentDebt, refundTotal);
      const balanceAfter = Math.max(0, currentDebt - refundTotal);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customerId ? { ...c, debt: balanceAfter } : c
        )
      );
      if (appliedDebtReduction > 0) {
        addDebtEntry({
          entityType: 'CUSTOMER',
          entityId: sale.customerId,
          type: 'REFUND',
          direction: 'DECREASE',
          amount: appliedDebtReduction,
          balanceAfter,
          refId: sale.id,
          note: `Satış qaytarma #${sale.id.slice(0, 8)}`,
        });
      }
    }

    const itemsSummary = itemsToRefund.map((i) => `${i.quantity}x ${i.name}`).join(', ');
    addLog(AuditAction.REFUND, `Satış #${saleId.slice(0, 6)} qaytarıldı: ${itemsSummary}`);
    toast.info(`Qaytarma qeyd edildi (#${saleId.slice(0, 6)})`);
  };

  const handleRestoreBackup = (data: PersistedData) => {
    setProducts(data.products);
    setCustomers(data.customers);
    setSales(data.sales);
    setExpenses(data.expenses);
    setSuppliers(data.suppliers);
    setPurchases(data.purchases);
    setAuditLogs(data.auditLogs);
    setCategories(data.categories);
    setUsers(data.users);
    setDebtLedger(data.debtLedger);
    setInventoryMovements(data.inventoryMovements);
    setAppSettings({ ...DEFAULT_APP_SETTINGS, ...data.appSettings });
    addLog(AuditAction.UPDATE, 'Məlumatlar backup faylından bərpa edildi');
    toast.success('Backup uğurla yükləndi');
  };

  const handleDashboardNavigate = (target: 'sales' | 'expenses' | 'inventory') => {
    if (target === 'sales') setActiveTab(Tab.SALES);
    if (target === 'expenses') setActiveTab(Tab.EXPENSES);
    if (target === 'inventory') setActiveTab(Tab.INVENTORY);
  };

  const renderContent = () => {
    if (!currentUser) return null;
    const role = currentUser.role;

    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard stats={stats} sales={sales} expenses={expenses} onNavigate={handleDashboardNavigate} />;
      case Tab.INVENTORY:
        return (
          <Inventory
            products={products}
            categories={categories}
            setCategories={setCategories}
            onAddProduct={handleAddProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateProduct={handleUpdateProduct}
            onBulkAddProducts={handleBulkAddProducts}
            onAdjustStock={handleAdjustStock}
            inventoryMovements={inventoryMovements}
            lowStockThreshold={appSettings.lowStockThreshold}
            readOnly={role === 'EMEKDAS'}
          />
        );
      case Tab.POS:
        return (
          <POS
            products={products}
            customers={customers}
            sales={sales}
            appSettings={appSettings}
            cashierName={currentUser.name}
            onCompleteSale={handleSaleComplete}
            onAddCustomer={(customer) => {
              setCustomers((prev) => [...prev, customer]);
              addLog(AuditAction.ADD, `Satış ekranından yeni müştəri: ${customer.name}`);
            }}
          />
        );
      case Tab.CUSTOMERS:
        return (
          <Customers
            customers={customers}
            setCustomers={setCustomers}
            addLog={addLog}
            debtLedger={debtLedger}
            addDebtEntry={addDebtEntry}
            canDelete={role === 'MUDIR'}
            canEdit={true}
          />
        );
      case Tab.EXPENSES:
        return <Expenses expenses={expenses} setExpenses={setExpenses} addLog={addLog} />;
      case Tab.PURCHASES:
        return (
          <Purchases
            products={products}
            setProducts={setProducts}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            purchases={purchases}
            setPurchases={setPurchases}
            addLog={addLog}
            addDebtEntry={addDebtEntry}
            addInventoryMovement={addInventoryMovement}
          />
        );
      case Tab.PURCHASE_HISTORY:
        return (
          <PurchaseHistory
            purchases={purchases}
            setPurchases={setPurchases}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            addDebtEntry={addDebtEntry}
            addLog={addLog}
          />
        );
      case Tab.SUPPLIERS:
        return (
          <Suppliers
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            purchases={purchases}
            setPurchases={setPurchases}
            addLog={addLog}
            debtLedger={debtLedger}
            addDebtEntry={addDebtEntry}
          />
        );
      case Tab.SALES:
        return (
          <SalesHistory
            sales={sales}
            customers={customers}
            onRefundSale={handleRefundSale}
            canRefund={role === 'MUDIR'}
          />
        );
      case Tab.ASSISTANT:
        return (
          <Assistant
            products={products}
            sales={sales}
            lowStockThreshold={appSettings.lowStockThreshold}
          />
        );
      case Tab.AUDIT:
        return <AuditLogs logs={auditLogs} />;
      case Tab.SETTINGS:
        return (
          <SettingsPage
            appSettings={appSettings}
            onUpdateSettings={setAppSettings}
            users={users}
            setUsers={setUsers}
            currentUser={currentUser}
            onCurrentUserUpdate={setCurrentUser}
            onRestoreBackup={handleRestoreBackup}
            getPersistedData={() => ({
              products, customers, sales, expenses, suppliers, purchases,
              auditLogs, categories, users, appSettings, debtLedger, inventoryMovements,
            })}
            addLog={addLog}
          />
        );
      default:
        return <Dashboard stats={stats} sales={sales} expenses={expenses} onNavigate={handleDashboardNavigate} />;
    }
  };

  const NavItem = ({ tab, label, icon: Icon }: { tab: Tab; label: string; icon: React.ElementType }) => {
    if (!currentUser || !canAccessTab(currentUser.role, tab as TabKey)) return null;
    if (tab === Tab.ASSISTANT && !appSettings.aiEnabled) return null;

    return (
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
  };

  if (!isReady) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium">Yüklənir...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <ToastManager />
        <Login
          users={users}
          onLogin={handleLogin}
          showDefaultHint={isFirstSetup || users.length <= 1}
          defaultHint={getDefaultCredentialsHint()}
        />
      </>
    );
  }

  const pageTitles: Partial<Record<Tab, string>> = {
    [Tab.DASHBOARD]: 'Xoş Gəldiniz',
    [Tab.INVENTORY]: 'Anbar İdarəetməsi',
    [Tab.POS]: 'Satış',
    [Tab.SALES]: 'Satış Tarixçəsi',
    [Tab.PURCHASES]: 'Mədaxil (Anbara Qəbul)',
    [Tab.PURCHASE_HISTORY]: 'Alış Tarixçəsi',
    [Tab.SUPPLIERS]: 'Təchizatçılar',
    [Tab.CUSTOMERS]: 'Müştərilər',
    [Tab.EXPENSES]: 'Xərclər',
    [Tab.ASSISTANT]: 'Süni İntellekt Dəstəyi',
    [Tab.AUDIT]: 'Sistem Hərəkətləri',
    [Tab.SETTINGS]: 'Tənzimləmələr',
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans">
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm z-10 transition-all">
        <div className="p-6 border-b border-slate-100">
          <BrandLogo size="md" showSubtitle />
          <p className="text-xs text-slate-500 mt-2 truncate">{currentUser.name}</p>
          <p className="text-xs text-blue-600 font-medium">{currentUser.role === 'MUDIR' ? 'Müdir' : 'Əməkdaş'}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem tab={Tab.DASHBOARD} label="İdarə Paneli" icon={LayoutDashboard} />
          <NavItem tab={Tab.POS} label="Satış" icon={ShoppingCart} />
          <NavItem tab={Tab.SALES} label="Satış Tarixçəsi" icon={Receipt} />
          <NavItem tab={Tab.INVENTORY} label="Anbar & Məhsullar" icon={Package} />
          <NavItem tab={Tab.CUSTOMERS} label="Müştərilər" icon={Users} />
          <NavItem tab={Tab.PURCHASES} label="Mədaxil (Alış)" icon={Truck} />
          <NavItem tab={Tab.PURCHASE_HISTORY} label="Alış Tarixçəsi" icon={ClipboardList} />
          <NavItem tab={Tab.SUPPLIERS} label="Təchizatçılar" icon={Building2} />
          <NavItem tab={Tab.EXPENSES} label="Xərclər" icon={Wallet} />
          <NavItem tab={Tab.ASSISTANT} label="Ağıllı Köməkçi" icon={Sparkles} />
          <NavItem tab={Tab.AUDIT} label="Sistem Tarixçəsi" icon={History} />
          <NavItem tab={Tab.SETTINGS} label="Tənzimləmələr" icon={Settings} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Çıxış</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative bg-slate-50">
        <ToastManager />

        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-20 sticky top-0 shadow-sm">
          <BrandLogo size="sm" />
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-[80%] max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-lg text-slate-800">Menyu</span>
                  <p className="text-xs text-slate-500">{currentUser.name}</p>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <NavItem tab={Tab.DASHBOARD} label="İdarə Paneli" icon={LayoutDashboard} />
                <NavItem tab={Tab.POS} label="Satış" icon={ShoppingCart} />
                <NavItem tab={Tab.SALES} label="Satış Tarixçəsi" icon={Receipt} />
                <NavItem tab={Tab.PURCHASES} label="Mədaxil (Alış)" icon={Truck} />
                <NavItem tab={Tab.PURCHASE_HISTORY} label="Alış Tarixçəsi" icon={ClipboardList} />
                <NavItem tab={Tab.SUPPLIERS} label="Təchizatçılar" icon={Building2} />
                <NavItem tab={Tab.INVENTORY} label="Anbar & Məhsullar" icon={Package} />
                <NavItem tab={Tab.CUSTOMERS} label="Müştərilər" icon={Users} />
                <NavItem tab={Tab.EXPENSES} label="Xərclər" icon={Wallet} />
                <NavItem tab={Tab.ASSISTANT} label="Ağıllı Köməkçi" icon={Sparkles} />
                <NavItem tab={Tab.AUDIT} label="Sistem Tarixçəsi" icon={History} />
                <NavItem tab={Tab.SETTINGS} label="Tənzimləmələr" icon={Settings} />
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 bg-white border border-red-100 rounded-xl shadow-sm font-medium hover:bg-red-50"
                >
                  <LogOut size={20} />
                  <span>Çıxış</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-auto ${activeTab === Tab.POS ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
          <div className={`h-full ${activeTab === Tab.POS ? 'w-full' : activeTab === Tab.INVENTORY ? 'max-w-7xl mx-auto' : 'max-w-7xl mx-auto pb-20 md:pb-0'}`}>
            <header className={`mb-6 md:mb-8 hidden ${activeTab === Tab.POS ? 'md:hidden' : 'md:block'}`}>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {pageTitles[activeTab]}
              </h1>
              <p className="text-slate-500 text-sm mt-1">Tikinti materialları mağazası idarəetmə sistemi</p>
            </header>
            <div key={activeTab} className="h-full animate-slide-up">
              {renderContent()}
            </div>
          </div>
        </div>

        <nav className={`md:hidden bg-white border-t border-slate-200 flex justify-around items-center h-[65px] shrink-0 pb-safe z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] ${activeTab === Tab.POS ? 'hidden' : ''}`}>
          {canAccessTab(currentUser.role, 'dashboard') && (
            <button
              onClick={() => { setActiveTab(Tab.DASHBOARD); setIsMobileMenuOpen(false); }}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.DASHBOARD ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutDashboard size={22} />
              <span className="text-[10px] font-medium">Panel</span>
            </button>
          )}
          <button
            onClick={() => { setActiveTab(Tab.POS); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.POS ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingCart size={22} />
            <span className="text-[10px] font-medium">Satış</span>
          </button>
          <button
            onClick={() => { setActiveTab(Tab.INVENTORY); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.INVENTORY ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Package size={22} />
            <span className="text-[10px] font-medium">Anbar</span>
          </button>
          <button
            onClick={() => { setActiveTab(Tab.CUSTOMERS); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === Tab.CUSTOMERS ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={22} />
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
