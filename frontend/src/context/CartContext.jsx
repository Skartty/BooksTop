import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  function addItem(book, quantity = 1) {
    const existing = items.find((item) => item.id === book.id);
    if ((existing?.quantity ?? 0) + quantity > book.estoque) return false;
    setItems((current) => {
      const previous = current.find((item) => item.id === book.id);
      if (previous) {
        return current.map((item) => item.id === book.id
          ? { ...book, quantity: Math.min(item.quantity + quantity, book.estoque) }
          : item);
      }
      return [...current, { ...book, quantity }];
    });
    return true;
  }

  function updateQuantity(id, quantity) {
    setItems((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => (
      item.id === id ? { ...item, quantity: Math.min(quantity, item.estoque) } : item
    )));
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.preco * item.quantity, 0);
  return <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, count, total }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
