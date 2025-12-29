import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900">
          <div className="p-2 bg-red-500/10 rounded-full">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-white font-bold text-lg">{title}</h2>
        </div>

        <div className="p-6">
          <p className="text-zinc-300 text-sm leading-relaxed">{message}</p>
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-red-900/20"
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;