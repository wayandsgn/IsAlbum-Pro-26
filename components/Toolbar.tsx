
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
  onUpdateGap?: (newGap: number) => void;
  onReturnToWelcome?: () => void;
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
  onUpdateGap,
  onReturnToWelcome
}) => {
  
  const [minPhotos, setMinPhotos] = useState(2);
  const [maxPhotos, setMaxPhotos] = useState(6);
  const [isAutoDensity, setIsAutoDensity] = useState(false);

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
    <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shadow-md z-30">
      <div className="flex items-center gap-6">
        <button onClick={onReturnToWelcome} className="flex items-center gap-2 text-blue-400 font-bold text-xl tracking-tight" title="Voltar à tela inicial (Salva o projeto)">
          <Layout className="w-6 h-6" />
          IsAlbum Pro
        </button>

        <div className="h-6 w-px bg-gray-700 mx-2"></div>

        <div className="flex items-center gap-4 text-sm text-gray-300">
          
          <button 
             onClick={() => {
                 setResizeW(parseFloat(displayW.replace(',', '.')));
                 setResizeH(parseFloat(displayH.replace(',', '.')));
                 setShowResizeModal(true);
             }}
             className="flex flex-col bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700 cursor-pointer group transition-colors"
             title="Clique para redimensionar o projeto"
          >
             <label className="text-[9px] uppercase text-gray-500 group-hover:text-gray-400 font-bold tracking-wider flex items-center gap-1">
                 Dimensões ({config.displayUnit}) <Pencil size={8} />
             </label>
             <div className="font-mono text-xs text-gray-200 group-hover:text-white">
                 {displayW} x {displayH}
             </div>
          </button>
          
          <div className="h-8 w-px bg-gray-700"></div>

          {onUpdateGap && (
              <div className="flex flex-col w-24">
                  <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] uppercase text-gray-500 font-bold tracking-wider flex items-center gap-1">
                          <Grip size={8} /> Espaçamento
                      </label>
                      <span className="text-[9px] text-gray-400 font-mono">{config.gap}px</span>
                  </div>
                  <input 
                      type="range" 
                      min={0} 
                      max={200} 
                      step={5}
                      value={config.gap} 
                      onChange={(e) => onUpdateGap(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      title="Ajustar espaçamento global (aplica na lâmina atual)"
                  />
              </div>
          )}

          <div className="h-8 w-px bg-gray-700"></div>

          <div className="flex flex-col w-32">
             <div className="flex justify-between items-center mb-1">
                <label className="text-[9px] uppercase text-gray-500 font-bold tracking-wider">Fotos / Lâmina</label>
                
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isAutoDensity} 
                            onChange={(e) => setIsAutoDensity(e.target.checked)}
                            className="w-3 h-3 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-0"
                        />
                        <span className="text-[10px] text-gray-400 font-medium">Auto</span>
                    </label>

                    {!isAutoDensity && (
                        <div className="flex gap-1 text-[10px] font-bold text-blue-200 bg-blue-900 px-1.5 rounded">
                            <span>{minPhotos}</span>
                            <span className="text-blue-400">-</span>
                            <span>{maxPhotos}</span>
                        </div>
                    )}
                </div>
             </div>
             
             <div className={isAutoDensity ? "opacity-30 pointer-events-none grayscale" : "opacity-100"}>
                 <div className="flex items-center gap-2">
                     <input 
                       type="range" 
                       min={1} 
                       max={30}
                       value={minPhotos}
                       onChange={(e) => {
                           const val = Number(e.target.value);
                           setMinPhotos(val);
                           if (val > maxPhotos) setMaxPhotos(val);
                       }}
                       className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                       title="Mínimo de fotos"
                     />
                     <input 
                       type="range" 
                       min={1} 
                       max={30}
                       value={maxPhotos}
                       onChange={(e) => {
                           const val = Number(e.target.value);
                           setMaxPhotos(val);
                           if (val < minPhotos) setMinPhotos(val);
                       }}
                       className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                       title="Máximo de fotos"
                     />
                 </div>
             </div>
          </div>

          <div className="flex flex-col">
             <label className="text-[9px] uppercase text-gray-500 font-bold tracking-wider">Total Lâminas</label>
             <input 
               type="number" 
               min={1} 
               max={200}
               value={totalSpreads}
               onChange={(e) => onUpdateSpreads(Number(e.target.value))}
               className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 w-16 text-white focus:ring-1 focus:ring-blue-500 text-xs font-mono text-center"
               title="Definir quantidade de lâminas alvo"
             />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
         <div className="flex items-center gap-1 mr-2 bg-gray-800 rounded px-1 border border-gray-700">
             <button onClick={onUndo} disabled={!canUndo} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Desfazer (Ctrl+Z)">
                 <Undo size={18} />
             </button>
             <div className="w-px h-4 bg-gray-700"></div>
             <button onClick={onRedo} disabled={!canRedo} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Refazer (Ctrl+Y)">
                 <Redo size={18} />
             </button>
         </div>

         {onAddSpread && (
             <button 
                onClick={onAddSpread}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-xs font-medium transition-colors border border-gray-700"
                title="Adicionar Lâmina Vazia"
             >
                 <PlusSquare className="w-3.5 h-3.5" /> + Lâmina
             </button>
         )}

         <button 
          onClick={onPreview}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-xs font-medium transition-colors border border-gray-700"
          title="Pré-visualizar Álbum (Flipbook)"
        >
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          Preview
        </button>

         <button 
          onClick={onSaveProject}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-xs font-medium transition-colors border border-gray-700"
          title="Salvar Projeto (.aaproj)"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        <div className="h-6 w-px bg-gray-700 mx-1"></div>

        <div className="flex bg-gray-800 rounded-md border border-gray-700 overflow-hidden shadow-sm">
            <button 
              onClick={handleDistributeClick}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-white text-xs font-bold transition-colors border-r border-gray-700 uppercase tracking-wide"
              title={isAutoDensity ? "Redistribuir em todas as lâminas selecionadas" : `Redistribuir (Entre ${minPhotos} e ${maxPhotos} fotos/lâmina)`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Auto Distribuir
            </button>
            {onRedistributeGlobal && (
                <button 
                  onClick={onRedistributeGlobal}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-purple-900/30 text-purple-200 hover:text-white text-xs font-medium transition-colors"
                  title="Variar ordem e layout global"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
            )}
        </div>

        <div className="h-6 w-px bg-gray-700 mx-1"></div>

        <button 
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
        >
          {isExporting ? (
            <span className="animate-pulse">Exportando...</span>
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
