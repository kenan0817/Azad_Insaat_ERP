import {
  Product,
  Customer,
  Sale,
  Expense,
  Supplier,
  Purchase,
  AuditLogEntry,
  DebtLedgerEntry,
  InventoryMovement,
  User,
  AppSettings,
  DEFAULT_CATEGORIES,
} from '../types';

const STORAGE_KEY = 'insaat-erp-data';
const SESSION_KEY = 'insaat-erp-session';

export interface PersistedData {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: Purchase[];
  auditLogs: AuditLogEntry[];
  debtLedger: DebtLedgerEntry[];
  inventoryMovements: InventoryMovement[];
  categories: string[];
  users: User[];
  appSettings: AppSettings;
}

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Norm Sement 400 (50kq)', category: 'Sement və Qarışıqlar', price: 8.5, cost: 6.5, stock: 150, unit: 'kisə' },
  { id: '2', name: 'Qırmızı Kərpic (İçi boş)', category: 'Kərpic və Blok', price: 0.45, cost: 0.25, stock: 5000, unit: 'ədəd' },
  { id: '3', name: 'Emusiya Ağ (25kq)', category: 'Boya və Lak', price: 45.0, cost: 35.0, stock: 12, unit: 'vedrə' },
  { id: '4', name: 'Lopata (Qar kürəyi)', category: 'Alətlər', price: 12.0, cost: 8.0, stock: 8, unit: 'ədəd' },
  { id: '5', name: 'Alçıpan (Gilan)', category: 'Digər', price: 11.0, cost: 8.5, stock: 45, unit: 'lövhə' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Əhməd Məmmədov', phone: '055-123-45-67', debt: 0 },
  { id: '2', name: 'Zaur Əliyev (Usta)', phone: '050-987-65-43', debt: 150.5 },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  lowStockThreshold: 10,
  aiEnabled: false,
  storeName: 'AzadInsaat',
  storePhone: '',
  storeAddress: '',
  largeSaleThreshold: 500,
};

export const getDefaultPersistedData = (): PersistedData => ({
  products: INITIAL_PRODUCTS,
  customers: INITIAL_CUSTOMERS,
  sales: [],
  expenses: [],
  suppliers: [],
  purchases: [],
  auditLogs: [],
  debtLedger: [],
  inventoryMovements: [],
  categories: [...DEFAULT_CATEGORIES],
  users: [],
  appSettings: { ...DEFAULT_APP_SETTINGS },
});

export const loadPersistedData = (): PersistedData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedData>;
    const defaults = getDefaultPersistedData();
    return {
      ...defaults,
      ...parsed,
      appSettings: { ...defaults.appSettings, ...parsed.appSettings },
      categories: parsed.categories?.length ? parsed.categories : defaults.categories,
      debtLedger: parsed.debtLedger || [],
      inventoryMovements: parsed.inventoryMovements || [],
    } as PersistedData;
  } catch {
    return null;
  }
};

export const savePersistedData = (data: PersistedData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const saveSession = (userId: string): void => {
  localStorage.setItem(SESSION_KEY, userId);
};

export const loadSession = (): string | null => {
  return localStorage.getItem(SESSION_KEY);
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

export interface BackupData extends PersistedData {
  exportedAt: string;
  version: number;
}

export const exportBackup = (data: PersistedData): void => {
  const backup: BackupData = {
    ...data,
    exportedAt: new Date().toISOString(),
    version: 2,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `insaat-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importBackup = (file: File): Promise<PersistedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as BackupData;
        const { exportedAt: _e, version: _v, ...data } = parsed;
        resolve(data as PersistedData);
      } catch {
        reject(new Error('Fayl formatı düzgün deyil'));
      }
    };
    reader.onerror = () => reject(new Error('Fayl oxuna bilmədi'));
    reader.readAsText(file);
  });
};
