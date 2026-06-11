export const DEFAULT_CATEGORIES = [
  'Sement və Qarışıqlar',
  'Kərpic və Blok',
  'Boya və Lak',
  'Alətlər',
  'Santexnika',
  'Elektrik',
  'Digər'
];

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number; // Maya dəyəri
  stock: number;
  unit: string; // ədəd, kq, metr, və s.
  imageUrl?: string;
  sku?: string; // Barkod / SKU
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  debt: number;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;
}

export interface Purchase {
  id: string;
  supplierId?: string;
  date: string;
  items: PurchaseItem[];
  totalCost: number;
  paymentMethod: 'NAGD' | 'KART' | 'BORC';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  debt: number; // Borc/Qalıq
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  date: string; // ISO string
  items: CartItem[];
  total: number;
  profit: number;
  discount?: number;
  customerId?: string;
  paymentMethod?: 'NAGD' | 'KART' | 'BORC';
  status?: 'COMPLETED' | 'REFUNDED';
}

export interface DashboardStats {
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  lowStockCount: number;
  totalSalesCount: number;
}

export enum AuditAction {
  ADD = 'ADD',
  DELETE = 'DELETE',
  UPDATE = 'UPDATE',
  SALE = 'SALE',
  BULK_IMPORT = 'BULK_IMPORT',
  REFUND = 'REFUND'
}

export interface AuditLogEntry {
  id: string;
  date: string;
  action: AuditAction;
  details: string;
}