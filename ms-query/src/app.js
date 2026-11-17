import express from 'express';
import cors from 'cors';
import { queryRepository } from './database.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/produtos', (_req, res) => res.json(queryRepository.all()));
app.get('/produtos/:id', (req, res) => {
  const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : req.params.id.toLowerCase();
  const product = queryRepository.byId(id);
  return product ? res.json(product) : res.status(404).json({ message: 'Produto não encontrado.' });
});
app.post('/events', (req, res) => {
  if (!req.body?.eventId || !req.body.data) return res.status(400).json({ message: 'Evento inválido.' });
  queryRepository.processEvent(req.body);
  return res.json({ processed: true });
});
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status ?? 500).json({ message: 'Não foi possível concluir a operação.' });
});
export default app;
