import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initialBooks } from './books.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.PRODUCTS_DB_PATH || path.resolve(here, '../data/produtos.sqlite');
const columns = 'id,nome,autor,genero,descricao,capa,preco,estoque';
const productsTable = `CREATE TABLE IF NOT EXISTS produtos (
  id NOT NULL PRIMARY KEY, nome TEXT NOT NULL, autor TEXT NOT NULL, genero TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '', capa TEXT NOT NULL, preco REAL NOT NULL, estoque INTEGER NOT NULL,
  versaoEstoque INTEGER NOT NULL DEFAULT 0
)`;
let SQL;
let db;

function rows(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((value) => Object.fromEntries(columns.map((column, index) => [column, value[index]])));
}

function transact(write) {
  let result;
  db.run('BEGIN');
  try {
    result = write();
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
  try {
    fs.writeFileSync(databasePath + '.tmp', Buffer.from(db.export()));
    fs.renameSync(databasePath + '.tmp', databasePath);
  } catch (error) {
    db.close();
    db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
    throw error;
  }
  return result;
}

const now = () => new Date().toISOString();
const values = (product) => [
  product.nome, product.autor, product.genero, product.descricao ?? '', product.capa, product.preco, product.estoque,
];

function queueEvent(type, data) {
  db.run('INSERT INTO outbox_events (eventId,type,payload,createdAt) VALUES (?,?,?,?)',
    [randomUUID(), type, JSON.stringify(data), now()]);
}

function insertRestProduct(product) {
  db.run('UPDATE catalogo_meta SET ultimoId=ultimoId+1');
  const id = rows(db.exec('SELECT ultimoId FROM catalogo_meta'))[0].ultimoId;
  db.run(`INSERT INTO produtos (${columns}) VALUES (?,?,?,?,?,?,?,?)`, [id, ...values(product)]);
  const created = productsRepository.byId(id);
  queueEvent('ProdutoCriado', created);
  return created;
}

export async function initializeDatabase() {
  SQL = await initSqlJs();
  db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  transact(() => {
    db.run(productsTable);
    db.run(`CREATE TABLE IF NOT EXISTS catalogo_meta (
      id INTEGER PRIMARY KEY CHECK (id=1), ultimoId INTEGER NOT NULL
    )`);
    const legacySchema = !rows(db.exec('PRAGMA table_info(produtos)')).some(({ name }) => name === 'versaoEstoque');
    if (legacySchema) {
      const sequence = rows(db.exec("SELECT seq FROM sqlite_sequence WHERE name='produtos'"))[0]?.seq ?? 0;
      db.run('ALTER TABLE produtos RENAME TO produtos_antigos');
      db.run(productsTable);
      db.run(`INSERT INTO produtos (${columns}) SELECT ${columns} FROM produtos_antigos`);
      db.run('DROP TABLE produtos_antigos');
      db.run('INSERT INTO catalogo_meta (id,ultimoId) VALUES (1,?)', [sequence]);
    }
    db.run('CREATE TABLE IF NOT EXISTS processed_events (eventId TEXT PRIMARY KEY, processedAt TEXT NOT NULL)');
    db.run(`CREATE TABLE IF NOT EXISTS outbox_events (
      eventId TEXT PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL, sentAt TEXT
    )`);
    if (!rows(db.exec('SELECT id FROM catalogo_meta')).length) {
      db.run('INSERT INTO catalogo_meta (id,ultimoId) VALUES (1,0)');
      for (const book of initialBooks) insertRestProduct(book);
    }
  });
}

function applyProduct(product) {
  if (product.aplicado === false) return;
  db.run(`INSERT INTO produtos (${columns},versaoEstoque) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, autor=excluded.autor, genero=excluded.genero,
    descricao=excluded.descricao, capa=excluded.capa, preco=excluded.preco,
    estoque=CASE WHEN excluded.versaoEstoque >= produtos.versaoEstoque THEN excluded.estoque ELSE produtos.estoque END,
    versaoEstoque=MAX(produtos.versaoEstoque,excluded.versaoEstoque)`,
  [product.id, ...values(product), product.versaoEstoque ?? 0]);
}

function applyOrder(order) {
  if (Number.isSafeInteger(order.versaoEstoque)) {
    db.run('UPDATE produtos SET estoque=?, versaoEstoque=? WHERE id=? AND versaoEstoque<?',
      [order.estoque, order.versaoEstoque, order.produtoId, order.versaoEstoque]);
  } else {
    db.run('UPDATE produtos SET estoque=MAX(0,estoque-?) WHERE id=? AND versaoEstoque=0',
      [order.quantidade, order.produtoId]);
  }
}

export const productsRepository = {
  all: () => rows(db.exec(`SELECT ${columns} FROM produtos ORDER BY id`)),
  byId: (id) => rows(db.exec(`SELECT ${columns} FROM produtos WHERE id=?`, [id]))[0],
  create: (product) => transact(() => insertRestProduct(product)),

  update(id, product) {
    if (!this.byId(id)) return null;
    return transact(() => {
      db.run('UPDATE produtos SET nome=?,autor=?,genero=?,descricao=?,capa=?,preco=?,estoque=? WHERE id=?',
        [...values(product), id]);
      const updated = this.byId(id);
      queueEvent('ProdutoAtualizado', updated);
      return updated;
    });
  },

  remove(id) {
    const current = this.byId(id);
    if (!current) return null;
    return transact(() => {
      db.run('DELETE FROM produtos WHERE id=?', [id]);
      queueEvent('ProdutoExcluido', { id, nome: current.nome });
      return current;
    });
  },

  processEvent(event) {
    if (rows(db.exec('SELECT eventId FROM processed_events WHERE eventId=?', [event.eventId]))[0]) return false;
    const product = event.data;
    transact(() => {
      if (event.type === 'ProdutoCriado' || event.type === 'ProdutoAtualizado') {
        applyProduct(product);
      } else if (event.type === 'ProdutoExcluido') {
        db.run('DELETE FROM produtos WHERE id=?', [product.id]);
      } else if (event.type === 'PedidoCriado') {
        applyOrder(product);
      }
      db.run('INSERT INTO processed_events (eventId,processedAt) VALUES (?,?)', [event.eventId, now()]);
    });
    return true;
  },

  pendingOutbox: () => rows(db.exec('SELECT * FROM outbox_events WHERE sentAt IS NULL ORDER BY rowid LIMIT 100')),
  markOutboxSent: (eventId) => transact(() => db.run('UPDATE outbox_events SET sentAt=? WHERE eventId=?', [now(), eventId])),
};
