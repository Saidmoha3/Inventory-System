export type UserRole = 'admin' | 'staff';

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
  quantity: number;
  totalPrice: number;
  status?: 'Completed' | 'Pending' | 'Cancelled';
  timestamp: any;
}

export interface Purchase {
  id: string;
  productId: string;
  locationId: string;
  supplierId: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  timestamp: any;
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
