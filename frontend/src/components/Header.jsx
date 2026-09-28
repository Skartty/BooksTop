import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
export default function Header() { const { count } = useCart(); return <header className="site-header"><NavLink to="/" className="brand" aria-label="BooksTop, página inicial"><span className="brand-mark">B</span><span>Books<span>Top</span></span></NavLink><nav aria-label="Navegação principal"><NavLink to="/">Catálogo</NavLink><NavLink to="/pedidos">Pedidos</NavLink><NavLink to="/carrinho" className="cart-link">Sacola <b>{count}</b></NavLink></nav></header>; }
