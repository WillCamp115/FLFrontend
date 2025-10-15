// src/components/ui/LoadingSpinner.jsx
import React from 'react';
import { Loader } from 'lucide-react';

export const LoadingSpinner = ({ size = 'md', message = '', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader className={`animate-spin text-blue-600 ${sizeClasses[size]}`} />
      {message && (
        <p className="mt-2 text-sm text-gray-600 text-center">{message}</p>
      )}
    </div>
  );
};

// src/components/ui/ConfirmDialog.jsx
import React from 'react';
import Modal from '../modals/Modal';
import { AlertTriangle, Check, X } from 'lucide-react';

export const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  loading = false
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="text-red-600" size={24} />,
          confirmButton: 'bg-red-600 hover:bg-red-700',
          background: 'bg-red-50 border-red-200'
        };
      case 'info':
        return {
          icon: <Check className="text-blue-600" size={24} />,
          confirmButton: 'bg-blue-600 hover:bg-blue-700',
          background: 'bg-blue-50 border-blue-200'
        };
      default:
        return {
          icon: <AlertTriangle className="text-yellow-600" size={24} />,
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700',
          background: 'bg-yellow-50 border-yellow-200'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <div className={`p-4 rounded-lg border ${styles.background} mb-6`}>
          <div className="flex items-center gap-3">
            {styles.icon}
            <p className="text-gray-800">{message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors ${styles.confirmButton}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="animate-spin h-4 w-4" />
                Loading...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// src/components/ui/Toast.jsx
import React, { useEffect, useState } from 'react';
import { X, Check, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export const Toast = ({ 
  id,
  type = 'info', 
  title, 
  message, 
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose && onClose(id), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: <Check size={20} />,
          classes: 'bg-green-50 border-green-200 text-green-800'
        };
      case 'error':
        return {
          icon: <AlertCircle size={20} />,
          classes: 'bg-red-50 border-red-200 text-red-800'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} />,
          classes: 'bg-yellow-50 border-yellow-200 text-yellow-800'
        };
      default:
        return {
          icon: <Info size={20} />,
          classes: 'bg-blue-50 border-blue-200 text-blue-800'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out
        ${styles.classes}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="ml-3 w-0 flex-1">
          {title && (
            <p className="text-sm font-medium">{title}</p>
          )}
          {message && (
            <p className={`text-sm ${title ? 'mt-1 opacity-90' : ''}`}>
              {message}
            </p>
          )}
        </div>
        <div className="ml-4 flex flex-shrink-0">
          <button
            className="inline-flex rounded-md hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose && onClose(id), 300);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// src/components/ui/ToastContainer.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from './Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title, message) => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title, message) => {
    return addToast({ type: 'error', title, message });
  }, [addToast]);

  const warning = useCallback((title, message) => {
    return addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title, message) => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// src/components/ui/ErrorBoundary.jsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>

            {/* Development mode error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                  {this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// src/components/ui/EmptyState.jsx
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionText,
  className = '' 
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {actionText || 'Get Started'}
        </button>
      )}
    </div>
  );
};

// src/components/ui/ProgressBar.jsx
export const ProgressBar = ({ 
  value, 
  max = 100, 
  className = '', 
  color = 'blue',
  size = 'md',
  showLabel = false,
  label = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div 
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// Export all components
export default {
  LoadingSpinner,
  ConfirmDialog,
  Toast,
  ToastProvider,
  useToast,
  ErrorBoundary,
  EmptyState,
  ProgressBar
};