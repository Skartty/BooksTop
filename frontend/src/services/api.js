import axios from 'axios';

export const queryApi = axios.create({ baseURL: import.meta.env.VITE_QUERY_API_URL || 'http://localhost:3003', timeout: 5000 });
export const adminApi = axios.create({ baseURL: import.meta.env.VITE_EVENT_BUS_API_URL || 'http://localhost:3004', timeout: 5000 });
export const ordersApi = axios.create({ baseURL: import.meta.env.VITE_ORDERS_API_URL || 'http://localhost:3002', timeout: 5000 });

export function friendlyError(error, operation = 'default') {
  const status = error.response?.status;
  const message = error.response?.data?.message;
  if (operation === 'catalog') return 'Não conseguimos carregar o catálogo. Tente novamente em instantes.';
  if (operation === 'details' && status === 404) return 'Este livro não está mais disponível.';
  if (operation === 'management' && (!error.response || status >= 500)) {
    return 'Não conseguimos confirmar a operação com o Event Bus. Tente novamente em instantes.';
  }
  if (operation === 'order') {
    if (status === 404) return 'Este livro não está mais disponível para compra.';
    if (status === 409) return 'Estoque insuficiente.';
    if (!error.response || status === 503) return 'O serviço de pedidos está temporariamente indisponível.';
  }
  return message || 'Não foi possível concluir a operação. Tente novamente em instantes.';
}
