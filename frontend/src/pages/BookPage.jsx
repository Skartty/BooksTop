import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Cover from '../components/Cover.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import QuantityControl from '../components/QuantityControl.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { friendlyError, queryApi } from '../services/api.js';
import { money } from '../services/format.js';

export default function BookPage() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [book, setBook] = useState();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setQuantity(1);
    queryApi.get('/produtos/' + id, { signal: controller.signal })
      .then(({ data }) => setBook(data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(friendlyError(error, 'details'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  function addToCart() {
    if (addItem(book, quantity)) showToast('Livro adicionado à sacola.', 'success');
    else showToast('Estoque insuficiente.', 'error');
  }

  if (loading) return <main className="page-shell"><Loader label="Carregando o livro…" /></main>;
  if (error || !book) {
    return (
      <main className="page-shell">
        <EmptyState title="Não foi possível abrir este livro" text={error}>
          <Link className="primary-button" to="/">Voltar ao catálogo</Link>
        </EmptyState>
      </main>
    );
  }

  const available = book.estoque > 0;
  return (
    <main className="page-shell detail-page">
      <Link to="/" className="back-link"><Icon name="left" size={16} /> Voltar ao catálogo</Link>
      <article className="book-detail">
        <div className="book-detail__media"><div className="book-detail__cover"><Cover book={book} eager /></div></div>
        <div>
          <span className="tag">{book.genero}</span>
          <h1>{book.nome}</h1>
          <p className="detail-author">{book.autor}</p>
          {book.descricao && <p className="description">{book.descricao}</p>}
          <div className="book-detail__price">
            <strong>{money(book.preco)}</strong>
            <p className={available ? 'available' : 'unavailable'}>
              {available ? book.estoque + ' ' + (book.estoque === 1 ? 'exemplar disponível' : 'exemplares disponíveis') : 'Livro indisponível no momento'}
            </p>
          </div>
          <div className="purchase-row">
            <div className="control-group">
              <span>Quantidade</span>
              <QuantityControl value={quantity} onChange={setQuantity} max={book.estoque} />
            </div>
            <button className="primary-button" type="button" onClick={addToCart} disabled={!available}>
              <Icon name="bag" size={19} /> Adicionar à sacola
            </button>
          </div>
          <FavoriteButton book={book} withText />
        </div>
      </article>
    </main>
  );
}
