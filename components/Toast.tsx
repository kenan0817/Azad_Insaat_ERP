import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// Simple event emitter for toast
type Listener = (toast: ToastMessage) => void;
let listener: Listener | null = null;

export const toast = {
  success: (message: string) => emit({ id: Date.now().toString() + Math.random().toString(), message, type: 'success' }),
  error: (message: string) => emit({ id: Date.now().toString() + Math.random().toString(), message, type: 'error' }),
  info: (message: string) => emit({ id: Date.now().toString() + Math.random().toString(), message, type: 'info' })
};

function emit(toast: ToastMessage) {
  if (listener) listener(toast);
}

export const ToastManager: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (newToast: ToastMessage) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3000);
    };

    listener = handleToast;
    return () => {
      if (listener === handleToast) {
        listener = null;
      }
    };
  }, []);

  return (
    <div className="fixed bottom-28 lg:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-1.5 pointer-events-none">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border border-slate-800 bg-slate-900/90 backdrop-blur-sm text-slate-200 text-[11px] font-bold animate-slide-up transition-all max-w-[80vw]"
        >
          {t.type === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
          {t.type === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
          {t.type === 'info' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
          
          <span className="truncate tracking-wide">{t.message}</span>
        </div>
      ))}
    </div>
  );
};
