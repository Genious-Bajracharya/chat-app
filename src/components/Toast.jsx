import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-500/20 border-green-500/30',
    error: 'bg-red-500/20 border-red-500/30',
    info: 'bg-blue-500/20 border-blue-500/30',
    warning: 'bg-amber-500/20 border-amber-500/30'
  }[type];

  const textColor = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-amber-400'
  }[type];

  const iconColor = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-amber-400'
  }[type];

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgColor} border rounded-lg px-4 py-3 flex items-center gap-3 max-w-sm`}>
      <span className={`text-lg font-bold ${iconColor}`}>{icons[type]}</span>
      <p className={`text-sm ${textColor}`}>{message}</p>
      <button
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
