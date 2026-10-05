/**
 * REST API (CRUD) for the inventory system.
 *
 *   POST   /api/auth/login            -> { token, user }
 *   GET    /api/auth/me
 *   POST   /api/auth/logout
 *
 *   GET    /api/<entity>              list
 *   GET    /api/<entity>/:id          read one
 *   POST   /api/<entity>              create
 *   PUT    /api/<entity>/:id          update
 *   DELETE /api/<entity>/:id          delete
 *
 * Every route except /auth/login requires `Authorization: Bearer <token>`.
 */
import express, { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';
import {
  db, entities, EntityConfig, HttpError, nowIso, newId, transaction,
  listAll, requireById, createEntity, updateEntity, deleteEntity, rowToObject,
  insertRow, updateRow, sanitize, hashPassword, verifyPassword,
} from './database';
import * as svc from './services';

type Role = 'Admin' | 'Manager' | 'Staff';
const ROLE_LEVEL: Record<Role, number> = { Staff: 1, Manager: 2, Admin: 3 };
const SESSION_DAYS = 7;

interface AuthedRequest extends Request {
  user?: any;
}

const wrap = (fn: (req: AuthedRequest, res: Response) => any) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const out = fn(req, res);
      if (out instanceof Promise) out.catch(next);
    } catch (err) {
      next(err);
    }
  };

// ─── Auth middleware ─────────────────────────────────────────────────────────
function authenticate(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next(new HttpError(401, 'Not authenticated'));

  const row: any = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, nowIso());
  if (!row) return next(new HttpError(401, 'Session expired, please log in again'));

  req.user = rowToObject(row, entities.users.hidden);
  next();
}

const requireRole = (min: Role) => (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const level = ROLE_LEVEL[req.user?.role as Role] || 0;
  if (level < ROLE_LEVEL[min]) return next(new HttpError(403, `This action requires the ${min} role`));
  next();
};

