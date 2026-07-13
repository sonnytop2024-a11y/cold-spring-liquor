export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice?: number;
  volume: string;
  abv: number;
  imageUrl?: string;
  description?: string;
  active?: boolean;
  inStock: boolean;
  stockQty: number;
  rating?: number;
  reviewCount?: number;
  country?: string;
  featured?: boolean;
  bundleEligible?: boolean;
  couponExcluded?: boolean;
  pickupOnly?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  driverTip: number;
  discount: number;
  total: number;
  deliveryAddress: Address;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "received"
  | "preparing"
  | "driver_assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  vehicleInfo?: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  addresses: Address[];
}
