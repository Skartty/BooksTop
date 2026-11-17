import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.join(os.tmpdir(), `bookstop-products-${process.pid}.sqlite`);
process.env.PRODUCTS_DB_PATH = dbPath;

const { initializeDatabase, productsRepository } = await import('../src/database.js');
await initializeDatabase();

test('carga inicial e CRUD completo de produtos', () => {
  assert.equal(productsRepository.all().length, 24);
  const product = productsRepository.create({
    nome: 'Teste',
    autor: 'Autor',
    genero: 'Ficção',
    capa: 'https://example.com/capa.jpg',
    preco: 10,
    estoque: 3,
  });
  assert.equal(product.descricao, '');

  const updated = productsRepository.update(product.id, { ...product, nome: 'Editado', preco: 12 });
  assert.equal(updated.nome, 'Editado');
  assert.equal(productsRepository.remove(product.id).id, product.id);
  assert.equal(productsRepository.byId(product.id), undefined);
});

test('PedidoCriado é idempotente no estoque oficial', () => {
  const before = productsRepository.byId(1).estoque;
  const event = {
    eventId: 'evt-idempotente-produtos',
    type: 'PedidoCriado',
    data: { produtoId: 1, quantidade: 1 },
  };
  productsRepository.processEvent(event);
  productsRepository.processEvent(event);
  assert.equal(productsRepository.byId(1).estoque, before - 1);
});

test.after(() => fs.rmSync(dbPath, { force: true }));
