import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import Loader from '../components/Loader.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useBooks } from '../services/useBooks.js';

export default function ShelfPage() {
  const { favorites } = useFavorites();
  const { books, loading, error, reload } = useBooks();
  const savedBooks = books.filter((book) => favorites.has(String(book.id)));

  return (
    <main className="page-shell">
      <div className="page-heading">
        <h1>Minha Estante</h1>
        <p>Seus livros favoritos, sempre à mão.</p>
      </div>
      {loading && <Loader label="Carregando sua estante…" />}
      {!loading && error && (
        <EmptyState title="Estante indisponível" text={error} icon="heart">
          <button className="primary-button" onClick={reload}>Tentar novamente</button>
        </EmptyState>
      )}
      {!loading && !error && (savedBooks.length ? (
        <div className="book-grid">{savedBooks.map((book) => <ProductCard key={book.id} book={book} />)}</div>
      ) : (
        <EmptyState title="Sua estante ainda está vazia." text="Toque no coração de um livro para guardá-lo aqui." icon="heart">
          <Link className="primary-button" to="/">Explorar livros</Link>
        </EmptyState>
      ))}
    </main>
  );
}
