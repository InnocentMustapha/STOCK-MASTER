
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SELLER = 'SELLER'
}

export enum SubscriptionTier {
  NONE = 'NONE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  createdAt: string;
  subscription?: SubscriptionTier;
  subscriptionExpiry?: string;
  trialStartedAt?: string; // ISO string of when trial began
  ownerId?: string; // ID of the Admin who owns this worker (for SELLER role)
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  minThreshold: number;
  discount?: number; // Percentage discount (0-100)
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  totalCost: number;
  profit: number;
  timestamp: string;
  sellerId: string;
  sellerName: string;
}

export interface ShopRule {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface InventoryInsight {
  analysis: string;
  recommendations: string[];
  businessGrowthAdvice: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
