import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api" });

export async function checkDeliveryAvailability(address: string): Promise<boolean> {
  const { data } = await api.post<{ available: boolean }>("/delivery/check", { address });
  return data.available;
}
