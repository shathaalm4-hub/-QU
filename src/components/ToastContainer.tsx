import React from 'react';
import { useNews } from '../context/NewsContext';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNews();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none" dir="rtl">
      {toasts.map((toast) => {
        let icon = <Info className="w-5 h-5 text-sky-500" />;
        let borderColor = 'border-sky-500';
        let bgColor = 'bg-white dark:bg-slate-900';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
          borderColor = 'border-emerald-500';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
          borderColor = 'border-amber-500';
        } else if (toast.type === 'error') {
          icon = <XCircle className="w-5 h-5 text-rose-500" />;
          borderColor = 'border-rose-500';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border-r-4 ${borderColor} ${bgColor} border border-slate-200/80 dark:border-slate-800 transition-all duration-300 transform translate-y-0`}
          >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{toast.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
