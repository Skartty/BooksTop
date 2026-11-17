import app from './app.js';
import { initializeDatabase, eventRepository } from './database.js';

const port = Number(process.env.PORT || 3004);
const targets = {
  pedidos: process.env.ORDERS_URL || 'http://localhost:3002',
  query: process.env.QUERY_URL || 'http://localhost:3003',
  produtos: process.env.PRODUCTS_URL || 'http://localhost:3001',
};
const active = new Set();

async function deliverTo(target) {
  if (active.has(target)) return;
  active.add(target);
  try {
    for (let index = 0; index < 100; index++) {
      const delivery = eventRepository.nextDelivery(target);
      if (!delivery || (target !== 'pedidos' && delivery.ordersStatus === 'PENDING')) return;
      const { eventId, type, source, payload, createdAt, ordersResult } = delivery;
      const data = { ...JSON.parse(payload), ...JSON.parse(ordersResult ?? 'null') };
      let result = null;
      try {
        const response = await fetch(`${targets[target]}/events`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ eventId, type, source, data, createdAt }),
          signal: AbortSignal.timeout(2500),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (target === 'pedidos') result = (await response.json()).result ?? null;
      } catch (error) {
        eventRepository.markFailed(eventId, target, error.message);
        return;
      }
      eventRepository.markDelivered(eventId, target, result);
    }
  } catch (error) {
    console.error(`Falha ao atualizar entregas de ${target}.`, error);
  } finally {
    active.delete(target);
  }
}

initializeDatabase().then(() => {
  app.listen(port, () => console.log(`Event Bus disponível na porta ${port}`));
  setInterval(() => Object.keys(targets).forEach((target) => void deliverTo(target)), 600);
}).catch((error) => {
  console.error('Falha ao iniciar Event Bus.', error);
  process.exit(1);
});