// ─── Router ──────────────────────────────────────────────────────────────────
export function createApiRouter(): Router {
  const api = express.Router();

  // ── Auth ──
  api.post('/auth/login', wrap((req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) throw new HttpError(400, 'Username and password are required');
    const ident = String(username).trim();
    const row: any = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(ident, ident);
    if (!row || !verifyPassword(String(password), row.password_hash)) {
      throw new HttpError(401, 'Username ama password waa khalad (Invalid credentials)');
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
    insertRow('sessions', { token, userId: row.id, createdAt: nowIso(), expiresAt: expires });
    res.json({ token, user: rowToObject(row, entities.users.hidden) });
  }));

  api.use(authenticate);

  api.get('/auth/me', wrap((req, res) => res.json(req.user)));

  api.post('/auth/logout', wrap((req, res) => {
    const token = (req.headers.authorization || '').slice(7);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.json({ ok: true });
  }));

  // ── Generic CRUD entities ──
  const simple: Array<{ path: string; cfg: EntityConfig; read: Role; write: Role; del: Role }> = [
    { path: 'categories', cfg: entities.categories, read: 'Staff', write: 'Manager', del: 'Manager' },
    { path: 'suppliers',  cfg: entities.suppliers,  read: 'Staff', write: 'Manager', del: 'Manager' },
    { path: 'customers',  cfg: entities.customers,  read: 'Staff', write: 'Staff',   del: 'Manager' },
    { path: 'locations',  cfg: entities.locations,  read: 'Staff', write: 'Staff',   del: 'Manager' },
    { path: 'orders',     cfg: entities.orders,     read: 'Staff', write: 'Staff',   del: 'Staff' },
    { path: 'expenses',   cfg: entities.expenses,   read: 'Manager', write: 'Manager', del: 'Manager' },
  ];

  for (const { path, cfg, read, write, del } of simple) {
    api.get(`/${path}`, requireRole(read), wrap((_req, res) => res.json(listAll(cfg))));
    api.get(`/${path}/:id`, requireRole(read), wrap((req, res) => res.json(requireById(cfg, req.params.id))));
    api.post(`/${path}`, requireRole(write), wrap((req, res) => {
      const extra: Record<string, any> = {};
      if (path === 'orders' && !req.body?.orderDate) extra.orderDate = nowIso();
      if (path === 'expenses' && !req.body?.createdBy) extra.createdBy = req.user.name;
      res.status(201).json(transaction(() => createEntity(cfg, req.body, extra)));
    }));
    api.put(`/${path}/:id`, requireRole(write), wrap((req, res) => {
      res.json(transaction(() => {
        const before = requireById(cfg, req.params.id);
        const after = updateEntity(cfg, req.params.id, req.body);
        // keep products in sync when a category / supplier is renamed
        if (path === 'categories' && before.name !== after.name) {
          db.prepare('UPDATE products SET category = ? WHERE category = ?').run(after.name, before.name);
        }
        if (path === 'suppliers' && before.name !== after.name) {
          db.prepare('UPDATE products SET supplier = ? WHERE supplier = ?').run(after.name, before.name);
        }
        return after;
      }));
    }));
    api.delete(`/${path}/:id`, requireRole(del), wrap((req, res) => {
      deleteEntity(cfg, req.params.id);
      res.json({ ok: true });
    }));
  }

  // ── Customers: debt settlement ──
  api.post('/customers/:id/settle', wrap((req, res) => {
    res.json(svc.settleCustomerDebt(req.params.id, req.body?.amount));
  }));

  // ── Products ──
  api.get('/products', wrap((_req, res) => res.json(listAll(entities.products))));
  api.get('/products/:id', wrap((req, res) => res.json(requireById(entities.products, req.params.id))));
  api.post('/products', wrap((req, res) => {
    res.status(201).json(transaction(() => svc.createProductRecord(req.body)));
  }));
  api.put('/products/:id', wrap((req, res) => {
    res.json(transaction(() => updateEntity(entities.products, req.params.id, req.body)));
  }));
  api.delete('/products/:id', requireRole('Manager'), wrap((req, res) => {
    deleteEntity(entities.products, req.params.id);
    res.json({ ok: true });
  }));

  // ── Inventory / stock ──
  api.get('/inventory', wrap((_req, res) => res.json(svc.listInventory())));
  api.post('/inventory/adjust', wrap((req, res) => { svc.adjustStock(req.body); res.json({ ok: true }); }));
  api.post('/inventory/transfer', wrap((req, res) => { svc.transferStock(req.body); res.json({ ok: true }); }));
  api.get('/stock-movements', wrap((req, res) => {
    res.json(svc.listStockMovements(req.query.productId ? String(req.query.productId) : undefined));
  }));

  // ── Sales ──
  api.get('/sales', wrap((_req, res) => res.json(svc.listSales())));
  api.post('/sales', wrap((req, res) => res.status(201).json(svc.createSale(req.body))));
  api.put('/sales/:id', wrap((req, res) => res.json(svc.updateSale(req.params.id, req.body))));
  api.post('/sales/:id/return', wrap((req, res) => res.json(svc.returnSale(req.params.id))));
  api.delete('/sales/:id', requireRole('Manager'), wrap((req, res) => {
    svc.deleteSale(req.params.id);
    res.json({ ok: true });
  }));

  // ── Purchases ──
  api.get('/purchases', requireRole('Manager'), wrap((_req, res) => res.json(svc.listPurchases())));
  api.post('/purchases', requireRole('Manager'), wrap((req, res) => res.status(201).json(svc.createPurchase(req.body))));
  api.post('/purchases/invoice', requireRole('Manager'), wrap((req, res) => {
    res.status(201).json({ ids: svc.createPurchaseInvoice(req.body) });
  }));
  api.put('/purchases/:id', requireRole('Manager'), wrap((req, res) => res.json(svc.updatePurchase(req.params.id, req.body))));
  api.delete('/purchases/:id', requireRole('Manager'), wrap((req, res) => {
    svc.deletePurchase(req.params.id);
    res.json({ ok: true });
  }));

  // ── Notifications (scoped to the logged-in user) ──
  api.get('/notifications', wrap((req, res) => {
    const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC').all(req.user.id);
    res.json(rows.map((r) => rowToObject(r)));
  }));
  api.post('/notifications', wrap((req, res) => {
    const { userId, message, type } = req.body || {};
    if (!message) throw new HttpError(400, 'Message is required');
    const id = newId();
    insertRow('notifications', {
      id, userId: userId || req.user.id, message: String(message),
      type: ['low_stock', 'sale', 'system'].includes(type) ? type : 'system', read: 0, timestamp: nowIso(),
    });
    res.status(201).json(rowToObject(db.prepare('SELECT * FROM notifications WHERE id = ?').get(id)));
  }));
  api.put('/notifications/:id/read', wrap((req, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ ok: true });
  }));

  // ── Users ──
  const usersCfg = entities.users;
  const validRole = (r: any) => (['Admin', 'Manager', 'Staff'].includes(r) ? r : undefined);

  api.get('/users', requireRole('Admin'), wrap((_req, res) => res.json(listAll(usersCfg))));

  api.post('/users', requireRole('Admin'), wrap((req, res) => {
    const body = req.body || {};
    if (!body.password || String(body.password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (body.role && !validRole(body.role)) throw new HttpError(400, 'Invalid role');
    const user = transaction(() => createEntity(usersCfg, { role: 'Staff', locationIds: [], ...body }, {
      passwordHash: hashPassword(String(body.password)),
    }));
    res.status(201).json(user);
  }));

  api.put('/users/:id', wrap((req, res) => {
    const isAdmin = req.user.role === 'Admin';
    const isSelf = req.user.id === req.params.id;
    if (!isAdmin && !isSelf) throw new HttpError(403, 'You can only edit your own profile');

    const body = { ...(req.body || {}) };
    if (!isAdmin) delete body.role;               // non-admins can't escalate privileges
    if (body.role && !validRole(body.role)) throw new HttpError(400, 'Invalid role');
    if (isSelf && isAdmin && body.role && body.role !== 'Admin') {
      throw new HttpError(400, 'You cannot remove your own Admin role');
    }

    const extra: Record<string, any> = {};
    if (body.password) {
      if (String(body.password).length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
      extra.passwordHash = hashPassword(String(body.password));
    }
    res.json(transaction(() => {
      requireById(usersCfg, req.params.id, 'User');
      updateRow('users', req.params.id, { ...sanitize(usersCfg, body, true), ...extra });
      if (extra.passwordHash && !isSelf) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.id);
      return requireById(usersCfg, req.params.id, 'User');
    }));
  }));

  api.delete('/users/:id', requireRole('Admin'), wrap((req, res) => {
    if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot delete your own account');
    deleteEntity(usersCfg, req.params.id);
    res.json({ ok: true });
  }));

  // ── Admin tools ──
  api.post('/admin/reset', requireRole('Admin'), wrap((_req, res) => {
    svc.resetBusinessData();
    res.json({ ok: true });
  }));
  api.post('/admin/seed', requireRole('Admin'), wrap((_req, res) => {
    const seeded = svc.seedSampleData();
    res.json({ ok: true, seeded, message: seeded ? 'Sample data imported' : 'Database already has products; nothing imported' });
  }));

  api.use((_req, _res, next) => next(new HttpError(404, 'API route not found')));
  api.use(apiErrorHandler);
  return api;
}

// ─── Error handler (maps SQLite constraint errors to friendly HTTP errors) ──
function apiErrorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });

  const msg: string = err?.message || '';
  if (msg.includes('FOREIGN KEY constraint failed')) {
    return res.status(409).json({ error: 'This record is used by other records (e.g. sales or purchases) and cannot be deleted or changed.' });
  }
  const unique = msg.match(/UNIQUE constraint failed: (\w+)\.(\w+)/);
  if (unique) return res.status(409).json({ error: `A record with this ${unique[2]} already exists.` });
  const notNull = msg.match(/NOT NULL constraint failed: (\w+)\.(\w+)/);
  if (notNull) return res.status(400).json({ error: `Field "${notNull[2]}" is required.` });
  if (msg.includes('CHECK constraint failed')) return res.status(400).json({ error: 'Invalid value: ' + msg.replace(/^.*CHECK constraint failed:\s*/, '') });

  console.error('[api] Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
