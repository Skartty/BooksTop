import { createContext, useCallback, useContext, useState } from 'react';
const ToastContext = createContext();
let nextId = 1;
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'info') => { const id = nextId++; setToasts((all) => [...all, { id, message, type }]); window.setTimeout(() => setToasts((all) => all.filter((toast) => toast.id !== id)), 4600); }, []);
  const dismiss = (id) => setToasts((all) => all.filter((toast) => toast.id !== id));
  return <ToastContext.Provider value={{ showToast }}><>{children}<section className="toasts" aria-live="polite">{toasts.map((toast) => <div className={`toast toast--${toast.type}`} key={toast.id}><span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : 'i'}</span><p>{toast.message}</p><button onClick={() => dismiss(toast.id)} aria-label="Fechar mensagem">×</button></div>)}</section></></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
