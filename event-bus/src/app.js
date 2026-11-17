import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { eventRepository } from './database.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const commands = {
  CriarProduto: 'ProdutoCriado',
  AtualizarProduto: 'ProdutoAtualizado',
  ExcluirProduto: 'ProdutoExcluido',
};
const productTargets = ['pedidos', 'query', 'produtos'];
const routes = new Map([
  ...Object.values(commands).map((type) => [type, productTargets]),
  ['PedidoCriado', ['query', 'produtos']],
  ['EstoqueSincronizado', ['query', 'pedidos']],
]);
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

function productIdFrom(value) {
  if (typeof value === 'string' && uuid.test(value)) return value.toLowerCase();
  const id = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)) ? Number(value) : 0;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validateProduct(body, requireStock) {
  const value = {};
  for (const field of ['nome', 'autor', 'genero', 'capa']) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return { error: 'Preencha nome, autor, gênero e imagem da capa.' };
    }
    value[field] = body[field].trim();
  }
  if (body.descricao != null && typeof body.descricao !== 'string') return { error: 'Descrição inválida.' };
  value.descricao = (body.descricao ?? '').trim();
  const price = Number(body.preco);
  if (!Number.isFinite(price) || price <= 0) return { error: 'Informe um preço válido maior que zero.' };
  value.preco = price;

  if (requireStock || Object.hasOwn(body, 'estoque')) {
    const stock = Number(body.estoque);
    if (body.estoque == null || body.estoque === '' || !Number.isSafeInteger(stock) || stock < 0) {
      return { error: 'Informe um estoque inteiro igual ou maior que zero.' };
    }
    value.estoque = stock;
  }
  return { value };
}

function validateEventData(type, data) {
  if (type === 'ProdutoCriado' || type === 'ProdutoAtualizado') {
    const id = productIdFrom(data.id);
    const { value } = validateProduct(data, true);
    return id != null && value ? { ...data, ...value, id } : null;
  }
  if (type === 'ProdutoExcluido') {
    const id = productIdFrom(data.id);
    return id != null ? { ...data, id } : null;
  }
  const produtoId = productIdFrom(data.produtoId);
  if (produtoId == null) return null;
  if (type === 'PedidoCriado' && (!Number.isSafeInteger(data.quantidade) || data.quantidade <= 0)) return null;
  if (type === 'EstoqueSincronizado' || data.versaoEstoque != null) {
    if (!Number.isSafeInteger(data.estoque) || data.estoque < 0) return null;
  }
  if (data.versaoEstoque != null && (!Number.isSafeInteger(data.versaoEstoque) || data.versaoEstoque <= 0)) return null;
  return { ...data, produtoId };
}

function registerCommand(type) {
  return (req, res) => {
    const creating = type === 'CriarProduto';
    const produtoId = creating ? null : productIdFrom(req.params.id);
    if (!creating && produtoId == null) return res.status(400).json({ message: 'ID de livro inválido.' });
    const validation = type === 'ExcluirProduto' ? { value: {} } : validateProduct(req.body ?? {}, creating);
    if (validation.error) return res.status(400).json({ message: validation.error });
    const payload = validation.value;

    const key = req.get('Idempotency-Key');
    if (key && !uuid.test(key)) return res.status(400).json({ message: 'Idempotency-Key deve ser um UUID.' });
    const commandId = key?.toLowerCase() ?? randomUUID();
    const existing = eventRepository.command(commandId);
    if (existing) {
      if (existing.type === type && (creating || existing.produtoId === produtoId)
          && JSON.stringify(existing.payload) === JSON.stringify(payload)) return res.status(202).json(existing);
      return res.status(409).json({ message: 'Esta chave já foi usada em outro comando.' });
    }
    if (eventRepository.exists(commandId)) return res.status(409).json({ message: 'Esta chave já está em uso.' });
    if (!creating && !eventRepository.productExists(produtoId)) {
      return res.status(404).json({ message: 'Livro não encontrado.' });
    }

    const command = eventRepository.addCommand({
      commandId, type, produtoId: creating ? randomUUID() : produtoId, payload, createdAt: new Date().toISOString(),
    }, commands[type], productTargets);
    return res.status(202).json(command);
  };
}

app.get('/health', (_req, res) => res.json({ status: 'ok', deliveries: eventRepository.stats() }));
app.get('/admin/sincronizacao', (_req, res) => res.json({ pendentes: eventRepository.pendingProducts() }));
app.get('/admin/comandos/:id', (req, res) => {
  const command = eventRepository.command(req.params.id);
  return command ? res.json(command) : res.status(404).json({ message: 'Comando não encontrado.' });
});
app.post('/admin/produtos', registerCommand('CriarProduto'));
app.put('/admin/produtos/:id', registerCommand('AtualizarProduto'));
app.delete('/admin/produtos/:id', registerCommand('ExcluirProduto'));

app.post('/events', (req, res) => {
  const { eventId, type, source, data, createdAt } = req.body ?? {};
  if (typeof eventId !== 'string' || !eventId || typeof source !== 'string' || !source || source === 'admin'
      || typeof createdAt !== 'string' || !createdAt || !data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ message: 'Evento inválido.' });
  }
  const targets = routes.get(type);
  if (!targets) return res.status(400).json({ message: 'Tipo de evento desconhecido.' });
  const payload = validateEventData(type, data);
  if (!payload) return res.status(400).json({ message: 'Dados do evento inválidos.' });
  // O CRUD REST também passa pelas projeções. Produtos recebe o saldo confirmado por Pedidos.
  eventRepository.add({ eventId, type, source, data: payload, createdAt },
    targets.filter((target) => target !== source || (target === 'produtos' && targets === productTargets)));
  return res.status(202).json({ eventId, accepted: true });
});

app.post('/replay/:target', (req, res) => {
  const { target } = req.params;
  if (!productTargets.includes(target)) return res.status(404).json({ message: 'Consumidor desconhecido.' });
  const queued = eventRepository.replay(target, ({ type, source }) => {
    // Eventos antigos do CRUD REST já recebidos no Bus não devem voltar ao banco de origem.
    return source !== target && routes.get(type)?.includes(target);
  });
  return res.json({ queued });
});

app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status ?? 500).json({ message: 'Não foi possível registrar a operação.' });
});
export default app;
