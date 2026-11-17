import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { friendlyError, ordersApi } from '../services/api.js';
import { money } from '../services/format.js';

export default function CheckoutPage() {
  const { items, total, removeItem } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function finish() {
    setLoading(true);
    let completed = 0;
    let firstError = '';
    for (const item of items) {
      try {
        await ordersApi.post('/pedidos', { produtoId: item.id, quantidade: item.quantity });
        removeItem(item.id);
        completed++;
      } catch (error) {
        firstError ||= friendlyError(error, 'order');
      }
    }
    setLoading(false);
    if (completed === items.length) {
      showToast('Pedido realizado com sucesso!', 'success');
      navigate('/pedidos');
    } else {
      if (completed) showToast('Parte da compra foi concluída. Confira os itens restantes na sacola.');
      showToast(firstError, 'error');
    }
  }

  return (
    <main className="page-shell checkout">
      <Link to="/sacola" className="back-link"><Icon name="left" size={16} /> Voltar à sacola</Link>
      <div className="page-heading"><h1>Revise seu pedido</h1></div>
      {!items.length && !loading ? (
        <EmptyState title="Sua sacola está vazia" icon="bag">
          <Link className="primary-button" to="/">Explorar livros</Link>
        </EmptyState>
      ) : (
        <section className="receipt">
          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item.id}><span>{item.quantity} × {item.nome}</span><strong>{money(item.preco * item.quantity)}</strong></li>
            ))}
          </ul>
          <div className="receipt__total"><span>Total</span><strong>{money(total)}</strong></div>
          <button className="primary-button" type="button" onClick={finish} disabled={loading}>
            {loading ? 'Finalizando…' : 'Finalizar pedido'} <Icon name="right" size={17} />
          </button>
        </section>
      )}
    </main>
  );
}
