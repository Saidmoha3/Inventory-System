/**
 * SQLite database layer (uses Node's built-in `node:sqlite`, no native deps).
 * Single source of truth for all application data.
 */
import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─── Connection ──────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'inventory.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE COLLATE NOCASE,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('Admin','Manager','Staff')),
  address       TEXT,
  password_hash TEXT NOT NULL,
  location_ids  TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  phone   TEXT,
  email   TEXT,
  address TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  debt_balance REAL NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  sku             TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL DEFAULT 'Uncategorized',
  supplier        TEXT,
  unit            TEXT NOT NULL DEFAULT 'pcs',
  min_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  price           REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost_price      REAL DEFAULT 0 CHECK (cost_price >= 0),
  image_url       TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  id           TEXT PRIMARY KEY,
  product_id   TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id  TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity     REAL NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL,
  UNIQUE (product_id, location_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('incoming','outgoing','adjustment')),
  quantity    REAL NOT NULL,
  note        TEXT,
  timestamp   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id    TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  customer_id    TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name  TEXT,
  quantity       REAL NOT NULL CHECK (quantity > 0),
  total_price    REAL NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  amount_paid    REAL NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  status         TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed','Pending','Cancelled','Returned')),
  timestamp      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name   TEXT,
  location_id    TEXT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  supplier_id    TEXT,
  supplier_name  TEXT,
  quantity       REAL NOT NULL CHECK (quantity > 0),
  cost_price     REAL NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  total_cost     REAL NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  invoice_number TEXT,
  payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid','Pending','Credit')),
  notes          TEXT,
  timestamp      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  address       TEXT,
  product_name  TEXT NOT NULL,
  category      TEXT,
  quantity      REAL NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_price   REAL NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Shipped','Delivered','Cancelled')),
  order_date    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount      REAL NOT NULL CHECK (amount >= 0),
  category    TEXT NOT NULL DEFAULT 'General',
  date        TEXT NOT NULL,
  created_by  TEXT,
  timestamp   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message   TEXT NOT NULL,
  type      TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('low_stock','sale','system')),
  read      INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_product      ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp    ON sales(timestamp);
