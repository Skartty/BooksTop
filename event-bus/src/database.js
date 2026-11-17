import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.EVENT_BUS_DB_PATH || path.resolve(here, '../data/event-bus.sqlite');
let SQL;
let db;

function rows(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((value) => Object.fromEntries(columns.map((column, index) => [column, value[index]])));
}

function save() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  try {
    fs.writeFileSync(databasePath + '.tmp', Buffer.from(db.export()));
    fs.renameSync(databasePath + '.tmp', databasePath);
  } catch (error) {
    db.close();
    db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
    throw error;
  }
}

function transact(write) {
  db.run('BEGIN');
  try {
    write();
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
  save();
}

export async function initializeDatabase() {
  SQL = await initSqlJs();
  db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS events (
    eventId TEXT PRIMARY KEY, type TEXT NOT NULL, source TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS deliveries (
    eventId TEXT NOT NULL, target TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
    lastError TEXT, updatedAt TEXT NOT NULL, result TEXT, PRIMARY KEY (eventId, target)
  )`);
  if (!rows(db.exec('PRAGMA table_info(deliveries)')).some(({ name }) => name === 'result')) {
    db.run('ALTER TABLE deliveries ADD COLUMN result TEXT');
  }
  db.run(`CREATE TABLE IF NOT EXISTS admin_commands (
    commandId TEXT PRIMARY KEY, type TEXT NOT NULL, produtoId NOT NULL
  )`);
  db.run('CREATE INDEX IF NOT EXISTS deliveries_pending ON deliveries (target, status, eventId)');
  save();
}

const now = () => new Date().toISOString();
const commandStatus = (status) => status === 'DELIVERED' ? 'PROCESSADO' : 'PENDENTE';

function queue(event, targets) {
  db.run('INSERT INTO events (eventId, type, source, payload, createdAt) VALUES (?, ?, ?, ?, ?)',
    [event.eventId, event.type, event.source, JSON.stringify(event.data), event.createdAt]);
  for (const target of targets) {
    db.run('INSERT INTO deliveries (eventId, target, updatedAt) VALUES (?, ?, ?)', [event.eventId, target, now()]);
  }
}

export const eventRepository = {
  exists: (eventId) => Boolean(rows(db.exec('SELECT eventId FROM events WHERE eventId = ?', [eventId]))[0]),

  add(event, targets) {
    if (!this.exists(event.eventId)) transact(() => queue(event, targets));
  },

  addCommand(command, eventType, targets) {
    transact(() => {
      queue({
        eventId: command.commandId,
        type: eventType,
        source: 'admin',
        data: { id: command.produtoId, ...command.payload },
        createdAt: command.createdAt,
      }, targets);
      db.run('INSERT INTO admin_commands (commandId, type, produtoId) VALUES (?, ?, ?)',
        [command.commandId, command.type, command.produtoId]);
    });
    return this.command(command.commandId);
  },

  command(commandId) {
    const command = rows(db.exec(`SELECT c.commandId, c.type, c.produtoId, e.payload, e.createdAt
      FROM admin_commands c JOIN events e ON e.eventId = c.commandId WHERE c.commandId = ?`, [commandId]))[0];
    if (!command) return null;
    const payload = JSON.parse(command.payload);
    delete payload.id;
    const deliveries = rows(db.exec('SELECT target, status FROM deliveries WHERE eventId = ?', [commandId]));
    return {
      ...command,
      payload,
      status: deliveries.every(({ status }) => status === 'DELIVERED') ? 'PROCESSADO' : 'PENDENTE',
      entregas: Object.fromEntries(deliveries.map(({ target, status }) => [target, commandStatus(status)])),
    };
  },

  pendingProducts: () => rows(db.exec(`SELECT DISTINCT c.produtoId FROM admin_commands c
    JOIN deliveries d ON d.eventId = c.commandId WHERE d.status = 'PENDING'`)).map(({ produtoId }) => produtoId),

  productExists(id) {
    const last = rows(db.exec(`SELECT type FROM events
      WHERE type IN ('ProdutoCriado', 'ProdutoExcluido') AND json_extract(payload, '$.id') = ?
      ORDER BY rowid DESC LIMIT 1`, [id]))[0];
    return last?.type === 'ProdutoCriado';
  },

  nextDelivery(target) {
    return rows(db.exec(`SELECT e.eventId, e.type, e.source, e.payload, e.createdAt,
      orders.status AS ordersStatus, orders.result AS ordersResult
      FROM deliveries d JOIN events e ON e.eventId = d.eventId
      LEFT JOIN deliveries orders ON orders.eventId = e.eventId AND orders.target = 'pedidos'
      WHERE d.target = ? AND d.status = 'PENDING' ORDER BY e.rowid LIMIT 1`, [target]))[0];
  },

  markDelivered(eventId, target, result = null) {
    db.run(`UPDATE deliveries SET status = 'DELIVERED', attempts = attempts + 1,
      lastError = NULL, updatedAt = ?, result = ? WHERE eventId = ? AND target = ?`,
    [now(), result && JSON.stringify(result), eventId, target]);
    save();
  },

  markFailed(eventId, target, message) {
    db.run(`UPDATE deliveries SET attempts = attempts + 1, lastError = ?, updatedAt = ?
      WHERE eventId = ? AND target = ?`, [String(message).slice(0, 300), now(), eventId, target]);
    save();
  },

  replay(target, accepts) {
    const events = rows(db.exec(`SELECT e.eventId, e.type, e.source FROM events e
      WHERE NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.eventId = e.eventId AND d.target = ?)
      ORDER BY e.rowid`, [target])).filter(accepts);
    if (events.length) transact(() => {
      for (const event of events) {
        db.run('INSERT INTO deliveries (eventId, target, updatedAt) VALUES (?, ?, ?)', [event.eventId, target, now()]);
      }
    });
    return events.length;
  },

  stats: () => rows(db.exec('SELECT status, COUNT(*) total FROM deliveries GROUP BY status')),
};
