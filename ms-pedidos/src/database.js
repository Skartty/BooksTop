import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.ORDERS_DB_PATH || path.resolve(here, '../data/pedidos.sqlite');
let db;
function save() { fs.mkdirSync(path.dirname(databasePath), { recursive: true }); fs.writeFileSync(databasePath, Buffer.from(db.export())); }
function rows(result) { if (!result.length) return []; const { columns, values } = result[0]; return values.map((value) => Object.fromEntries(columns.map((column, index) => [column, value[index]]))); }
export async function initializeDatabase() {
  const SQL = await initSqlJs();
  db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, produtoId INTEGER NOT NULL, nomeProduto TEXT NOT NULL,
    precoUnitario REAL NOT NULL, quantidade INTEGER NOT NULL, valorTotal REAL NOT NULL,
    dataPedido TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('REALIZADO', 'CANCELADO'))
  )`);
  save();
}
export const ordersRepository = {
  all: () => rows(db.exec('SELECT * FROM pedidos ORDER BY id DESC')),
  byId: (id) => rows(db.exec('SELECT * FROM pedidos WHERE id = ?', [id]))[0],
  create: (order) => {
    db.run('INSERT INTO pedidos (produtoId, nomeProduto, precoUnitario, quantidade, valorTotal, dataPedido, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [order.produtoId, order.nomeProduto, order.precoUnitario, order.quantidade, order.valorTotal, order.dataPedido, order.status]);
    const created = rows(db.exec('SELECT * FROM pedidos WHERE id = last_insert_rowid()'))[0]; save(); return created;
  }
};
