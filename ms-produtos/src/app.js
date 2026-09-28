import express from 'express';
import cors from 'cors';
import { productsRepository } from './database.js';

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

function validateProduct(body) {
  const requiredText = ['nome', 'autor', 'genero', 'descricao', 'capa'];
  if (requiredText.some((field) => typeof body[field] !== 'string' || !body[field].trim())) return 'Preencha todos os campos de texto obrigatórios.';
  if (!Number.isFinite(Number(body.preco)) || Number(body.preco) <= 0) return 'Informe um preço válido maior que zero.';
  if (!Number.isInteger(Number(body.estoque)) || Number(body.estoque) < 0) return 'Informe um estoque inteiro igual ou maior que zero.';
  return null;
}
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/produtos', (_req, res) => res.json(productsRepository.all()));
app.get('/produtos/:id', (req, res) => {
  const product = productsRepository.byId(Number(req.params.id));
  if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
  return res.json(product);
});
app.post('/produtos', (req, res) => {
  const validationError = validateProduct(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const product = productsRepository.create({
    ...req.body,
    nome: req.body.nome.trim(), autor: req.body.autor.trim(), genero: req.body.genero.trim(), descricao: req.body.descricao.trim(), capa: req.body.capa.trim(),
    preco: Number(req.body.preco), estoque: Number(req.body.estoque)
  });
  return res.status(201).json(product);
});
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: 'Não foi possível concluir esta operação.' }); });
export default app;
