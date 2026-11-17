import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import Loader from '../components/Loader.jsx';
import { friendlyError, ordersApi } from '../services/api.js';
import { date, money } from '../services/format.js';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    ordersApi.get('/pedidos', { signal: controller.signal })
      .then(({ data }) => setOrders(data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(friendlyError(error, 'order'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request]);

  return (
    <main className="page-shell">
      <div className="page-heading"><h1>Seus pedidos</h1><p>O histórico das suas leituras escolhidas.</p></div>
      {loading && <Loader label="Carregando pedidos…" />}
      {!loading && error && (
        <EmptyState title="Pedidos indisponíveis" text={error}>
          <button className="primary-button" onClick={() => setRequest((value) => value + 1)}>Tentar novamente</button>
        </EmptyState>
      )}
      {!loading && !error && (orders.length ? (
        <section className="orders" aria-label="Histórico de pedidos">
          {orders.map((order) => (
            <article key={order.id} className="order">
              <div>
                <span className="order__number">Pedido #{order.id}</span>
                <h2>{order.nomeProduto}</h2>
                <p>{order.quantidade} {order.quantidade === 1 ? 'exemplar' : 'exemplares'} · {money(order.precoUnitario)} por exemplar</p>
                <time dateTime={order.dataPedido}>{date(order.dataPedido)}</time>
              </div>
              <div className="order__value">
                <span className={'status status--' + order.status.toLowerCase()}>{order.status === 'CANCELADO' ? 'Cancelado' : 'Realizado'}</span>
                <strong>{money(order.valorTotal)}</strong>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState title="Você ainda não possui pedidos" text="Suas compras vão aparecer aqui." icon="bag">
          <Link className="primary-button" to="/">Explorar livros</Link>
        </EmptyState>
      ))}
    </main>
  );
}
