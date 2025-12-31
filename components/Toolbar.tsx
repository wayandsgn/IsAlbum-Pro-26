
import React, { useState } from 'react';
import { AlbumConfig } from '../types';
import { Layout, Download, RefreshCw, Save, ChevronDown, Shuffle, PlusSquare, Eye, Undo, Redo, Sparkles, Pencil, AlertTriangle, Grip } from 'lucide-react';

interface ToolbarProps {
  config: AlbumConfig;
  totalSpreads: number;
  totalPhotos: number;
  onUpdateConfig: (cfg: Partial<AlbumConfig>) => void;
  onUpdateSpreads: (n: number) => void;
  onAutoDistribute: (min: number | null, max: number | null) => void;
  onRedistributeGlobal?: () => void;
  onExport: () => void;
  onSaveProject: () => void;
  onPreview: () => void;
  isExporting: boolean;
  onShowTemplates?: () => void;
  onAddSpread?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onResizeProject?: (newW: number, newH: number) => void;
  onReturnToWelcome?: () => void;
  onEditSpread?: () => void;
  canEditSpread?: boolean;
}

const convertPxToUnit = (px: number, unit: string, dpi: number): string => {
  let val = 0;
  if (unit === 'px') return `${Math.round(px)}`;
  const inches = px / dpi;
  switch (unit) {
    case 'cm': val = inches * 2.54; break;
    case 'mm': val = inches * 25.4; break;
    case 'm': val = inches * 0.0254; break;
    case 'pt': val = inches * 72; break;
    default: val = inches * 2.54;
  }
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const convertUnitToPx = (val: number, unit: string, dpi: number): number => {
    let px = val;
    if (unit === 'px') return val;
    const inches = unit === 'cm' ? val / 2.54 : 
                   unit === 'mm' ? val / 25.4 :
                   unit === 'm' ? val / 0.0254 :
                   unit === 'pt' ? val / 72 : val / 2.54;
    return Math.round(inches * dpi);
};

export const Toolbar: React.FC<ToolbarProps> = ({ 
  config, 
  totalSpreads, 
  totalPhotos,
  onUpdateSpreads,
  onAutoDistribute,
  onRedistributeGlobal,
  onExport,
  onSaveProject,
  onPreview,
  isExporting,
  onShowTemplates,
  onAddSpread,
  onUndo, onRedo, canUndo, canRedo,
  onResizeProject,
  onReturnToWelcome,
  onEditSpread,
  canEditSpread
}) => {
  
  // Default to Auto Density (true) as requested
  const [minPhotos, setMinPhotos] = useState(2);
  const [maxPhotos, setMaxPhotos] = useState(6);
  const [isAutoDensity, setIsAutoDensity] = useState(true);

  const [showResizeModal, setShowResizeModal] = useState(false);
  const [resizeW, setResizeW] = useState(parseFloat(convertPxToUnit(config.spreadWidth, config.displayUnit, config.dpi).replace(',', '.')));
  const [resizeH, setResizeH] = useState(parseFloat(convertPxToUnit(config.spreadHeight, config.displayUnit, config.dpi).replace(',', '.')));

  const displayW = convertPxToUnit(config.spreadWidth, config.displayUnit, config.dpi);
  const displayH = convertPxToUnit(config.spreadHeight, config.displayUnit, config.dpi);

  const handleDistributeClick = () => {
      if (isAutoDensity) {
          onAutoDistribute(null, null);
      } else {
          onAutoDistribute(minPhotos, maxPhotos);
      }
  };

  const confirmResize = () => {
      if (onResizeProject) {
          const newPxW = convertUnitToPx(resizeW, config.displayUnit, config.dpi);
          const newPxH = convertUnitToPx(resizeH, config.displayUnit, config.dpi);
          onResizeProject(newPxW, newPxH);
      }
      setShowResizeModal(false);
  };

  return (
    <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shadow-md z-30 overflow-x-auto custom-scrollbar text-sm">
      
      {/* Esquerda: Logo e Navegação */}
      <div className="flex items-center gap-6 flex-shrink-0 mr-4">
        <button onClick={onReturnToWelcome} className="flex items-center gap-2 text-blue-400 font-bold text-xl tracking-tight hover:text-blue-300 transition-colors" title="Voltar à tela inicial (Salva o projeto)">
          <Layout className="w-6 h-6" />
          IsAlbum Pro 26
        </button>
        <div className="h-8 w-px bg-gray-800"></div>
      </div>

      {/* Centro: Configurações do Projeto (Layout Horizontal) */}
      <div className="flex items-center justify-center gap-6 xl:gap-10 flex-1 px-4">
          
          {/* Grupo 1: Dimensões */}
          <button 
             onClick={() => {
                 setResizeW(parseFloat(displayW.replace(',', '.')));
                 setResizeH(parseFloat(displayH.replace(',', '.')));
                 setShowResizeModal(true);
             }}
             className="flex items-center gap-2 group cursor-pointer hover:bg-gray-800 px-2 py-1 rounded transition-colors"
             title="Clique para redimensionar o projeto"
          >
             <label className="text-[10px] uppercase text-gray-500 group-hover:text-blue-400 font-bold tracking-wider cursor-pointer transition-colors">
                 Dimensões ({config.displayUnit})
             </label>
             <div className="font-mono text-xs text-gray-200 group-hover:text-white bg-gray-950 border border-gray-700 rounded px-2 py-1 min-w-[80px] text-center shadow-inner group-hover:border-gray-600 transition-colors">
                 {displayW} x {displayH}
             </div>
          </button>
          
          <div className="h-6 w-px bg-gray-800"></div>

          {/* Grupo 2: Fotos por Lâmina (Horizontal) */}
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2">
                 <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Fotos / Lâmina</label>
                 <label className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 hover:border-gray-600">
                    <input 
                        type="checkbox" 
                        checked={isAutoDensity} 
                        onChange={(e) => setIsAutoDensity(e.target.checked)}
                        className="w-3 h-3 rounded bg-gray-700 border-gray-500 text-blue-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[9px] text-gray-400 font-bold uppercase select-none">Auto</span>
                </label>
             </div>
             
             <div className={`flex items-center gap-1.5 ${isAutoDensity ? "opacity-50 pointer-events-none grayscale" : ""}`}>
                 <input 
                   type="number" 
                   min={1} 
                   max={30}
                   value={minPhotos}
                   onChange={(e) => {
                       const val = Math.max(1, parseInt(e.target.value) || 1);
                       setMinPhotos(val);
                       if (val > maxPhotos) setMaxPhotos(val);
                   }}
                   className="bg-gray-950 border border-gray-700 rounded w-10 py-1 text-white focus:ring-1 focus:ring-blue-500 text-xs font-mono text-center outline-none transition-colors hover:border-gray-600 shadow-sm"
                   title="Mínimo de fotos"
                 />
                 <span className="text-gray-600 font-bold text-xs">-</span>
                 <input 
                   type="number" 
                   min={1} 
                   max={30}
                   value={maxPhotos}
                   onChange={(e) => {
                       const val = Math.max(1, parseInt(e.target.value) || 1);
                       setMaxPhotos(val);
                       if (val < minPhotos) setMinPhotos(val);
                   }}
                   className="bg-gray-950 border border-gray-700 rounded w-10 py-1 text-white focus:ring-1 focus:ring-blue-500 text-xs font-mono text-center outline-none transition-colors hover:border-gray-600 shadow-sm"
                   title="Máximo de fotos"
                 />
             </div>
          </div>

          <div className="h-6 w-px bg-gray-800"></div>

          {/* Grupo 3: Total de Lâminas (Horizontal) */}
          <div className="flex items-center gap-2">
             <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Total Lâminas</label>
             <input 
               type="number" 
               min={1} 
               max={200}
               value={totalSpreads}
               onChange={(e) => onUpdateSpreads(Number(e.target.value))}
               className="bg-gray-950 border border-gray-700 rounded w-14 py-1 text-white focus:ring-1 focus:ring-blue-500 text-xs font-mono text-center outline-none transition-colors hover:border-gray-600 shadow-sm"
               title="Definir quantidade de lâminas alvo"
             />
          </div>

          <div className="h-6 w-px bg-gray-800"></div>
          
          {/* Grupo 4: Ferramentas de Visualização */}
          <div className="flex items-center gap-2">
              {onAddSpread && (
                 <button 
                    onClick={onAddSpread}
                    className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 transition-all active:scale-95"
                    title="Adicionar Lâmina Vazia"
                 >
                     <PlusSquare className="w-4 h-4" />
                 </button>
             )}

            <button 
              onClick={onPreview}
              className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-gray-700 text-emerald-400 hover:text-emerald-300 rounded border border-gray-700 transition-all active:scale-95"
              title="Pré-visualizar Álbum"
            >
              <Eye size={16} />
            </button>
            
            <div className="flex items-center gap-0.5 bg-gray-800 rounded border border-gray-700 h-8">
                 <button onClick={onUndo} disabled={!canUndo} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 hover:bg-gray-700 transition-colors rounded-l" title="Desfazer (Ctrl+Z)">
                     <Undo size={14} />
                 </button>
                 <div className="w-px h-4 bg-gray-700"></div>
                 <button onClick={onRedo} disabled={!canRedo} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 hover:bg-gray-700 transition-colors rounded-r" title="Refazer (Ctrl+Y)">
                     <Redo size={14} />
                 </button>
             </div>
          </div>
      </div>

      {/* Direita: Ações Globais */}
      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
        {onEditSpread && (
          <button 
            onClick={onEditSpread}
            disabled={!canEditSpread}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-xs font-medium transition-colors border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Editar Lâmina em Foco"
          >
            <Pencil className="w-3.5 h-3.5 text-yellow-400" />
            Editar Lâmina
          </button>
        )}

        <div className="flex bg-gray-800 rounded-md border border-gray-700 overflow-hidden shadow-sm h-8">
            {onRedistributeGlobal && (
                <button 
                  onClick={onRedistributeGlobal}
                  className="flex items-center gap-2 px-3 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold transition-colors border-r border-gray-900/50 uppercase tracking-wide"
                  title="Variar ordem e layout global"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Variar
                </button>
            )}
            <button 
              onClick={handleDistributeClick}
              className="flex items-center justify-center px-3 hover:bg-gray-700 text-white text-xs font-bold transition-colors"
              title={isAutoDensity ? "Redistribuir em todas as lâminas" : `Redistribuir (Entre ${minPhotos} e ${maxPhotos} fotos/lâmina)`}
            >
              <RefreshCw className="w-4 h-4 text-blue-400" />
            </button>
        </div>

         <button 
          onClick={onSaveProject}
          className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors border border-gray-700"
          title="Salvar Projeto (.aaproj)"
        >
          <Save className="w-4 h-4" />
        </button>

        <button 
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-1.5 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
        >
          {isExporting ? (
            <span className="animate-pulse">...</span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exportar
            </>
          )}
        </button>
      </div>

      {showResizeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm w-full shadow-2xl">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      <AlertTriangle className="text-yellow-500" />
                      Redimensionar Projeto
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                      Tem certeza? Isso irá reorganizar e redimensionar todas as fotos em todas as lâminas para se adequar às novas proporções.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                          <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Largura ({config.displayUnit})</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={resizeW}
                            onChange={(e) => setResizeW(Number(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Altura ({config.displayUnit})</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={resizeH}
                            onChange={(e) => setResizeH(Number(e.target.value))}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                          />
                      </div>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setShowResizeModal(false)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={confirmResize}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold transition-colors"
                      >
                          Confirmar & Redimensionar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
