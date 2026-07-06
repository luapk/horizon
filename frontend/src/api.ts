import type { BrandConfig, CostEstimate, ScanResult, ScanScope } from "@horizon/shared";
import { demoApi } from "./demoApi.js";

export const IS_DEMO = import.meta.env.VITE_DEMO === "1";

// Same-origin by default: Vercel rewrites /api/* to the serverless backend,
// and the Vite dev server proxies /api to the local backend (vite.config.js).
const BASE = import.meta.env.VITE_API_BASE ?? "/api";

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

const httpApi = {
  login: (password: string) => request<{ ok: true }>("/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: true }>("/logout", { method: "POST" }),
  me: () => request<{ ok: true }>("/me"),

  createBrand: (brand: Omit<BrandConfig, "id" | "createdAt">) =>
    request<BrandConfig>("/brands", { method: "POST", body: JSON.stringify(brand) }),
  listBrands: () => request<BrandConfig[]>("/brands"),

  estimateScan: (scope: Partial<ScanScope>) =>
    request<CostEstimate>("/scans/estimate", { method: "POST", body: JSON.stringify({ scope }) }),
  startScan: async (brandId: string, scope: Partial<ScanScope>) => {
    const scan = await request<ScanResult>("/scans", { method: "POST", body: JSON.stringify({ brandId, scope }) });
    // Fire the runner and deliberately do NOT await it: the browser keeps this
    // request open, which keeps the serverless function alive for the whole
    // pipeline. Progress is read via polling getScan. Errors are surfaced there.
    void request(`/scans/${scan.id}/run`, { method: "POST" }).catch(() => {});
    return scan;
  },
  getScan: (id: string) => request<ScanResult>(`/scans/${id}`),
  listScans: (brandId?: string) => request<ScanResult[]>(`/scans${brandId ? `?brandId=${brandId}` : ""}`),
};

export const api = IS_DEMO ? demoApi : httpApi;
