import type { Product } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface FetchProductsParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  featured?: boolean;
  sale?: boolean;
  flashdeal?: boolean;
  bundle?: boolean;
  limit?: number;
  page?: number;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

function buildQuery(params: FetchProductsParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// Plain fetch (axios dropped for bundle size). Non-2xx must throw so React
// Query treats it as an error, matching the old axios behavior.
export async function fetchProducts(params: FetchProductsParams): Promise<ProductsResponse> {
  const res = await fetch(`${API_BASE}/products${buildQuery(params)}`);
  if (!res.ok) throw new Error(`Products request failed: ${res.status}`);
  return res.json();
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Product request failed: ${res.status}`);
  return res.json();
}
