import { useEffect, useState } from 'react';
import { friendlyError, queryApi } from './api.js';

export function useBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    queryApi.get('/produtos', { signal: controller.signal })
      .then(({ data }) => setBooks(data))
      .catch((error) => {
        if (!controller.signal.aborted) setError(friendlyError(error, 'catalog'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request]);

  return { books, loading, error, reload: () => setRequest((value) => value + 1) };
}
