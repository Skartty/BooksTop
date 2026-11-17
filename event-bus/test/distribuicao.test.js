import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const services = {
  bus: ['event-bus', 'EVENT_BUS_DB_PATH'],
  produtos: ['ms-produtos', 'PRODUCTS_DB_PATH'],
  pedidos: ['ms-pedidos', 'ORDERS_DB_PATH'],
  query: ['ms-query', 'QUERY_DB_PATH'],
};

const book = {
  nome: 'Caderno de outono', autor: 'Lia Dias', genero: 'Ficção',
  capa: 'https://example.com/outono.jpg', descricao: '', preco: 39.90, estoque: 5,
};

async function until(label, check) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await sleep(125);
  }
  assert.fail('Tempo esgotado: ' + label);
}

async function freePort() {
  const server = net.createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  server.close();
  await once(server, 'close');
  return port;
}

async function createStack(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bookstop-distribuicao-'));
  const ports = {};
  const children = new Map();
  const addresses = {};
  for (const name of Object.keys(services)) {
    ports[name] = await freePort();
    addresses[name] = 'http://127.0.0.1:' + ports[name];
  }

  async function stop(name) {
    const child = children.get(name);
    if (!child) return;
    if (child.exitCode === null && child.signalCode === null && child.pid) {
      const closed = once(child, 'close');
      child.kill();
      await closed;
    }
    children.delete(name);
  }

  t.after(async () => {
    for (const name of children.keys()) await stop(name);
    for (const name of await fs.readdir(dir)) await fs.unlink(path.join(dir, name));
    await fs.rmdir(dir);
  });

  async function start(name) {
    const [workspace, dbVar] = services[name];
    const entry = fileURLToPath(new URL('../../' + workspace + '/src/server.js', import.meta.url));
    const child = spawn(process.execPath, [entry], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
      env: {
        ...process.env,
        PORT: String(ports[name]),
        [dbVar]: path.join(dir, name + '.sqlite'),
        EVENT_BUS_URL: addresses.bus,
        PRODUCTS_URL: addresses.produtos,
        ORDERS_URL: addresses.pedidos,
        QUERY_URL: addresses.query,
      },
    });
    children.set(name, child);
    let diagnostic = '';
    child.stderr.on('data', (chunk) => { diagnostic += chunk; });
    child.on('error', (error) => { diagnostic += error.message; });
    await until(name + ' pronto', async () => {
      assert.equal(child.exitCode, null, diagnostic);
      assert.ok(child.pid, diagnostic);
      const response = await fetch(addresses[name] + '/health', { signal: AbortSignal.timeout(1000) }).catch(() => null);
      return response?.ok;
    });
  }

  async function request(name, resource, { method = 'GET', body, key, status = 200 } = {}) {
    const response = await fetch(addresses[name] + resource, {
      method,
      headers: {
        ...(body && { 'content-type': 'application/json' }),
        ...(key && { 'Idempotency-Key': key }),
      },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    const data = response.status === 204 ? null : await response.json();
    assert.equal(response.status, status, method + ' ' + resource + ' ' + JSON.stringify(data));
    return data;
  }

  for (const name of Object.keys(services)) await start(name);
  await until('carga inicial projetada', async () => (await request('query', '/produtos')).length === 24);
  return { request, start, stop };
}

test('CRUD administrativo converge após reconexão, sem alterar pedidos anteriores', { timeout: 50000 }, async (t) => {
  const { request, start, stop } = await createStack(t);
  const admin = '/admin/produtos';
  const product = (id) => '/produtos/' + id;
  const command = ({ commandId }) => request('bus', '/admin/comandos/' + commandId);
  const sync = (name, item) => until(name, async () => {
    const state = await command(item);
    return state.status === 'PROCESSADO' && state;
  });
  const project = (item) => until('projeções do comando ' + item.type, async () => {
    const state = await command(item);
    return state.entregas.query === 'PROCESSADO' && state.entregas.pedidos === 'PROCESSADO' && state;
  });
  const buy = (id, quantidade, status = 201) => request('pedidos', '/pedidos', {
    method: 'POST', body: { produtoId: id, quantidade }, status,
  });

  await request('bus', '/events', {
    method: 'POST', status: 400,
    body: { eventId: randomUUID(), type: 'ProdutoCriado', source: 'produtos', createdAt: new Date().toISOString(), data: { id: 100 } },
  });
  const longDescription = 'Descrição de exemplo para o volume. '.repeat(3000).trimEnd();
  const online = await request('bus', admin, { method: 'POST', body: { ...book, descricao: longDescription }, status: 202 });
  await sync('criação online', online);
  assert.equal((await request('produtos', product(online.produtoId))).id, online.produtoId);
  assert.ok((await request('query', product(online.produtoId))).descricao === longDescription,
    'A descrição deve chegar inteira ao catálogo.');
  const onlineEdit = await request('bus', admin + '/' + online.produtoId, {
    method: 'PUT', body: { ...book, nome: 'Caderno da primavera' }, status: 202,
  });
  await sync('edição online', onlineEdit);
  assert.equal((await request('query', product(online.produtoId))).nome, 'Caderno da primavera');
  const onlineDelete = await request('bus', admin + '/' + online.produtoId, { method: 'DELETE', status: 202 });
  await sync('exclusão online', onlineDelete);
  await request('query', product(online.produtoId), { status: 404 });

  const rest = await request('produtos', '/produtos', { method: 'POST', body: book, status: 201 });
  assert.equal(typeof rest.id, 'number');
  await until('criação REST projetada', async () => (await request('query', '/produtos')).some(({ id }) => id === rest.id));
  const restUpdate = await request('produtos', product(rest.id), { method: 'PUT', body: { ...book, estoque: 6 } });
  assert.equal(restUpdate.estoque, 6);
  assert.equal((await request('produtos', product(rest.id))).id, rest.id);
  assert.ok((await request('produtos', '/produtos')).some(({ id }) => id === rest.id));
  await until('edição REST projetada', async () => (await request('query', product(rest.id))).estoque === 6);
  await request('produtos', product(rest.id), { method: 'DELETE', status: 204 });
  await until('exclusão REST projetada', async () => !(await request('query', '/produtos')).some(({ id }) => id === rest.id));

  const seedOrder = await buy(2, 1);
  await stop('produtos');
  assert.equal((await request('query', product(1))).id, 1);
  const newKey = randomUUID();
  const options = { method: 'POST', body: book, key: newKey, status: 202 };
  const create = await request('bus', admin, options);
  assert.match(create.produtoId, /^[\da-f-]{36}$/);
  const duplicate = await request('bus', admin, options);
  assert.equal(duplicate.produtoId, create.produtoId);
  assert.equal(duplicate.commandId, create.commandId);
  await request('bus', admin, { ...options, body: { ...book, preco: 59.90 }, status: 409 });
  const id = create.produtoId;
  const pending = await project(create);
  assert.equal(pending.status, 'PENDENTE');
  assert.equal(pending.entregas.produtos, 'PENDENTE');
  assert.ok((await request('bus', '/admin/sincronizacao')).pendentes.includes(id));
  assert.equal((await request('query', product(id))).estoque, 5);

  const order = await buy(id, 2);
  assert.equal(order.nomeProduto, book.nome);
  assert.equal(order.precoUnitario, book.preco);
  assert.equal(order.valorTotal, 79.80);
  const metadata = { ...book };
  delete metadata.estoque;
  const edit = await request('bus', admin + '/' + id, {
    method: 'PUT', body: { ...metadata, nome: 'Caderno revisado', preco: 49.90 }, status: 202,
  });
  await project(edit);
  assert.equal((await request('query', product(id))).preco, 49.90);
  assert.equal((await request('query', product(id))).estoque, 3);
  const laterOrder = await buy(id, 1);
  assert.equal(laterOrder.precoUnitario, 49.90);
  await buy(id, 3, 409);

  const stock = await request('bus', admin + '/' + id, {
    method: 'PUT', body: { ...metadata, nome: 'Caderno revisado', preco: 49.90, estoque: 4 }, status: 202,
  });
  await project(stock);
  assert.equal((await request('query', product(id))).estoque, 4);
  await buy(id, 1);
  await until('saldo da compra posterior projetado', async () => (await request('query', product(id))).estoque === 3);

  const deleteKey = randomUUID();
  const removeOptions = { method: 'DELETE', key: deleteKey, status: 202 };
  const remove = await request('bus', admin + '/2', removeOptions);
  await project(remove);
  assert.equal((await request('bus', admin + '/2', removeOptions)).commandId, remove.commandId);
  await request('query', product(2), { status: 404 });
  await buy(2, 1, 404);
  await request('bus', admin + '/2', { method: 'PUT', body: book, status: 404 });

  await stop('bus');
  await start('bus');
  assert.equal((await command(create)).status, 'PENDENTE');
  assert.equal((await command(remove)).status, 'PENDENTE');
  await start('produtos');
  for (const item of [create, edit, stock, remove]) await sync(item.type + ' reconciliado', item);

  assert.deepEqual(await request('produtos', product(id)), await request('query', product(id)));
  assert.equal((await request('produtos', product(id))).estoque, 3);
  assert.equal((await request('produtos', '/produtos')).filter((item) => item.id === id).length, 1);
  assert.deepEqual((await request('bus', '/admin/sincronizacao')).pendentes, []);
  await request('produtos', product(2), { status: 404 });
  assert.deepEqual(await request('pedidos', '/pedidos/' + order.id), order);
  assert.deepEqual(await request('pedidos', '/pedidos/' + seedOrder.id), seedOrder);
});
