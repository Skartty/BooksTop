import { createContext, useContext, useEffect, useState } from 'react';

const FavoritesContext = createContext();
const key = 'bookstop.favoritos';

function readFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return new Set(Array.isArray(stored) ? stored.map(String) : []);
  } catch {
    return new Set();
  }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(readFavorites);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...favorites]));
    } catch {
      // A estante continua disponível na sessão quando o navegador bloqueia o armazenamento.
    }
  }, [favorites]);

  function toggleFavorite(id) {
    setFavorites((current) => {
      const next = new Set(current);
      const bookId = String(id);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }

  return <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
