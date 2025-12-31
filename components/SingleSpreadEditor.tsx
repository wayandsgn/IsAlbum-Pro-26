
import React, { useState } from 'react';
import { Spread, Photo, Layer, AlbumConfig } from '../types';
import { 
  ArrowLeft, 
  RotateCw, 
  Sliders, 
  Sun, 
  Palette, 
  Move, 
  Crop,
  RotateCcw,
  Contrast,
  Droplet,
  Thermometer,
  Zap,
  Maximize,
  Sparkles
} from 'lucide-react';
import { AlbumCanvas } from './AlbumCanvas';

interface SingleSpreadEditorProps {
  spread: Spread;
  photos: Photo[];
  config: AlbumConfig;
  onBack: () => void;
  onUpdateLayer: (spreadId: string, layer: Layer) => void;
  onUpdateLayers: (spreadId: string, layers: Layer[]) => void;
  onShowTemplates?: () => void;
  onRedistribute?: () => void;
  onOptimize?: () => void;
  selectedLayerIds?: Set<string>;
  onSelectLayerIds?: (ids: Set<string>) => void;
}

export const SingleSpreadEditor: React.FC<SingleSpreadEditorProps> = ({
  spread,
  photos,
  config,
  onBack,
  onUpdateLayer,
  onUpdateLayers,
  selectedLayerIds: propSelectedLayerIds,
  onSelectLayerIds
}) => {
  const [internalSelectedLayerIds, setInternalSelectedLayerIds] = useState<Set<string>>(new Set());
  
  // Use prop controlled state if available, otherwise local
  const activeIds = propSelectedLayerIds !== undefined ? propSelectedLayerIds : internalSelectedLayerIds;
  const handleSelect = (ids: Set<string>) => {
      if (onSelectLayerIds) onSelectLayerIds(ids);
      else setInternalSelectedLayerIds(ids);
  };

  // Find the "primary" selected layer for adjustments (first one found)
  const activeId = activeIds.size > 0 ? Array.from(activeIds)[0] : null;
  const selectedLayer = spread.layers.find(l => l.id === activeId);
  const selectedPhoto = selectedLayer ? photos.find(p => p.id === selectedLayer.photoId) : null;

  const handleAdjustmentChange = (key: keyof Layer['adjustments'], value: number) => {
    if (!selectedLayer) return;
    const updatedLayer = {
      ...selectedLayer,
      adjustments: {
        ...selectedLayer.adjustments,
        [key]: value
      }
    };
    onUpdateLayer(spread.id, updatedLayer);
  };

  return (
    <div className="flex h-full bg-gray-950 w-full text-gray-200">
      {/* Left: Canvas Area */}
      <div className="flex-1 flex flex-col relative bg-[#0a0a0a] overflow-hidden">
        <div className="absolute top-4 left-4 z-50">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-gray-200 rounded-md hover:bg-gray-800 hover:text-white shadow-lg border border-gray-800 transition-all text-sm font-medium">
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-8 custom-scrollbar bg-dots-pattern">
            <div className="w-full max-w-5xl shadow-2xl">
                <AlbumCanvas 
                  spread={spread}
                  photos={photos}
                  config={config}
                  isActive={true}
                  selectedLayerIds={activeIds}
                  onSelectSpread={() => {}} 
                  onSelectionChange={handleSelect}
                  onUpdateLayers={onUpdateLayers}
                  onDeleteLayers={() => {}} 
                  onPhotoDrop={() => {}}
                />
                 
                 {/* Thumbnails below canvas for quick selection */}
                 <div className="mt-8 flex flex-wrap gap-3 justify-center">
                    {spread.layers.map((l, idx) => {
                             const p = photos.find(ph => ph.id === l.photoId);
                             const isSelected = activeIds.has(l.id);
                             return (
                                 <button 
                                    key={l.id}
                                    onClick={(e) => {
                                        let newSet = new Set(activeIds);
                                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                            if (newSet.has(l.id)) newSet.delete(l.id);
                                            else newSet.add(l.id);
                                        } else {
                                            newSet = new Set([l.id]);
                                        }
                                        handleSelect(newSet);
                                    }}
                                    className={`relative w-14 h-14 rounded-md overflow-hidden transition-all duration-200 border-2 ${isSelected ? 'border-blue-500 scale-110 shadow-lg z-10' : 'border-gray-800 opacity-60 hover:opacity-100 hover:scale-105'}`}
                                 >
                                     <img src={p?.previewUrl} className="w-full h-full object-cover" />
                                     <div className={`absolute inset-0 ${isSelected ? 'bg-transparent' : 'bg-black/20 group-hover:bg-transparent'}`}></div>
                                 </button>
                             )
                        })}
                 </div>
            </div>
        </div>
      </div>

      {/* Right: Adjustment Sidebar */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-hidden shadow-2xl z-20">
        <div className="p-5 border-b border-gray-800 bg-gray-900 z-10">
           <h2 className="font-semibold text-gray-100 flex items-center gap-2 text-xs uppercase tracking-widest">
             <Sliders size={14} className="text-blue-500" /> Editor de Imagem
           </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!selectedLayer ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600 p-8 text-center">
                  <Move size={48} className="mb-4 opacity-50" />
                  <p className="text-sm">Selecione uma foto na lâmina para habilitar os ajustes.</p>
                  {activeIds.size > 1 && <p className="text-xs text-blue-400 mt-2">Múltiplos itens selecionados.</p>}
              </div>
          ) : (
              <div className="p-5 space-y-8">
                  
                  {/* Transform Section */}
                  <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-widest mb-3">
                          <Crop size={12} /> Geometria
                      </h3>
                      <div className="space-y-5">
                           <ProSlider 
                              label="Zoom / Escala" 
                              icon={Maximize}
                              value={selectedLayer.adjustments.scale} 
                              min={0.1} max={3} step={0.01}
                              defaultValue={1}
                              onChange={(v) => handleAdjustmentChange('scale', v)} 
                           />
                           <ProSlider 
                              label="Rotação" 
                              icon={RotateCw}
                              value={selectedLayer.adjustments.rotation} 
                              min={-45} max={45} 
                              defaultValue={0}
                              bipolar
                              onChange={(v) => handleAdjustmentChange('rotation', v)} 
                           />
                           <div className="grid grid-cols-2 gap-4">
                              <ProSlider 
                                  label="Pan X" 
                                  icon={Move}
                                  value={selectedLayer.adjustments.panX} 
                                  min={-200} max={200} 
                                  defaultValue={0}
                                  bipolar
                                  compact
                                  onChange={(v) => handleAdjustmentChange('panX', v)} 
                              />
                              <ProSlider 
                                  label="Pan Y" 
                                  icon={Move}
                                  value={selectedLayer.adjustments.panY} 
                                  min={-200} max={200} 
                                  defaultValue={0}
                                  bipolar
                                  compact
                                  onChange={(v) => handleAdjustmentChange('panY', v)} 
                              />
                           </div>
                      </div>
                  </div>
                  
                  <div className="h-px bg-gray-800 w-full" />

                  {/* Light Section */}
                  <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-widest mb-3">
                          <Sun size={12} /> Luz & Brilho
                      </h3>
                      
                       <ProSlider 
                          label="Brilho" 
                          icon={Sun}
                          value={selectedLayer.adjustments.brightness} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('brightness', v)} 
                       />
                       <ProSlider 
                          label="Exposição" 
                          icon={Sparkles}
                          value={selectedLayer.adjustments.exposure} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('exposure', v)} 
                       />
                       <ProSlider 
                          label="Contraste" 
                          icon={Contrast}
                          value={selectedLayer.adjustments.contrast} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('contrast', v)} 
                       />
                       <div className="h-px bg-gray-800/50 w-full" />
                       <ProSlider 
                          label="Realces" 
                          icon={Zap}
                          value={selectedLayer.adjustments.highlights} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('highlights', v)} 
                       />
                       <ProSlider 
                          label="Sombras" 
                          icon={Zap}
                          value={selectedLayer.adjustments.shadows} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('shadows', v)} 
                       />
                        <ProSlider 
                          label="Pretos" 
                          icon={Droplet}
                          value={selectedLayer.adjustments.blacks} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('blacks', v)} 
                       />
                  </div>

                  <div className="h-px bg-gray-800 w-full" />

                  {/* Color Section */}
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-widest mb-3">
                          <Palette size={12} /> Cor & Temperatura
                      </h3>
                      
                       <ProSlider 
                          label="Saturação" 
                          icon={Droplet}
                          value={selectedLayer.adjustments.saturation} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('saturation', v)} 
                       />
                       <ProSlider 
                          label="Temperatura" 
                          icon={Thermometer}
                          value={selectedLayer.adjustments.temperature} 
                          min={-100} max={100} 
                          defaultValue={0}
                          bipolar
                          onChange={(v) => handleAdjustmentChange('temperature', v)} 
                       />
                  </div>
                  
                  <div className="h-12"></div> 
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

