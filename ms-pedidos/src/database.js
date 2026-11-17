import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.ORDERS_DB_PATH || path.resolve(here, '../data/pedidos.sqlite');
const localProductsTable = `CREATE TABLE IF NOT EXISTS produtos_local (
  produtoId NOT NULL PRIMARY KEY, nome TEXT NOT NULL, preco REAL NOT NULL, estoque INTEGER NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1, versaoEstoque INTEGER NOT NULL DEFAULT 0
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

export async function initializeDatabase() {
  SQL = await initSqlJs();
  db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  transact(() => {
    // A afinidade INTEGER dos pedidos antigos também aceita UUIDs como texto.
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT, produtoId NOT NULL, nomeProduto TEXT NOT NULL,
      precoUnitario REAL NOT NULL, quantidade INTEGER NOT NULL, valorTotal REAL NOT NULL,
      dataPedido TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('REALIZADO','CANCELADO'))
    )`);
    db.run(localProductsTable);
    const columns = rows(db.exec('PRAGMA table_info(produtos_local)'));
    if (!columns.some(({ name }) => name === 'versaoEstoque')) {
      db.run('ALTER TABLE produtos_local RENAME TO produtos_local_antigos');
      db.run(localProductsTable);
      db.run(`INSERT INTO produtos_local (produtoId,nome,preco,estoque,ativo)
        SELECT produtoId,nome,preco,estoque,ativo FROM produtos_local_antigos`);
      db.run('DROP TABLE produtos_local_antigos');
    }
    db.run('CREATE TABLE IF NOT EXISTS processed_events (eventId TEXT PRIMARY KEY, processedAt TEXT NOT NULL, result TEXT)');
    if (!rows(db.exec('PRAGMA table_info(processed_events)')).some(({ name }) => name === 'result')) {
      db.run('ALTER TABLE processed_events ADD COLUMN result TEXT');
    }
    db.run(`CREATE TABLE IF NOT EXISTS outbox_events (
      eventId TEXT PRIMARY KEY, type TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL, sentAt TEXT
    )`);
  });
}

function applyProduct(product, creating) {
  const previous = ordersRepository.localProduct(product.id);
  if (!creating && !previous?.ativo) return { aplicado: false };
  const estoque = product.estoque ?? previous?.estoque;
  const versaoEstoque = (previous?.versaoEstoque ?? 0) + 1;
  db.run(`INSERT INTO produtos_local (produtoId,nome,preco,estoque,ativo,versaoEstoque) VALUES (?,?,?,?,1,?)
    ON CONFLICT(produtoId) DO UPDATE SET nome=excluded.nome, preco=excluded.preco,
    estoque=excluded.estoque, ativo=1, versaoEstoque=excluded.versaoEstoque`,
  [product.id, product.nome, product.preco, estoque, versaoEstoque]);
  return { estoque, versaoEstoque };
}

export const ordersRepository = {
  all: () => rows(db.exec('SELECT * FROM pedidos ORDER BY id DESC')),
  byId: (id) => rows(db.exec('SELECT * FROM pedidos WHERE id=?', [id]))[0],
  localProduct: (id) => rows(db.exec('SELECT * FROM produtos_local WHERE produtoId=?', [id]))[0],

  createFromLocal(produtoId, quantidade) {
    const product = this.localProduct(produtoId);
    if (!product?.ativo) return { error: 'NOT_FOUND' };
    if (quantidade > product.estoque) return { error: 'OUT_OF_STOCK' };
    const { preco: precoUnitario, nome: nomeProduto } = product;
    const estoque = product.estoque - quantidade;
    const versaoEstoque = product.versaoEstoque + 1;
    const dataPedido = now();
    return transact(() => {
      db.run('UPDATE produtos_local SET estoque=?, versaoEstoque=? WHERE produtoId=?', [estoque, versaoEstoque, produtoId]);
      db.run(`INSERT INTO pedidos (produtoId,nomeProduto,precoUnitario,quantidade,valorTotal,dataPedido,status)
        VALUES (?,?,?,?,?,?,?)`,
      [produtoId, nomeProduto, precoUnitario, quantidade, Number((precoUnitario * quantidade).toFixed(2)), dataPedido, 'REALIZADO']);
      const order = rows(db.exec('SELECT * FROM pedidos WHERE id=last_insert_rowid()'))[0];
      const data = { pedidoId: order.id, produtoId, quantidade, dataPedido, estoque, versaoEstoque };
      db.run(`INSERT INTO outbox_events (eventId,type,payload,createdAt) VALUES (?,?,?,?)`,
        [randomUUID(), 'PedidoCriado', JSON.stringify(data), now()]);
      return { order };
    });
  },

  processEvent(event) {
    const previous = rows(db.exec('SELECT result FROM processed_events WHERE eventId=?', [event.eventId]))[0];
    if (previous) return JSON.parse(previous.result ?? 'null');
    const product = event.data;
    return transact(() => {
      let result = null;
      if (event.type === 'ProdutoCriado' || event.type === 'ProdutoAtualizado') {
        result = applyProduct(product, event.type === 'ProdutoCriado');
      } else if (event.type === 'ProdutoExcluido') {
        db.run('UPDATE produtos_local SET ativo=0 WHERE produtoId=?', [product.id]);
      } else if (event.type === 'EstoqueSincronizado') {
        // Compatibilidade com eventos do formato anterior que ainda estejam pendentes.
        db.run('UPDATE produtos_local SET estoque=? WHERE produtoId=? AND versaoEstoque=0', [product.estoque, product.produtoId]);
      }
      db.run('INSERT INTO processed_events (eventId,processedAt,result) VALUES (?,?,?)',
        [event.eventId, now(), result && JSON.stringify(result)]);
      return result;
    });
  },

  pendingOutbox: () => rows(db.exec('SELECT * FROM outbox_events WHERE sentAt IS NULL ORDER BY rowid LIMIT 100')),
  markOutboxSent: (eventId) => transact(() => db.run('UPDATE outbox_events SET sentAt=? WHERE eventId=?', [now(), eventId])),
};
