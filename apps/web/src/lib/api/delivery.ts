const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

// Plain fetch (axios dropped for bundle size); non-2xx throws like axios did.
export async function checkDeliveryAvailability(address: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/delivery/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error(`Delivery check failed: ${res.status}`);
  const data = (await res.json()) as { available: boolean };
  return data.available;
}
