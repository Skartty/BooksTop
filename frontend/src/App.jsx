import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Icon from './components/Icon.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import BookPage from './pages/BookPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ManagePage from './pages/ManagePage.jsx';
import ShelfPage from './pages/ShelfPage.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/livro/:id" element={<BookPage />} />
        <Route path="/estante" element={<ShelfPage />} />
        <Route path="/sacola" element={<CartPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/finalizar" element={<CheckoutPage />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/gerenciar" element={<ManagePage />} />
      </Routes>
      <footer className="site-footer">
        <div>
          <Link to="/" className="brand"><Icon name="book" size={20} /> BooksTop</Link>
          <small>Projeto acadêmico de Desenvolvimento Web 3</small>
        </div>
      </footer>
    </>
  );
}
