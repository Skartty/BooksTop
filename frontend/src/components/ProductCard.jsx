import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { money } from '../services/format.js';
import Cover from './Cover.jsx';
import FavoriteButton from './FavoriteButton.jsx';
import Icon from './Icon.jsx';

export default function ProductCard({ book }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const details = '/livro/' + book.id;
  const available = book.estoque > 0;

  function add() {
    if (addItem(book)) showToast('Livro adicionado à sacola.', 'success');
    else showToast('Estoque insuficiente.', 'error');
  }

  return (
    <article className="book-card">
      <div className="book-card__media">
        <Link to={details} className="book-card__cover">
          <Cover book={book} />
        </Link>
        <FavoriteButton book={book} />
      </div>
      <div className="book-card__body">
        <span className="tag">{book.genero}</span>
        <h3><Link to={details}>{book.nome}</Link></h3>
        <p className="author">{book.autor}</p>
        <div className="book-card__purchase">
          <div>
            <strong>{money(book.preco)}</strong>
            <small className={available ? 'available' : 'unavailable'}>
              {available ? book.estoque + ' em estoque' : 'Indisponível'}
            </small>
          </div>
          <button type="button" className="bag-button" onClick={add} disabled={!available}
            aria-label={'Adicionar ' + book.nome + ' à sacola'}>
            <Icon name="bag" size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
