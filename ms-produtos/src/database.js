import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialBooks } from './books.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.PRODUCTS_DB_PATH || path.resolve(here, '../data/produtos.sqlite');
let db;

function save() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, Buffer.from(db.export()));
}

export async function initializeDatabase() {
  const SQL = await initSqlJs();
  db = fs.existsSync(databasePath) ? new SQL.Database(fs.readFileSync(databasePath)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, autor TEXT NOT NULL,
    genero TEXT NOT NULL, descricao TEXT NOT NULL, capa TEXT NOT NULL,
    preco REAL NOT NULL, estoque INTEGER NOT NULL
  )`);
  const count = db.exec('SELECT COUNT(*) AS total FROM produtos')[0]?.values[0][0] || 0;
  if (!count) {
    const statement = db.prepare('INSERT INTO produtos (nome, autor, genero, descricao, capa, preco, estoque) VALUES (?, ?, ?, ?, ?, ?, ?)');
    initialBooks.forEach((book) => statement.run([book.nome, book.autor, book.genero, book.descricao, book.capa, book.preco, book.estoque]));
    statement.free();
  }
  save();
}

function rows(result) {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((value) => Object.fromEntries(columns.map((column, index) => [column, value[index]])));
}
export const productsRepository = {
  all: () => rows(db.exec('SELECT * FROM produtos ORDER BY id')),
  byId: (id) => rows(db.exec('SELECT * FROM produtos WHERE id = ?', [id]))[0],
  create: (product) => {
    db.run('INSERT INTO produtos (nome, autor, genero, descricao, capa, preco, estoque) VALUES (?, ?, ?, ?, ?, ?, ?)', [product.nome, product.autor, product.genero, product.descricao, product.capa, product.preco, product.estoque]);
    const created = rows(db.exec('SELECT * FROM produtos WHERE id = last_insert_rowid()'))[0];
    save();
    return created;
  }
};
