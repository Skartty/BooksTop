import { createContext, useContext, useMemo, useState } from 'react';
const CartContext = createContext();
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const addItem = (book, quantity = 1) => setItems((current) => { const existing = current.find((item) => item.id === book.id); if (existing) return current.map((item) => item.id === book.id ? { ...item, quantity: Math.min(item.quantity + quantity, book.estoque) } : item); return [...current, { ...book, quantity: Math.min(quantity, book.estoque) }]; });
  const updateQuantity = (id, quantity) => setItems((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity: Math.min(quantity, item.estoque) } : item));
  const removeItem = (id) => setItems((current) => current.filter((item) => item.id !== id));
  const value = useMemo(() => ({ items, addItem, updateQuantity, removeItem, clearCart: () => setItems([]), count: items.reduce((sum, item) => sum + item.quantity, 0), total: items.reduce((sum, item) => sum + item.preco * item.quantity, 0) }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
