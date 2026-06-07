import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

type AlertType = 'info' | 'warning' | 'error' | 'success';

interface AlertOptions {
  title?: string;
  type?: AlertType;
}

interface AlertContextData {
  showAlert: (message: string, options?: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextData>({} as AlertContextData);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<AlertOptions>({});

  const showAlert = (msg: string, opts?: AlertOptions) => {
    setMessage(msg);
    setOptions(opts || {});
    setIsOpen(true);
  };

  React.useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg: any) => {
      const messageStr = String(msg);
      let type: AlertType = 'info';
      let title = 'Aviso';
      
      if (messageStr.toLowerCase().includes('erro') || messageStr.toLowerCase().includes('falhou')) {
        type = 'error';
        title = 'Erro';
      } else if (messageStr.toLowerCase().includes('sucesso')) {
        type = 'success';
        title = 'Sucesso';
      }
      
      showAlert(messageStr, { title, type });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const closeAlert = () => setIsOpen(false);

  const getIcon = () => {
    switch (options.type) {
      case 'error': return <AlertTriangle size={20} className="text-danger" />;
      case 'warning': return <AlertTriangle size={20} className="text-orange-500" />;
      case 'success': return <CheckCircle size={20} className="text-green-500" />;
      default: return <Info size={20} className="text-primary" />;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getIcon()}
                    <h3 className="text-sm font-black uppercase tracking-wider text-text-main">
                      {options.title || 'Aviso'}
                    </h3>
                  </div>
                  <button
                    onClick={closeAlert}
                    className="text-text-muted hover:text-text-main transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-text-muted font-medium mb-6 whitespace-pre-wrap">
                  {message}
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={closeAlert}
                    className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  return useContext(AlertContext);
}
