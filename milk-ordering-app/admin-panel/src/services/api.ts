import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  PaginatedResponse,
  Admin,
  User,
  Product,
  Category,
  Order,
  OrderDetails,
  LoginCredentials,
  ProductFormData,
  CategoryFormData,
  OrderStatusUpdate,
  DashboardStats
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ token: string; admin: Admin }>> => {
    const response: AxiosResponse<ApiResponse<{ token: string; admin: Admin }>> = 
      await api.post('/auth/admin/login', credentials);
    return response.data;
  },

  verifyToken: async (): Promise<boolean> => {
    try {
      await api.get('/auth/verify');
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Products API
export const productsAPI = {
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response: AxiosResponse<ApiResponse<Category[]>> = await api.get('/products/categories');
    return response.data;
  },

  getAllProducts: async (page = 1, limit = 20): Promise<PaginatedResponse<Product>> => {
    const response: AxiosResponse<PaginatedResponse<Product>> = 
      await api.get(`/products/admin/products?page=${page}&limit=${limit}`);
    return response.data;
  },

  getProductById: async (id: number): Promise<ApiResponse<Product>> => {
    const response: AxiosResponse<ApiResponse<Product>> = await api.get(`/products/${id}`);
    return response.data;
  },

  createCategory: async (categoryData: CategoryFormData): Promise<ApiResponse<Category>> => {
    const response: AxiosResponse<ApiResponse<Category>> = 
      await api.post('/products/admin/categories', categoryData);
    return response.data;
  },

  createProduct: async (productData: ProductFormData): Promise<ApiResponse<Product>> => {
    const response: AxiosResponse<ApiResponse<Product>> = 
      await api.post('/products/admin/products', productData);
    return response.data;
  },

  updateProduct: async (id: number, productData: Partial<ProductFormData>): Promise<ApiResponse<Product>> => {
    const response: AxiosResponse<ApiResponse<Product>> = 
      await api.put(`/products/admin/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: number): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = 
      await api.delete(`/products/admin/products/${id}`);
    return response.data;
  }
};

// Orders API
export const ordersAPI = {
  getAllOrders: async (
    page = 1, 
    limit = 20, 
    status?: string, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<PaginatedResponse<Order>> => {
    let url = `/orders/admin/all?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (dateFrom) url += `&date_from=${dateFrom}`;
    if (dateTo) url += `&date_to=${dateTo}`;
    
    const response: AxiosResponse<PaginatedResponse<Order>> = await api.get(url);
    return response.data;
  },

  getOrderById: async (id: number): Promise<ApiResponse<OrderDetails>> => {
    const response: AxiosResponse<ApiResponse<OrderDetails>> = await api.get(`/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: number, statusData: OrderStatusUpdate): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = 
      await api.put(`/orders/admin/${id}/status`, statusData);
    return response.data;
  }
};

// Users API (Dashboard)
export const usersAPI = {
  getAllUsers: async (page = 1, limit = 20): Promise<PaginatedResponse<User>> => {
    const response: AxiosResponse<PaginatedResponse<User>> = 
      await api.get(`/users/admin/all?page=${page}&limit=${limit}`);
    return response.data;
  }
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    // Since we don't have a dedicated dashboard endpoint, we'll aggregate data
    try {
      const [ordersResponse, usersResponse, productsResponse] = await Promise.all([
        ordersAPI.getAllOrders(1, 1000), // Get all orders for stats
        usersAPI.getAllUsers(1, 1000), // Get all users for count
        productsAPI.getAllProducts(1, 1000) // Get all products for count
      ]);

      const orders = ordersResponse.data.orders || [];
      const users = usersResponse.data.users || [];
      const products = productsResponse.data.products || [];

      const totalRevenue = orders
        .filter(order => order.status === 'delivered')
        .reduce((sum, order) => sum + order.total_amount, 0);

      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
      const recentOrders = orders.slice(0, 5);

      const stats: DashboardStats = {
        totalOrders: orders.length,
        totalUsers: users.length,
        totalProducts: products.length,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
        recentOrders
      };

      return {
        success: true,
        message: 'Dashboard stats fetched successfully',
        data: stats
      };
    } catch (error) {
      throw error;
    }
  }
};

export default api;