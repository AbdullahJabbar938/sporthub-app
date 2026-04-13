import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext();

const Toast = ({ id, type, message, onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  };

  const getClass = () => `toast toast-${type}`;

  return (
    <div className={getClass()} role="alert">
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => onClose(id)}>×</button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, message, duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message, duration }]);
    return id;
  }, []);

  const closeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((msg, dur) => showToast('success', msg, dur), [showToast]);
  const error = useCallback((msg, dur) => showToast('error', msg, dur), [showToast]);
  const warning = useCallback((msg, dur) => showToast('warning', msg, dur), [showToast]);
  const info = useCallback((msg, dur) => showToast('info', msg, dur), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, closeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={closeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export default ToastProvider;