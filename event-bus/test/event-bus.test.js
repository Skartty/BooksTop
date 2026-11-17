import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.join(os.tmpdir(), `bookstop-eventbus-${process.pid}.sqlite`);
process.env.EVENT_BUS_DB_PATH = dbPath;

const { initializeDatabase, eventRepository } = await import('../src/database.js');
await initializeDatabase();

test('Event Bus persiste entregas pendentes sem duplicar evento', () => {
  const event = {
    eventId: 'bus-1',
    type: 'PedidoCriado',
    source: 'pedidos',
    data: { produtoId: 1, quantidade: 1 },
    createdAt: new Date().toISOString(),
  };
  eventRepository.add(event, ['query', 'produtos']);
  eventRepository.add(event, ['query', 'produtos']);

  assert.equal(eventRepository.nextDelivery('query').eventId, event.eventId);
  assert.equal(eventRepository.nextDelivery('produtos').eventId, event.eventId);
  assert.deepEqual(eventRepository.stats(), [{ status: 'PENDING', total: 2 }]);

  eventRepository.markDelivered(event.eventId, 'query');
  assert.equal(eventRepository.nextDelivery('query'), undefined);
  assert.equal(eventRepository.nextDelivery('produtos').eventId, event.eventId);
});

test.after(() => fs.rmSync(dbPath, { force: true }));
