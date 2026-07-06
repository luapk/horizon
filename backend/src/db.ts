import type { BrandConfig, ScanResult } from "@horizon/shared";

/** Storage adapter. Two backends behind one async API:
 *  - Postgres when POSTGRES_URL / DATABASE_URL is set (Vercel: attach a
 *    Neon/Postgres integration and this activates automatically).
 *  - better-sqlite3 otherwise (local dev / self-hosted). On serverless this
 *    falls back to /tmp and is EPHEMERAL — fine for kicking tires with mock
 *    providers, wrong for production; attach Postgres before real use. */

interface Store {
  saveBrand(brand: BrandConfig): Promise<void>;
  getBrand(id: string): Promise<BrandConfig | undefined>;
  listBrands(): Promise<BrandConfig[]>;
  saveScan(scan: ScanResult): Promise<void>;
  getScan(id: string): Promise<ScanResult | undefined>;
  listScans(brandId?: string): Promise<ScanResult[]>;
}

const PG_URL = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

async function buildPgStore(): Promise<Store> {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: PG_URL, max: 3 });
  await pool.query("CREATE TABLE IF NOT EXISTS brands (id TEXT PRIMARY KEY, data TEXT NOT NULL)");
  await pool.query("CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, brand_id TEXT NOT NULL, data TEXT NOT NULL)");
  return {
    async saveBrand(brand) {
      await pool.query("INSERT INTO brands (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2", [brand.id, JSON.stringify(brand)]);
    },
    async getBrand(id) {
      const r = await pool.query("SELECT data FROM brands WHERE id = $1", [id]);
      return r.rows[0] ? (JSON.parse(r.rows[0].data) as BrandConfig) : undefined;
    },
    async listBrands() {
      const r = await pool.query("SELECT data FROM brands");
      return r.rows.map((row) => JSON.parse(row.data) as BrandConfig);
    },
    async saveScan(scan) {
      await pool.query("INSERT INTO scans (id, brand_id, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $3", [scan.id, scan.brandId, JSON.stringify(scan)]);
    },
    async getScan(id) {
      const r = await pool.query("SELECT data FROM scans WHERE id = $1", [id]);
      return r.rows[0] ? (JSON.parse(r.rows[0].data) as ScanResult) : undefined;
    },
    async listScans(brandId) {
      const r = brandId
        ? await pool.query("SELECT data FROM scans WHERE brand_id = $1", [brandId])
        : await pool.query("SELECT data FROM scans");
      return r.rows.map((row) => JSON.parse(row.data) as ScanResult);
    },
  };
}

async function buildSqliteStore(): Promise<Store> {
  const { default: Database } = await import("better-sqlite3");
  const defaultPath = process.env.VERCEL ? "/tmp/horizon.sqlite3" : "./horizon.sqlite3";
  const db = new Database(process.env.DB_PATH ?? defaultPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, brand_id TEXT NOT NULL, data TEXT NOT NULL);
  `);
  return {
    async saveBrand(brand) {
      db.prepare("INSERT OR REPLACE INTO brands (id, data) VALUES (?, ?)").run(brand.id, JSON.stringify(brand));
    },
    async getBrand(id) {
      const row = db.prepare("SELECT data FROM brands WHERE id = ?").get(id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as BrandConfig) : undefined;
    },
    async listBrands() {
      const rows = db.prepare("SELECT data FROM brands").all() as { data: string }[];
      return rows.map((r) => JSON.parse(r.data) as BrandConfig);
    },
    async saveScan(scan) {
      db.prepare("INSERT OR REPLACE INTO scans (id, brand_id, data) VALUES (?, ?, ?)").run(scan.id, scan.brandId, JSON.stringify(scan));
    },
    async getScan(id) {
      const row = db.prepare("SELECT data FROM scans WHERE id = ?").get(id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as ScanResult) : undefined;
    },
    async listScans(brandId) {
      const rows = brandId
        ? (db.prepare("SELECT data FROM scans WHERE brand_id = ?").all(brandId) as { data: string }[])
        : (db.prepare("SELECT data FROM scans").all() as { data: string }[]);
      return rows.map((r) => JSON.parse(r.data) as ScanResult);
    },
  };
}

let storePromise: Promise<Store> | null = null;
function store(): Promise<Store> {
  storePromise ??= PG_URL ? buildPgStore() : buildSqliteStore();
  return storePromise;
}

export const saveBrand = async (brand: BrandConfig) => (await store()).saveBrand(brand);
export const getBrand = async (id: string) => (await store()).getBrand(id);
export const listBrands = async () => (await store()).listBrands();
export const saveScan = async (scan: ScanResult) => (await store()).saveScan(scan);
export const getScan = async (id: string) => (await store()).getScan(id);
export const listScans = async (brandId?: string) => (await store()).listScans(brandId);
