import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.join(os.tmpdir(), `bookstop-orders-${process.pid}.sqlite`);
process.env.ORDERS_DB_PATH = dbPath;

const { initializeDatabase, ordersRepository } = await import('../src/database.js');
await initializeDatabase();

function registerProduct(id) {
  ordersRepository.processEvent({
    eventId: 'produto-' + id,
    type: 'ProdutoCriado',
    data: { id, nome: 'Livro', preco: 20, estoque: 5 },
  });
}

test('pedido usa cópia local e reduz estoque', () => {
  registerProduct(1);
  const { order } = ordersRepository.createFromLocal(1, 2);
  assert.equal(order.nomeProduto, 'Livro');
  assert.equal(order.valorTotal, 40);
  assert.equal(ordersRepository.localProduct(1).estoque, 3);
});

test('reentrega devolve o saldo original sem sobrescrever compras posteriores', () => {
  registerProduct(2);
  ordersRepository.createFromLocal(2, 2);

  const update = { eventId: 'edit-2', type: 'ProdutoAtualizado', data: { id: 2, nome: 'Livro', preco: 25 } };
  const receipt = ordersRepository.processEvent(update);
  assert.equal(receipt.estoque, 3);

  ordersRepository.createFromLocal(2, 2);
  assert.deepEqual(ordersRepository.processEvent(update), receipt);
  ordersRepository.processEvent({ eventId: 'sync-2', type: 'EstoqueSincronizado', data: { produtoId: 2, estoque: 3 } });
  assert.equal(ordersRepository.localProduct(2).estoque, 1);
});

test.after(() => fs.rmSync(dbPath, { force: true }));
