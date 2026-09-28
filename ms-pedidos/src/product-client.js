import axios from 'axios';
const productsUrl = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3001';
const client = axios.create({ baseURL: productsUrl, timeout: 4000 });
export async function getProduct(productId) {
  try { return (await client.get(`/produtos/${productId}`)).data; }
  catch (error) {
    if (error.response?.status === 404) return null;
    const unavailable = new Error('PRODUCTS_SERVICE_UNAVAILABLE'); unavailable.code = 'PRODUCTS_SERVICE_UNAVAILABLE'; throw unavailable;
  }
}
