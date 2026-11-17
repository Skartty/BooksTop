import express from 'express';
import cors from 'cors';
import { productsRepository } from './database.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins }));
app.use('/events', express.json({ limit: '2mb' }));
app.use(express.json());

const productIdFrom = (value) => /^\d+$/.test(value) ? Number(value) : value.toLowerCase();

function normalizeAndValidate(body) {
  const value = {};
  for (const field of ['nome', 'autor', 'genero', 'capa']) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return { error: 'Preencha nome, autor, gênero e imagem da capa.' };
    }
    value[field] = body[field].trim();
  }
  if (body.descricao != null && typeof body.descricao !== 'string') return { error: 'Descrição inválida.' };
  value.descricao = (body.descricao ?? '').trim();
  value.preco = Number(body.preco);
  if (!Number.isFinite(value.preco) || value.preco <= 0) return { error: 'Informe um preço válido maior que zero.' };
  value.estoque = Number(body.estoque);
  if (body.estoque == null || body.estoque === '' || !Number.isSafeInteger(value.estoque) || value.estoque < 0) {
    return { error: 'Informe um estoque inteiro igual ou maior que zero.' };
  }
  return { value };
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/produtos', (_req, res) => res.json(productsRepository.all()));
app.get('/produtos/:id', (req, res) => {
  const product = productsRepository.byId(productIdFrom(req.params.id));
  return product ? res.json(product) : res.status(404).json({ message: 'Produto não encontrado.' });
});
app.post('/produtos', (req, res) => {
  const { value, error } = normalizeAndValidate(req.body ?? {});
  if (error) return res.status(400).json({ message: error });
  return res.status(201).json(productsRepository.create(value));
});
app.put('/produtos/:id', (req, res) => {
  const { value, error } = normalizeAndValidate(req.body ?? {});
  if (error) return res.status(400).json({ message: error });
  const product = productsRepository.update(productIdFrom(req.params.id), value);
  return product ? res.json(product) : res.status(404).json({ message: 'Produto não encontrado.' });
});
app.delete('/produtos/:id', (req, res) => {
  const product = productsRepository.remove(productIdFrom(req.params.id));
  return product ? res.status(204).send() : res.status(404).json({ message: 'Produto não encontrado.' });
});
app.post('/events', (req, res) => {
  if (!req.body?.eventId || !req.body.data) return res.status(400).json({ message: 'Evento inválido.' });
  const processed = productsRepository.processEvent(req.body);
  return res.json({ processed });
});
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status ?? 500).json({ message: 'Não foi possível concluir a operação.' });
});
export default app;
