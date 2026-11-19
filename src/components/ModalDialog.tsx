import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ModalConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  inputPlaceholder?: string;
  initialValue?: string;
  onConfirm: (inputValue?: string) => void;
}

interface ModalDialogProps {
  config: ModalConfig | null;
  onClose: () => void;
}

export function ModalDialog({ config, onClose }: ModalDialogProps) {
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    if (config) {
      setInputVal(config.initialValue ?? '');
    }
  }, [config]);

  if (!config) return null;

  const isPrompt = typeof config.inputPlaceholder === 'string';

  const handleConfirm = () => {
    config.onConfirm(isPrompt ? inputVal.trim() : undefined);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-modal-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 id="studio-modal-title" className="text-sm font-semibold text-slate-900">
            {config.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{config.message}</p>
          {isPrompt && (
            <input
              type="text"
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              placeholder={config.inputPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            {config.cancelLabel || '取消'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium text-white whitespace-nowrap ${
              config.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {config.confirmLabel || '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}
