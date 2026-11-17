import { Link } from 'react-router-dom';
import Cover from '../components/Cover.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import QuantityControl from '../components/QuantityControl.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../services/format.js';

export default function CartPage() {
  const { items, total, updateQuantity, removeItem } = useCart();

  return (
    <main className="page-shell">
      <div className="page-heading"><h1>Sua sacola</h1></div>
      {!items.length ? (
        <EmptyState title="Sua sacola está vazia" text="Encontre no catálogo a sua próxima leitura." icon="bag">
          <Link className="primary-button" to="/">Explorar livros</Link>
        </EmptyState>
      ) : (
        <div className="cart-layout">
          <section className="cart-list" aria-label="Livros na sacola">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <Link to={'/livro/' + item.id} className="cart-item__cover"><Cover book={item} /></Link>
                <div className="cart-item__book">
                  <h2><Link to={'/livro/' + item.id}>{item.nome}</Link></h2>
                  <p>{item.autor}</p>
                  <small>{money(item.preco)} por exemplar</small>
                </div>
                <div className="cart-item__actions">
                  <QuantityControl value={item.quantity} onChange={(value) => updateQuantity(item.id, value)} min={0}
                    max={item.estoque} book={item.nome} />
                  <button className="text-button" onClick={() => removeItem(item.id)}>
                    <Icon name="trash" size={15} /> Remover
                  </button>
                </div>
                <div className="cart-item__subtotal"><small>Subtotal</small><strong>{money(item.preco * item.quantity)}</strong></div>
              </article>
            ))}
          </section>
          <aside className="receipt">
            <h2>Resumo da compra</h2>
            <div className="receipt__total"><span>Subtotal</span><strong>{money(total)}</strong></div>
            <p>O estoque é confirmado na finalização.</p>
            <Link className="primary-button" to="/finalizar">Continuar compra <Icon name="right" size={17} /></Link>
            <Link to="/" className="back-link"><Icon name="left" size={15} /> Continuar escolhendo</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
