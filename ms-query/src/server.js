import app from './app.js';
import { initializeDatabase } from './database.js';

const port = Number(process.env.PORT || 3003);
const eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:3004';

async function replay() {
  await fetch(`${eventBusUrl}/replay/query`, {
    method: 'POST',
    signal: AbortSignal.timeout(2000),
  }).catch(() => {});
}

initializeDatabase().then(() => {
  app.listen(port, () => console.log(`MS-Query disponível na porta ${port}`));
  setTimeout(replay, 1000);
  setInterval(replay, 15000);
}).catch((error) => {
  console.error('Falha ao iniciar MS-Query.', error);
  process.exit(1);
});
