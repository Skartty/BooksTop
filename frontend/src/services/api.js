import axios from 'axios';
export const productsApi = axios.create({ baseURL: import.meta.env.VITE_PRODUCTS_API_URL || 'http://localhost:3001', timeout: 5000 });
export const ordersApi = axios.create({ baseURL: import.meta.env.VITE_ORDERS_API_URL || 'http://localhost:3002', timeout: 5000 });
export function friendlyError(error, operation = 'default') {
  const status = error.response?.status;
  if (operation === 'products') return 'Não conseguimos carregar os livros no momento. Tente novamente em alguns instantes.';
  if (operation === 'details' && status === 404) return 'Este livro não está mais disponível.';
  if (operation === 'order') {
    if (status === 404) return 'Este livro não está mais disponível.';
    if (status === 409) return 'Não temos essa quantidade disponível em estoque.';
    if (status === 503 || !error.response) return 'Não foi possível finalizar o pedido agora. O serviço de pedidos está temporariamente indisponível.';
  }
  return 'Não foi possível concluir esta ação agora. Tente novamente em instantes.';
}
