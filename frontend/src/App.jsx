import { Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import BookPage from './pages/BookPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
export default function App() { return <><Header/><Routes><Route path="/" element={<CatalogPage/>}/><Route path="/livro/:id" element={<BookPage/>}/><Route path="/carrinho" element={<CartPage/>}/><Route path="/finalizar" element={<CheckoutPage/>}/><Route path="/pedidos" element={<OrdersPage/>}/></Routes><footer><span className="brand-mark">B</span><p>BooksTop — histórias para levar</p><small>Projeto acadêmico DSW 3</small></footer></>; }
