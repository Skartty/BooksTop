import { useState } from 'react';
import heroPhoto from '../assets/livraria-outono.jpg';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import ProductCard from '../components/ProductCard.jsx';
import SearchField from '../components/SearchField.jsx';
import { matchesBook } from '../services/format.js';
import { useBooks } from '../services/useBooks.js';

const pageSize = 12;

export default function CatalogPage() {
  const { books, loading, error, reload } = useBooks();
  const [requestedPage, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const filtered = books.filter((book) => matchesBook(book, search));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(requestedPage, pages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function goToPage(number) {
    setPage(number);
    document.getElementById('catalogo')?.scrollIntoView({ block: 'start' });
  }

  return (
    <main className="page-shell catalog-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__body">
          <span className="hero__ornament" aria-hidden="true"><Icon name="book" size={23} /></span>
          <h1 id="hero-title">Histórias para <em>levar com você.</em></h1>
          <p>De clássicos brasileiros a novos mundos, encontre a sua próxima leitura.</p>
          <a href="#catalogo" className="primary-button">Explorar livros <Icon name="down" size={16} /></a>
        </div>
        <div className="hero__photo">
          <img src={heroPhoto} alt="" width="1152" height="768" fetchpriority="high" />
        </div>
      </section>

      <section id="catalogo" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <h2 id="catalog-title">Explore o catálogo</h2>
            {!loading && !error && <p className="result-count">{filtered.length} {filtered.length === 1 ? 'livro' : 'livros'}</p>}
          </div>
          <div className="section-tools">
            <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1); }} label="Buscar no catálogo" />
            <button className="icon-button outline-button" type="button" onClick={reload} title="Atualizar catálogo" aria-label="Atualizar catálogo">
              <Icon name="refresh" size={19} />
            </button>
          </div>
        </div>
        {loading && <Loader label="Carregando livros…" />}
        {!loading && error && (
          <EmptyState title="Catálogo indisponível" text={error}>
            <button className="primary-button" onClick={reload}>Tentar novamente</button>
          </EmptyState>
        )}
        {!loading && !error && (visible.length ? (
          <>
            <div className="book-grid">{visible.map((book) => <ProductCard key={book.id} book={book} />)}</div>
            {pages > 1 && (
              <nav className="pagination" aria-label="Paginação do catálogo">
                <button onClick={() => goToPage(page - 1)} disabled={page === 1}><Icon name="left" size={15} /> Anterior</button>
                {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                  <button key={number} aria-current={page === number ? 'page' : undefined} onClick={() => goToPage(number)}>{number}</button>
                ))}
                <button onClick={() => goToPage(page + 1)} disabled={page === pages}>Próxima <Icon name="right" size={15} /></button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState title="Nenhum livro encontrado" text={search.trim() ? 'Tente buscar por outro título, autor ou gênero.' : 'Volte em breve para conhecer novas histórias.'} />
        ))}
      </section>
    </main>
  );
}
