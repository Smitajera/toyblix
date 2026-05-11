import React, { useEffect, useRef } from 'react';

/**
 * Premium confirmation modal to replace all window.confirm() calls.
 * 
 * Props:
 *   isOpen       - boolean to show/hide
 *   onConfirm    - callback when user confirms
 *   onCancel     - callback when user cancels
 *   title        - heading text
 *   message      - body text
 *   confirmText  - button label (default: "Confirm")
 *   cancelText   - button label (default: "Cancel")
 *   variant      - 'danger' | 'warning' | 'info' (controls colors)
 *   icon         - Material Symbol icon name (optional)
 */
const ConfirmModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (isOpen && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmBtn: 'bg-red-600 hover:bg-red-700 shadow-red-600/30',
      defaultIcon: 'warning',
    },
    warning: {
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30',
      defaultIcon: 'help',
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30',
      defaultIcon: 'info',
    },
  };

  const v = variantStyles[variant] || variantStyles.danger;
  const displayIcon = icon || v.defaultIcon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl shadow-slate-900/20 w-full max-w-sm overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-white/80">
        <div className="p-8 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl ${v.iconBg} flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-[32px] ${v.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {displayIcon}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-black text-red-950 mb-2">{title}</h3>
          
          {/* Message */}
          {message && (
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[280px] mx-auto">
              {message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 ${v.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
