import axios from "axios";
import type { Product } from "@/types";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api" });

interface FetchProductsParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  featured?: boolean;
  sale?: boolean;
  limit?: number;
  page?: number;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchProducts(params: FetchProductsParams): Promise<ProductsResponse> {
  const { data } = await api.get<ProductsResponse>("/products", { params });
  return data;
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${slug}`);
  return data;
}
