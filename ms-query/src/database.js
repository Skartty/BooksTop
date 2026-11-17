import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.QUERY_DB_PATH || path.resolve(here, '../data/query.sqlite');
const columns = 'id,nome,autor,genero,descricao,capa,preco,estoque';
const productsTable = `CREATE TABLE IF NOT EXISTS produtos (
  id NOT NULL PRIMARY KEY, nome TEXT NOT NULL, autor TEXT NOT NULL, genero TEXT NOT NULL, descricao TEXT NOT NULL,
  capa TEXT NOT NULL, preco REAL NOT NULL, estoque INTEGER NOT NULL, ativo INTEGER NOT NULL DEFAULT 1,
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
  db.run('BEGIN');
  try {
    write();
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
}

export async function initializeDatabase() {
  SQL = await initSqlJs();
  db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  transact(() => {
    db.run(productsTable);
    if (!rows(db.exec('PRAGMA table_info(produtos)')).some(({ name }) => name === 'versaoEstoque')) {
      db.run('ALTER TABLE produtos RENAME TO produtos_antigos');
      db.run(productsTable);
      db.run(`INSERT INTO produtos (${columns},ativo) SELECT ${columns},ativo FROM produtos_antigos`);
      db.run('DROP TABLE produtos_antigos');
    }
    db.run('CREATE TABLE IF NOT EXISTS processed_events (eventId TEXT PRIMARY KEY, processedAt TEXT NOT NULL)');
  });
}

function projectProduct(product) {
  if (product.aplicado === false) return;
  db.run(`INSERT INTO produtos (${columns},ativo,versaoEstoque) VALUES (?,?,?,?,?,?,?,?,1,?)
    ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, autor=excluded.autor, genero=excluded.genero,
    descricao=excluded.descricao, capa=excluded.capa, preco=excluded.preco, ativo=1,
    estoque=CASE WHEN excluded.versaoEstoque >= produtos.versaoEstoque THEN excluded.estoque ELSE produtos.estoque END,
    versaoEstoque=MAX(produtos.versaoEstoque,excluded.versaoEstoque)`,
  [product.id, product.nome, product.autor, product.genero, product.descricao ?? '', product.capa, product.preco,
    product.estoque, product.versaoEstoque ?? 0]);
}

function projectOrder(order) {
  if (Number.isSafeInteger(order.versaoEstoque)) {
    db.run('UPDATE produtos SET estoque=?, versaoEstoque=? WHERE id=? AND versaoEstoque<?',
      [order.estoque, order.versaoEstoque, order.produtoId, order.versaoEstoque]);
  } else {
    db.run('UPDATE produtos SET estoque=MAX(0,estoque-?) WHERE id=? AND versaoEstoque=0',
      [order.quantidade, order.produtoId]);
  }
}

export const queryRepository = {
  all: () => rows(db.exec(`SELECT ${columns} FROM produtos WHERE ativo=1 ORDER BY id`)),
  byId: (id) => rows(db.exec(`SELECT ${columns} FROM produtos WHERE id=? AND ativo=1`, [id]))[0],

  processEvent(event) {
    if (rows(db.exec('SELECT eventId FROM processed_events WHERE eventId=?', [event.eventId]))[0]) return false;
    const product = event.data;
    transact(() => {
      if (event.type === 'ProdutoCriado' || event.type === 'ProdutoAtualizado') {
        projectProduct(product);
      } else if (event.type === 'ProdutoExcluido') {
        db.run('UPDATE produtos SET ativo=0 WHERE id=?', [product.id]);
      } else if (event.type === 'PedidoCriado') {
        projectOrder(product);
      } else if (event.type === 'EstoqueSincronizado') {
        db.run('UPDATE produtos SET estoque=? WHERE id=? AND versaoEstoque=0', [product.estoque, product.produtoId]);
      }
      db.run('INSERT INTO processed_events (eventId,processedAt) VALUES (?,?)', [event.eventId, new Date().toISOString()]);
    });
    return true;
  },
};
