
import React, { useState, useEffect } from 'react';
import { Spread } from '../types';
import { X, Check, Download, Layers, Image as ImageIcon, FileText, CheckSquare, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: 'current' | 'all' | 'selected', format: 'PSD' | 'JPG' | 'PDF', selectedIds: string[]) => void;
  spreads: Spread[];
  activeSpreadId: string | null;
  isExporting: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, onClose, onConfirm, spreads, activeSpreadId, isExporting 
}) => {
  const [scope, setScope] = useState<'current' | 'all' | 'selected'>('current');
  const [format, setFormat] = useState<'PSD' | 'JPG' | 'PDF'>('JPG');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
      if (isOpen) {
          // Reset or init state
          setSelectedIds(new Set(activeSpreadId ? [activeSpreadId] : []));
      }
  }, [isOpen, activeSpreadId]);

  if (!isOpen) return null;

  const toggleSpread = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const toggleAllSelection = () => {
      if (selectedIds.size === spreads.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(spreads.map(s => s.id)));
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="text-blue-500" /> Exportar Álbum
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
            
            {/* 1. Scope Selection */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">1. O que você deseja exportar?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                        onClick={() => setScope('current')}
                        className={clsx(
                            "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all gap-2",
                            scope === 'current' ? "border-blue-500 bg-blue-900/20 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        )}
                    >
                        <div className="w-8 h-8 rounded bg-gray-700/50 flex items-center justify-center font-mono font-bold">1</div>
                        <span className="font-medium text-sm">Lâmina Atual</span>
                    </button>

                    <button 
                        onClick={() => setScope('all')}
                        className={clsx(
                            "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all gap-2",
                            scope === 'all' ? "border-blue-500 bg-blue-900/20 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        )}
                    >
                        <div className="flex gap-1">
                            <div className="w-6 h-8 rounded bg-gray-700/50 border border-gray-600"></div>
                            <div className="w-6 h-8 rounded bg-gray-700/50 border border-gray-600"></div>
                            <div className="w-6 h-8 rounded bg-gray-700/50 border border-gray-600"></div>
                        </div>
                        <span className="font-medium text-sm">Todas as Lâminas</span>
                    </button>

                    <button 
                        onClick={() => setScope('selected')}
                        className={clsx(
                            "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all gap-2",
                            scope === 'selected' ? "border-blue-500 bg-blue-900/20 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        )}
                    >
                        <CheckSquare className="w-8 h-8 opacity-50" />
                        <span className="font-medium text-sm">Seleção Múltipla</span>
                    </button>
                </div>

                {/* Selection Grid (Only if 'selected' is active) */}
                {scope === 'selected' && (
                    <div className="mt-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-400">Selecione as lâminas:</span>
                            <button onClick={toggleAllSelection} className="text-xs text-blue-400 hover:text-blue-300">
                                {selectedIds.size === spreads.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                            </button>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                            {spreads.map((spread) => (
                                <button
                                    key={spread.id}
                                    onClick={() => toggleSpread(spread.id)}
                                    className={clsx(
                                        "aspect-video rounded border flex items-center justify-center text-sm font-bold transition-all relative overflow-hidden",
                                        selectedIds.has(spread.id) ? "border-blue-500 bg-blue-600 text-white" : "border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600"
                                    )}
                                >
                                    {spread.index}
                                    {selectedIds.has(spread.id) && <div className="absolute top-0 right-0 p-0.5"><Check size={10} /></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Format Selection */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">2. Qual formato?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                        onClick={() => setFormat('JPG')}
                        className={clsx(
                            "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                            format === 'JPG' ? "border-emerald-500 bg-emerald-900/20 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        )}
                    >
                        <div className="bg-gray-700 p-2 rounded"><ImageIcon size={20} /></div>
                        <div>
                            <div className="font-bold">JPEG</div>
                            <div className="text-[10px] opacity-70">Imagem (.jpg)</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => setFormat('PDF')}
                        className={clsx(
                            "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                            format === 'PDF' ? "border-red-500 bg-red-900/20 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        )}
                    >
                        <div className="bg-gray-700 p-2 rounded"><FileText size={20} /></div>
                        <div>
                            <div className="font-bold">PDF</div>
                            <div className="text-[10px] opacity-70">Documento (.pdf)</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => setFormat('PSD')}
                        className={clsx(
                            "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                            format === 'PSD' ? "border-blue-500 bg-blue-900/20 text-white" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                        )}
                    >
                        <div className="bg-gray-700 p-2 rounded"><Layers size={20} /></div>
                        <div>
                            <div className="font-bold">PSD</div>
                            <div className="text-[10px] opacity-70">Photoshop (.psd)</div>
                        </div>
                    </button>
                </div>
                {format === 'PDF' && scope !== 'current' && (
                    <p className="text-xs text-blue-400 bg-blue-900/20 p-2 rounded border border-blue-900/50">
                        Nota: Todas as lâminas selecionadas serão combinadas em um único arquivo PDF.
                    </p>
                )}
                {(format === 'JPG' || format === 'PSD') && scope !== 'current' && (
                    <p className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-900/50">
                        Nota: Será baixado um arquivo separado para cada lâmina selecionada.
                    </p>
                )}
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-900 rounded-b-xl">
            <button 
                onClick={onClose}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                disabled={isExporting}
            >
                Cancelar
            </button>
            <button 
                onClick={() => onConfirm(scope, format, Array.from(selectedIds))}
                disabled={isExporting || (scope === 'selected' && selectedIds.size === 0)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all"
            >
                {isExporting ? <span className="animate-pulse">Gerando Arquivos...</span> : <>Exportar Agora</>}
            </button>
        </div>
      </div>
    </div>
  );
};
