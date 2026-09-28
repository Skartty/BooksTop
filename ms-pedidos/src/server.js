import app from './app.js';
import { initializeDatabase } from './database.js';
const port = Number(process.env.PORT || 3002);
initializeDatabase().then(() => app.listen(port, () => console.log(`MS-Pedidos disponível na porta ${port}`))).catch((error) => { console.error('Falha ao iniciar o banco de pedidos.', error); process.exit(1); });
