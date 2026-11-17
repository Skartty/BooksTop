import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import Icon from './Icon.jsx';

export default function Header() {
  const { count } = useCart();
  const { pathname } = useLocation();
  const catalog = pathname === '/' || pathname === '/catalogo';
  const cart = ['/sacola', '/carrinho', '/finalizar'].includes(pathname);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="BooksTop, página inicial">
          <span className="brand-mark"><Icon name="book" size={23} /></span>
          BooksTop
        </Link>
        <nav className="site-nav" aria-label="Navegação principal">
          <Link to="/" aria-current={catalog ? 'page' : undefined}>Catálogo</Link>
          <NavLink to="/estante">Minha Estante</NavLink>
          <NavLink to="/pedidos">Pedidos</NavLink>
          <NavLink to="/gerenciar">Gerenciar</NavLink>
        </nav>
        <Link to="/sacola" className="cart-link" aria-current={cart ? 'page' : undefined}>
          <Icon name="bag" size={19} /> Sacola <span>{count}</span>
        </Link>
      </div>
    </header>
  );
}
