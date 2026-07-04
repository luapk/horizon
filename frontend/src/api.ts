import type { BrandConfig, CostEstimate, ScanResult, ScanScope } from "@horizon/shared";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (password: string) => request<{ ok: true }>("/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: true }>("/logout", { method: "POST" }),
  me: () => request<{ ok: true }>("/me"),

  createBrand: (brand: Omit<BrandConfig, "id" | "createdAt">) =>
    request<BrandConfig>("/brands", { method: "POST", body: JSON.stringify(brand) }),
  listBrands: () => request<BrandConfig[]>("/brands"),

  estimateScan: (scope: Partial<ScanScope>) =>
    request<CostEstimate>("/scans/estimate", { method: "POST", body: JSON.stringify({ scope }) }),
  startScan: (brandId: string, scope: Partial<ScanScope>) =>
    request<ScanResult>("/scans", { method: "POST", body: JSON.stringify({ brandId, scope }) }),
  getScan: (id: string) => request<ScanResult>(`/scans/${id}`),
  listScans: (brandId?: string) => request<ScanResult[]>(`/scans${brandId ? `?brandId=${brandId}` : ""}`),
};
