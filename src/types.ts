export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  address?: string;
  password?: string;
  locationIds: string[];
  createdAt: any;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier?: string; // Added supplier field
  unit: string;
  minStockLevel: number;
  price: number;
  costPrice?: number; // Added costPrice for profit calculation
  imageUrl?: string;
  createdAt: any;
}

export interface Location {
  id: string;
  name: string;
  address: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  debtBalance?: number; // Added for Phase 1 Debt tracking
  createdAt: any;
}

export interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  lastUpdated: any;
}

export interface Sale {
  id: string;
  productId: string;
  locationId: string;
  customerId?: string;
  customerName?: string;
  quantity: number;
  totalPrice: number;
  paymentMethod?: 'Cash' | 'EVC Plus' | 'Zaad' | 'eDahab' | 'Sahal' | 'Credit'; // Added for Phase 1
  amountPaid?: number; // Added for Phase 1
  status?: 'Completed' | 'Pending' | 'Cancelled' | 'Returned';
  timestamp: any;
}

export interface Purchase {
  id: string;
  productId: string;
  productName?: string;
  locationId: string;
  supplierId: string;
  supplierName?: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  invoiceNumber?: string;
  paymentStatus?: 'Paid' | 'Pending' | 'Credit';
  notes?: string;
  timestamp: any;
}

export interface PurchaseInvoiceItemInput {
  productId?: string;
  productName: string;
  isNewProduct?: boolean;
  category?: string;
  sku?: string;
  unit?: string;
  quantity: number;
  costPrice: number;
  sellingPrice?: number;
  totalCost: number;
}

export interface PurchaseInvoiceInput {
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  locationId: string;
  paymentStatus?: 'Paid' | 'Pending' | 'Credit';
  notes?: string;
  items: PurchaseInvoiceItemInput[];
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'low_stock' | 'sale' | 'system';
  read: boolean;
  timestamp: any;
}

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  type: 'incoming' | 'outgoing' | 'adjustment';
  quantity: number; // Positive for addition, negative for deduction
  note?: string;
  timestamp: any;
}

export interface Order {
  id: string;
  customerName: string;
  address: string;
  productName: string;
  category: string;
  quantity: number;
  totalPrice: number;
  status?: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  orderDate: any;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: any; // e.g. YYYY-MM-DD
  createdBy: string;
  timestamp: any;
}
