export interface Admin {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'super_admin';
}

export interface User {
  id: number;
  phone: string;
  email?: string;
  name: string;
  is_verified: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
  image_url?: string;
  stock_quantity: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit?: string;
  image_url?: string;
}

export interface DeliveryAddress {
  type: 'home' | 'work' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface Order {
  id: number;
  user_id: number;
  customer_name: string;
  customer_phone: string;
  order_number: string;
  total_amount: number;
  delivery_fee: number;
  status: 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method: 'cod' | 'online' | 'upi';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_id?: string;
  delivery_address: DeliveryAddress;
  delivery_date?: string;
  delivery_time_slot?: string;
  notes?: string;
  item_count: number;
  items_summary: string;
  created_at: string;
  updated_at: string;
}

export interface OrderDetails extends Order {
  items: OrderItem[];
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  [key: string]: T[];
  pagination: PaginationInfo;
}> {}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  recentOrders: Order[];
}

export interface ProductFormData {
  category_id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  image_url: string;
  stock_quantity: number;
}

export interface CategoryFormData {
  name: string;
  description: string;
  image_url: string;
}

export interface OrderStatusUpdate {
  status: Order['status'];
  notes?: string;
}