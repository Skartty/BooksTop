import app from './app.js';
import { initializeDatabase } from './database.js';
const port = Number(process.env.PORT || 3001);
initializeDatabase().then(() => app.listen(port, () => console.log(`MS-Produtos disponível na porta ${port}`))).catch((error) => { console.error('Falha ao iniciar o banco de produtos.', error); process.exit(1); });