interface ProSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    defaultValue?: number;
    onChange: (val: number) => void;
    icon?: React.ElementType;
    bipolar?: boolean; // Center origin (e.g. -100 to 100)
    compact?: boolean;
    formatValue?: (v: number) => string;
}

const ProSlider: React.FC<ProSliderProps> = ({ 
    label, 
    value, 
    min, 
    max, 
    step = 1, 
    defaultValue = 0,
    onChange, 
    icon: Icon,
    bipolar = false,
    compact = false,
    formatValue
}) => {
    const isChanged = value !== defaultValue;
    
    // Calculate percentage for bar visual
    let barLeft = '0%';
    let barWidth = '0%';

    if (bipolar) {
        const range = max - min; 
        const center = (max + min) / 2;
        const pct = ((value - center) / (range/2)) * 50; // -50 to 50
        
        if (pct > 0) {
            barLeft = '50%';
            barWidth = `${pct}%`;
        } else {
            barLeft = `${50 + pct}%`; // pct is negative
            barWidth = `${Math.abs(pct)}%`;
        }
    } else {
        const pct = ((value - min) / (max - min)) * 100;
        barLeft = '0%';
        barWidth = `${pct}%`;
    }

    return (
        <div className="space-y-2 group">
            <div className="flex justify-between items-end text-xs">
                <div className="flex items-center gap-2">
                    {Icon && <Icon size={12} className={isChanged ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-500'} />}
                    <span className={`font-medium ${isChanged ? 'text-blue-100' : 'text-gray-400 group-hover:text-gray-300'} transition-colors`}>{label}</span>
                </div>
                
                <div className="flex items-center gap-2">
                     {isChanged && (
                        <button 
                            onClick={() => onChange(defaultValue)}
                            className="text-gray-600 hover:text-white transition-colors"
                            title="Resetar"
                        >
                            <RotateCcw size={10} />
                        </button>
                    )}
                    <input 
                        type="number" 
                        value={value}
                        onChange={(e) => {
                            let v = parseFloat(e.target.value);
                            if (isNaN(v)) v = defaultValue;
                            v = Math.min(max, Math.max(min, v));
                            onChange(v);
                        }}
                        className={`w-12 bg-gray-800 rounded px-1 py-0.5 text-right outline-none font-mono text-[10px] ${isChanged ? 'text-blue-400 font-bold' : 'text-gray-400'} focus:text-white focus:bg-gray-700 focus:ring-1 focus:ring-blue-500/50 transition-all`}
                    />
                </div>
            </div>

            <div className="relative h-4 flex items-center cursor-pointer">
                {/* Track Background */}
                <div className="absolute left-0 right-0 h-1 bg-gray-800 rounded-full overflow-hidden">
                    {/* Center marker for bipolar */}
                    {bipolar && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-700"></div>}
                    
                    {/* Fill Bar */}
                    <div 
                        className={`absolute top-0 bottom-0 transition-all duration-100 ${isChanged ? 'bg-blue-600' : 'bg-transparent'}`}
                        style={{ left: barLeft, width: barWidth }}
                    ></div>
                </div>

                {/* Invisible Touch/Click Area + Thumb logic provided by native input */}
                <input 
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {/* Visual Thumb (Follows value) */}
                <div 
                    className={`absolute h-3 w-3 bg-gray-300 rounded-full shadow-md pointer-events-none transition-transform duration-75 border border-gray-900 ${isChanged ? 'bg-white scale-110' : 'scale-100 group-hover:bg-white'}`}
                    style={{ 
                        left: bipolar 
                            ? `${((value - min) / (max - min)) * 100}%`
                            : `${((value - min) / (max - min)) * 100}%`,
                        transform: 'translateX(-50%)'
                    }}
                >
                </div>
            </div>
        </div>
    );
};
