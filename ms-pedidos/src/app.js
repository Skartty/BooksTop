import express from 'express';
import cors from 'cors';
import { ordersRepository } from './database.js';
import { getProduct } from './product-client.js';
const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/pedidos', (_req, res) => res.json(ordersRepository.all()));
app.get('/pedidos/:id', (req, res) => { const order = ordersRepository.byId(Number(req.params.id)); return order ? res.json(order) : res.status(404).json({ message: 'Pedido não encontrado.' }); });
app.post('/pedidos', async (req, res) => {
  const produtoId = Number(req.body.produtoId); const quantidade = Number(req.body.quantidade);
  if (!Number.isInteger(produtoId) || produtoId <= 0 || !Number.isInteger(quantidade) || quantidade <= 0) return res.status(400).json({ message: 'Produto e quantidade positiva são obrigatórios.' });
  try {
    const product = await getProduct(produtoId);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado.' });
    if (quantidade > product.estoque) return res.status(409).json({ message: 'Quantidade solicitada acima do estoque disponível.' });
    const precoUnitario = Number(product.preco);
    const order = ordersRepository.create({ produtoId, nomeProduto: product.nome, precoUnitario, quantidade, valorTotal: Number((precoUnitario * quantidade).toFixed(2)), dataPedido: new Date().toISOString(), status: 'REALIZADO' });
    return res.status(201).json(order);
  } catch (error) {
    if (error.code === 'PRODUCTS_SERVICE_UNAVAILABLE') return res.status(503).json({ message: 'Não foi possível validar o produto no momento.' });
    console.error(error); return res.status(500).json({ message: 'Não foi possível criar o pedido.' });
  }
});
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
export default app;
