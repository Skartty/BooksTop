import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Toast from '../components/Toast.jsx';

const ToastContext = createContext();
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => window.clearTimeout(timer));
      active.clear();
    };
  }, []);

  const dismiss = useCallback((id) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((all) => all.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', detail) => {
    const id = nextId++;
    setToasts((all) => [...all, { id, message, type, detail }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), 5200));
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toasts" aria-label="Notificações">
        {toasts.map((toast) => <Toast key={toast.id} {...toast} dismiss={() => dismiss(toast.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
