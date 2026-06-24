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
  inStock: boolean;
  stockQty: number;
  rating?: number;
  reviewCount?: number;
  country?: string;
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | "received"
  | "preparing"
  | "driver_assigned"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  driverId?: string;
  status: OrderStatus;
  items: Array<{ productId: string; name: string; price: number; quantity: number }>;
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

export interface Address {
  label?: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleInfo?: string;
  isOnline: boolean;
  currentLat?: number;
  currentLng?: number;
  currentOrderId?: string;
  totalDeliveries: number;
  totalEarnings: number;
}

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  phone?: string;
  role: "customer" | "driver" | "admin";
  addresses: Address[];
}
