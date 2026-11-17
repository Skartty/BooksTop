import app from './app.js';
import { initializeDatabase, ordersRepository } from './database.js';

const port = Number(process.env.PORT || 3002);
const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:3004';
let sending = false;

async function flushOutbox() {
  if (sending) return;
  sending = true;
  try {
    for (const { eventId, type, payload, createdAt } of ordersRepository.pendingOutbox()) {
      const event = { eventId, type, source: 'pedidos', data: JSON.parse(payload), createdAt };
      try {
        const response = await fetch(`${eventBusUrl}/events`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(2000),
        });
        if (!response.ok) return;
      } catch {
        return;
      }
      ordersRepository.markOutboxSent(eventId);
    }
  } catch (error) {
    console.error('Falha ao persistir o estado da caixa de saída.', error);
  } finally {
    sending = false;
  }
}

async function replay() {
  await fetch(`${eventBusUrl}/replay/pedidos`, {
    method: 'POST',
    signal: AbortSignal.timeout(2000),
  }).catch(() => {});
}

initializeDatabase().then(() => {
  app.listen(port, () => console.log(`MS-Pedidos disponível na porta ${port}`));
  setTimeout(flushOutbox, 300);
  setInterval(flushOutbox, 1200);
  setTimeout(replay, 1000);
  setInterval(replay, 15000);
}).catch((error) => {
  console.error('Falha ao iniciar MS-Pedidos.', error);
  process.exit(1);
});
