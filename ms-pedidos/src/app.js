import express from 'express';
import cors from 'cors';
import { ordersRepository } from './database.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
app.use(cors({ origin: allowedOrigins }));
app.use('/events', express.json({ limit: '2mb' }));
app.use(express.json());

function productIdFrom(value) {
  if (typeof value === 'string' && uuid.test(value)) return value.toLowerCase();
  const id = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)) ? Number(value) : 0;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/pedidos', (_req, res) => res.json(ordersRepository.all()));
app.get('/pedidos/:id', (req, res) => {
  const order = ordersRepository.byId(Number(req.params.id));
  return order ? res.json(order) : res.status(404).json({ message: 'Pedido não encontrado.' });
});
app.post('/pedidos', (req, res) => {
  const produtoId = productIdFrom(req.body?.produtoId);
  const quantidade = Number(req.body?.quantidade);
  if (produtoId == null || !Number.isSafeInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ message: 'Produto e quantidade positiva são obrigatórios.' });
  }
  const result = ordersRepository.createFromLocal(produtoId, quantidade);
  if (result.error === 'NOT_FOUND') return res.status(404).json({ message: 'Produto não encontrado ou indisponível.' });
  if (result.error === 'OUT_OF_STOCK') return res.status(409).json({ message: 'Estoque insuficiente.' });
  return res.status(201).json(result.order);
});
app.post('/events', (req, res) => {
  if (!req.body?.eventId || !req.body.data) return res.status(400).json({ message: 'Evento inválido.' });
  const result = ordersRepository.processEvent(req.body);
  return res.json({ processed: true, result });
});
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status ?? 500).json({ message: 'Não foi possível concluir a operação.' });
});
export default app;
