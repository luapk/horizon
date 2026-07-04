import Database from "better-sqlite3";
import type { BrandConfig, ScanResult } from "@horizon/shared";

const DB_PATH = process.env.DB_PATH ?? "./horizon.sqlite3";
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    data TEXT NOT NULL
  );
`);

export function saveBrand(brand: BrandConfig): void {
  db.prepare("INSERT OR REPLACE INTO brands (id, data) VALUES (?, ?)").run(brand.id, JSON.stringify(brand));
}

export function getBrand(id: string): BrandConfig | undefined {
  const row = db.prepare("SELECT data FROM brands WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as BrandConfig) : undefined;
}

export function listBrands(): BrandConfig[] {
  const rows = db.prepare("SELECT data FROM brands").all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as BrandConfig);
}

export function saveScan(scan: ScanResult): void {
  db.prepare("INSERT OR REPLACE INTO scans (id, brand_id, data) VALUES (?, ?, ?)").run(scan.id, scan.brandId, JSON.stringify(scan));
}

export function getScan(id: string): ScanResult | undefined {
  const row = db.prepare("SELECT data FROM scans WHERE id = ?").get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as ScanResult) : undefined;
}

export function listScans(brandId?: string): ScanResult[] {
  const rows = brandId
    ? (db.prepare("SELECT data FROM scans WHERE brand_id = ?").all(brandId) as { data: string }[])
    : (db.prepare("SELECT data FROM scans").all() as { data: string }[]);
  return rows.map((r) => JSON.parse(r.data) as ScanResult);
}