CREATE INDEX IF NOT EXISTS idx_purchases_product  ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_product  ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user      ON sessions(user_id);
`);

// ─── Errors ──────────────────────────────────────────────────────────────────
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

/** Runs `fn` atomically. Any thrown error rolls back every write made inside. */
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// ─── Entity definitions (field whitelist + types) ───────────────────────────
type FieldType = 'text' | 'number' | 'json' | 'bool';

export interface EntityConfig {
  table: string;
  fields: Record<string, FieldType>; // camelCase field -> type (writable fields)
  required: string[];
  hidden?: string[];                 // columns never returned to the client
  orderBy?: string;
  autoCreatedAt?: string;            // camelCase field set automatically on insert
}

export const entities = {
  categories: {
    table: 'categories',
    fields: { name: 'text', description: 'text' },
    required: ['name'],
    orderBy: 'name COLLATE NOCASE',
  },
  suppliers: {
    table: 'suppliers',
    fields: { name: 'text', phone: 'text', email: 'text', address: 'text' },
    required: ['name'],
    orderBy: 'name COLLATE NOCASE',
  },
  customers: {
    table: 'customers',
    fields: { name: 'text', phone: 'text', email: 'text', address: 'text', debtBalance: 'number' },
    required: ['name'],
    orderBy: 'name COLLATE NOCASE',
    autoCreatedAt: 'createdAt',
  },
  locations: {
    table: 'locations',
    fields: { name: 'text', address: 'text' },
    required: ['name'],
    orderBy: 'name COLLATE NOCASE',
  },
  products: {
    table: 'products',
    fields: {
      name: 'text', sku: 'text', category: 'text', supplier: 'text', unit: 'text',
      minStockLevel: 'number', price: 'number', costPrice: 'number', imageUrl: 'text',
    },
    required: ['name'],
    orderBy: 'name COLLATE NOCASE',
    autoCreatedAt: 'createdAt',
  },
  orders: {
    table: 'orders',
    fields: {
      customerName: 'text', address: 'text', productName: 'text', category: 'text',
      quantity: 'number', totalPrice: 'number', status: 'text', orderDate: 'text',
    },
    required: ['customerName', 'productName'],
    orderBy: 'order_date DESC',
  },
  expenses: {
    table: 'expenses',
    fields: { description: 'text', amount: 'number', category: 'text', date: 'text', createdBy: 'text' },
    required: ['description', 'amount', 'date'],
    orderBy: 'date DESC',
    autoCreatedAt: 'timestamp',
  },
  users: {
    table: 'users',
    fields: { username: 'text', email: 'text', name: 'text', role: 'text', address: 'text', locationIds: 'json' },
    required: ['email', 'name'],
    hidden: ['passwordHash'],
    orderBy: 'created_at',
    autoCreatedAt: 'createdAt',
  },
} satisfies Record<string, EntityConfig>;

const JSON_COLUMNS = new Set(['location_ids']);
const BOOL_COLUMNS = new Set(['read']);

/** Converts a DB row (snake_case) into an API object (camelCase). */
export function rowToObject(row: any, hidden: string[] = []): any {
  if (!row) return null;
  const out: any = {};
  for (const [col, value] of Object.entries(row)) {
    const key = toCamel(col);
    if (hidden.includes(key)) continue;
    if (JSON_COLUMNS.has(col)) out[key] = value ? JSON.parse(String(value)) : [];
    else if (BOOL_COLUMNS.has(col)) out[key] = !!value;
    else out[key] = value === null ? undefined : value;
  }
  return out;
}

/** Validates & converts input against the whitelist. Unknown fields are dropped. */
export function sanitize(cfg: EntityConfig, input: any, partial: boolean): Record<string, any> {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Invalid request body');
  const out: Record<string, any> = {};
  for (const [field, type] of Object.entries(cfg.fields)) {
    if (!(field in input)) continue;
    let v = input[field];
    if (v === undefined) continue;
    if (v === null || v === '') {
      out[field] = null;
      continue;
    }
    switch (type) {
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n)) throw new HttpError(400, `Field "${field}" must be a number`);
        out[field] = n;
        break;
      }
      case 'json':
        out[field] = JSON.stringify(v);
        break;
      case 'bool':
        out[field] = v ? 1 : 0;
        break;
      default:
        out[field] = String(v).trim();
    }
  }
  if (!partial) {
    for (const r of cfg.required) {
      if (out[r] === undefined || out[r] === null || out[r] === '') {
        throw new HttpError(400, `Field "${r}" is required`);
      }
    }
  } else {
    for (const r of cfg.required) {
      if (r in out && (out[r] === null || out[r] === '')) {
        throw new HttpError(400, `Field "${r}" cannot be empty`);
      }
    }
  }
  return out;
}

// ─── Generic CRUD ────────────────────────────────────────────────────────────
export function listAll(cfg: EntityConfig, where = '', params: any[] = []) {
  const sql = `SELECT * FROM ${cfg.table} ${where} ${cfg.orderBy ? 'ORDER BY ' + cfg.orderBy : ''}`;
  return db.prepare(sql).all(...params).map((r) => rowToObject(r, cfg.hidden));
}

export function getById(cfg: EntityConfig, id: string) {
  const row = db.prepare(`SELECT * FROM ${cfg.table} WHERE id = ?`).get(id);
  return rowToObject(row, cfg.hidden);
}

export function requireById(cfg: EntityConfig, id: string, label = cfg.table) {
  const obj = getById(cfg, id);
  if (!obj) throw new HttpError(404, `${label} not found`);
  return obj;
}

export function insertRow(table: string, data: Record<string, any>) {
  const cols = Object.keys(data);
  const sql = `INSERT INTO ${table} (${cols.map(toSnake).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  db.prepare(sql).run(...cols.map((c) => data[c] ?? null));
}

export function updateRow(table: string, id: string, data: Record<string, any>) {
  const cols = Object.keys(data);
  if (cols.length === 0) return 0;
  const sql = `UPDATE ${table} SET ${cols.map((c) => `${toSnake(c)} = ?`).join(', ')} WHERE id = ?`;
  const res = db.prepare(sql).run(...cols.map((c) => data[c] ?? null), id);
  return Number(res.changes);
}

export function createEntity(cfg: EntityConfig, input: any, extra: Record<string, any> = {}) {
  const data: Record<string, any> = { id: newId(), ...sanitize(cfg, input, false), ...extra };
  for (const k of Object.keys(data)) if (data[k] === null || data[k] === undefined) delete data[k]; // let DEFAULTs apply
  if (cfg.autoCreatedAt && !data[cfg.autoCreatedAt]) data[cfg.autoCreatedAt] = nowIso();
  insertRow(cfg.table, data);
  return getById(cfg, data.id);
}

export function updateEntity(cfg: EntityConfig, id: string, input: any, extra: Record<string, any> = {}) {
  requireById(cfg, id);
  updateRow(cfg.table, id, { ...sanitize(cfg, input, true), ...extra });
  return getById(cfg, id);
}

export function deleteEntity(cfg: EntityConfig, id: string) {
  const res = db.prepare(`DELETE FROM ${cfg.table} WHERE id = ?`).run(id);
  if (Number(res.changes) === 0) throw new HttpError(404, `${cfg.table} not found`);
}

// ─── Passwords (scrypt, built into Node) ─────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = (stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}
