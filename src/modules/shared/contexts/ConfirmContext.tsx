import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface ConfirmContextData {
  showConfirm: (message: string, onConfirm: () => void, options?: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextData>({} as ConfirmContextData);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [onConfirmCallback, setOnConfirmCallback] = useState<{ fn: () => void } | null>(null);

  const showConfirm = useCallback((msg: string, onConfirm: () => void, opts?: ConfirmOptions) => {
    setMessage(msg);
    setOnConfirmCallback({ fn: onConfirm });
    setOptions(opts || {});
    setIsOpen(true);
  }, []);

  const closeConfirm = () => {
    setIsOpen(false);
    setOnConfirmCallback(null);
  };

  const handleConfirm = () => {
    if (onConfirmCallback?.fn) {
      onConfirmCallback.fn();
    }
    closeConfirm();
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
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
                    <AlertTriangle size={20} className={options.isDanger ? "text-danger" : "text-orange-500"} />
                    <h3 className="text-sm font-black uppercase tracking-wider text-text-main">
                      {options.title || 'Confirmação'}
                    </h3>
                  </div>
                  <button
                    onClick={closeConfirm}
                    className="text-text-muted hover:text-text-main transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-text-muted font-medium mb-6 whitespace-pre-wrap">
                  {message}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeConfirm}
                    className="px-6 py-2 bg-app-bg text-text-main text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-200 transition-colors"
                  >
                    {options.cancelText || 'Cancelar'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`px-6 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${
                      options.isDanger ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {options.confirmText || 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
