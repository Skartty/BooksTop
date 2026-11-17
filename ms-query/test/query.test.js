import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.join(os.tmpdir(), `bookstop-query-${process.pid}.sqlite`);
process.env.QUERY_DB_PATH = dbPath;

const { initializeDatabase, queryRepository } = await import('../src/database.js');
await initializeDatabase();

test('projeção recebe produtos e pedido de forma idempotente', () => {
  queryRepository.processEvent({
    eventId: 'q-create',
    type: 'ProdutoCriado',
    data: { id: 1, nome: 'Livro', autor: 'Autor', genero: 'Ficção', capa: 'https://example.com/capa.jpg', preco: 10, estoque: 5 },
  });
  const order = { eventId: 'q-order', type: 'PedidoCriado', data: { produtoId: 1, quantidade: 2 } };
  queryRepository.processEvent(order);
  queryRepository.processEvent(order);
  assert.equal(queryRepository.byId(1).estoque, 3);
});

test.after(() => fs.rmSync(dbPath, { force: true }));
