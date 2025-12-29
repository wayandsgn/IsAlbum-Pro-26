
import React, { useState, useEffect, useRef } from 'react';
import { Layer, ImageAdjustments, Photo, AlbumConfig } from '../types';
import { 
  RotateCw, Sliders, Sun, Palette, Move, Crop, RotateCcw, Contrast, Droplet, Thermometer, Zap, Maximize, MousePointer2, Copy, ClipboardPaste, Check
} from 'lucide-react';

interface PropertiesPanelProps {
  selectedLayer: Layer | null;
  onUpdateLayer: (layer: Layer) => void;
  photos?: Photo[];
  config?: AlbumConfig;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedLayer, onUpdateLayer, photos = [], config }) => {
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('aa_clipboard_adjustments');
    setCanPaste(!!saved);
  }, [selectedLayer]);

  if (!selectedLayer) {
    return (
      <div className="w-80 bg-gray-950 border-l border-gray-900 flex flex-col h-full items-center justify-center text-gray-600 p-8 text-center z-20">
        <Sliders size={48} className="mb-6 opacity-20" />
        <h3 className="text-sm font-semibold text-gray-500">Nenhuma Seleção</h3>
        <p className="text-xs mt-3 max-w-[200px] leading-relaxed">
          Selecione uma foto para editar propriedades.<br/>
          <span className="text-blue-500">Duplo clique</span> para editar o conteúdo (zoom/pan).
        </p>
      </div>
    );
  }

  const selectedPhoto = photos.find(p => p.id === selectedLayer.photoId);

  const handleUpdate = (updates: Partial<ImageAdjustments>) => {
      // Direct update without aggressive clamping to avoid fighting with rotation logic
      const nextAdjustments = { ...selectedLayer.adjustments, ...updates };
      onUpdateLayer({ ...selectedLayer, adjustments: nextAdjustments });
  };

  const handleChange = (key: keyof ImageAdjustments, value: number) => {
      handleUpdate({ [key]: value });
  };

  const handleResetAdjustments = () => {
      onUpdateLayer({
          ...selectedLayer,
          adjustments: {
              ...selectedLayer.adjustments,
              exposure: 0,
              brightness: 0,
              contrast: 0,
              saturation: 0,
              highlights: 0,
              shadows: 0,
              blacks: 0,
              temperature: 0
          }
      });
  };

  const handleCopySettings = () => {
      localStorage.setItem('aa_clipboard_adjustments', JSON.stringify(selectedLayer.adjustments));
      setCopiedFeedback(true);
      setCanPaste(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handlePasteSettings = () => {
      const saved = localStorage.getItem('aa_clipboard_adjustments');
      if (saved) {
          try {
              const adjustments = JSON.parse(saved) as ImageAdjustments;
              handleUpdate({
                  exposure: adjustments.exposure,
                  brightness: adjustments.brightness,
                  contrast: adjustments.contrast,
                  saturation: adjustments.saturation,
                  highlights: adjustments.highlights,
                  shadows: adjustments.shadows,
                  blacks: adjustments.blacks,
                  temperature: adjustments.temperature
                  // Do not paste Transform/Crop settings as they are geometry specific
              });
          } catch (e) { console.error("Failed to paste settings", e); }
      }
  };

  return (
    <div className="w-80 bg-[#0F1115] border-l border-gray-900 flex flex-col h-full overflow-hidden z-20">
      {/* Header */}
      <div className="h-12 border-b border-gray-900 flex items-center justify-between px-4 bg-[#16191D]">
         <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
           <Sliders size={14} className="text-blue-500" /> Ajustes
         </div>
         <div className="flex items-center gap-1">
             <button 
                onClick={handleCopySettings}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors relative"
                title="Copiar Ajustes (Preset)"
             >
                 {copiedFeedback ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
             </button>
             <button 
                onClick={handlePasteSettings}
                disabled={!canPaste}
                className={`p-1.5 rounded transition-colors ${canPaste ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-700 cursor-not-allowed'}`}
                title="Colar Ajustes"
             >
                 <ClipboardPaste size={14} />
             </button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          
          {/* Crop / Preview Box */}
          {selectedPhoto && config && (
              <CropPreview 
                  photo={selectedPhoto} 
                  layer={selectedLayer} 
                  config={config} 
                  onChange={(panX, panY) => handleUpdate({ panX, panY })}
              />
          )}

          {/* Group: Content Transform */}
          <div className="space-y-3">
              <GroupHeader icon={Maximize} title="Enquadramento" />
              <div className="bg-[#1A1D23] rounded-lg p-3 space-y-4 border border-gray-800">
                  <ProSlider 
                      label="Zoom" 
                      value={selectedLayer.adjustments.scale} 
                      min={0.1} max={3} step={0.01} 
                      defaultValue={1}
                      onChange={(v) => handleChange('scale', v)}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                  <ProSlider 
                      label="Rotação" 
                      value={selectedLayer.adjustments.rotation} 
                      min={-180} max={180} 
                      defaultValue={0} 
                      bipolar
                      onChange={(v) => handleChange('rotation', v)}
                      formatValue={(v) => `${Math.round(v)}°`}
                  />
                  <div className="grid grid-cols-2 gap-3 pt-1">
                      <ProSlider label="X" compact value={selectedLayer.adjustments.panX} min={-1000} max={1000} defaultValue={0} bipolar onChange={(v) => handleChange('panX', v)} />
                      <ProSlider label="Y" compact value={selectedLayer.adjustments.panY} min={-1000} max={1000} defaultValue={0} bipolar onChange={(v) => handleChange('panY', v)} />
                  </div>
              </div>
          </div>

          {/* Group: Light & Color */}
          <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <GroupHeader icon={Sun} title="Luz & Cor" />
                 <button 
                   onClick={handleResetAdjustments}
                   className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-white bg-gray-800 px-2 py-0.5 rounded transition-colors"
                   title="Restaurar Padrões de Cor"
                 >
                     <RotateCcw size={10} /> Resetar
                 </button>
              </div>
              
              <div className="bg-[#1A1D23] rounded-lg p-3 space-y-4 border border-gray-800">
                  <ProSlider label="Brilho" value={selectedLayer.adjustments.brightness} min={-100} max={100} defaultValue={0} bipolar onChange={(v) => handleChange('brightness', v)} />
                  <ProSlider label="Contraste" value={selectedLayer.adjustments.contrast} min={-100} max={100} defaultValue={0} bipolar onChange={(v) => handleChange('contrast', v)} />
                  
                  <div className="h-px bg-gray-800 mx-1"></div>

                  <ProSlider label="Saturação" value={selectedLayer.adjustments.saturation} min={-100} max={100} defaultValue={0} bipolar onChange={(v) => handleChange('saturation', v)} />
                  <ProSlider label="Temp." value={selectedLayer.adjustments.temperature} min={-100} max={100} defaultValue={0} bipolar onChange={(v) => handleChange('temperature', v)} />
              </div>
          </div>
          
          <div className="h-10"></div>
      </div>
    </div>
  );
};

const CropPreview: React.FC<{ 
    photo: Photo, 
    layer: Layer, 
    config: AlbumConfig,
    onChange: (panX: number, panY: number) => void
}> = ({ photo, layer, config, onChange }) => {
    const startRef = useRef<{x: number, y: number, startPanX: number, startPanY: number} | null>(null);
    
    // Calculate aspect ratios and base dims
    const frameW = (layer.width / 100) * config.spreadWidth;
    const frameH = (layer.height / 100) * config.spreadHeight;
    const frameAR = frameW / frameH;
    const photoAR = photo.aspectRatio;

    // Sidebar Viewport Logic
    const maxDisplayWidth = 220; // Decreased slightly to ensure fitting with margins
    const maxDisplayHeight = 220;

    // Calculate display dimensions keeping AR, fitting within the box
    let displayWidth = maxDisplayWidth;
    let displayHeight = displayWidth / frameAR;

    if (displayHeight > maxDisplayHeight) {
        displayHeight = maxDisplayHeight;
        displayWidth = displayHeight * frameAR;
    }

    const displayScale = displayWidth / frameW;

    // Calculate dimensions of the inner photo at scale=1 (Cover Logic)
    let baseImgW, baseImgH;
    if (photoAR > frameAR) { baseImgH = frameH; baseImgW = frameH * photoAR; } 
    else { baseImgW = frameW; baseImgH = frameW / photoAR; }

    // Dimensions at current zoom
    const renderImgW = baseImgW * layer.adjustments.scale * displayScale;
    const renderImgH = baseImgH * layer.adjustments.scale * displayScale;
    
    // Current Pan (scaled to UI)
    const renderPanX = layer.adjustments.panX * displayScale;
    const renderPanY = layer.adjustments.panY * displayScale;

    // UI Container Dims (Adding padding visual only, not affecting calculation)
    const containerPadding = 20;

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        startRef.current = {
            x: e.clientX,
            y: e.clientY,
            startPanX: layer.adjustments.panX,
            startPanY: layer.adjustments.panY
        };
        
        const handleMouseMove = (ev: MouseEvent) => {
            if (!startRef.current) return;
            const dx = ev.clientX - startRef.current.x;
            const dy = ev.clientY - startRef.current.y;
            
            // Adjust vector for rotation
            const rad = (layer.adjustments.rotation * Math.PI) / 180;
            const cos = Math.cos(-rad);
            const sin = Math.sin(-rad);
            
            const rDx = dx * cos - dy * sin;
            const rDy = dx * sin + dy * cos;

            // Map back to spread pixels
            const deltaPanX = rDx / displayScale;
            const deltaPanY = rDy / displayScale;
            
            onChange(startRef.current.startPanX + deltaPanX, startRef.current.startPanY + deltaPanY);
        };
        
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            startRef.current = null;
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-widest px-1">
                <Crop size={12} className="text-blue-500" /> Visualização e Corte
            </h3>
            
            {/* Main Flex Container for Centering */}
            <div 
                className="w-full bg-[#0a0a0a] border border-gray-800 rounded-md relative cursor-move group overflow-hidden flex items-center justify-center"
                style={{ height: maxDisplayHeight + (containerPadding * 2) }}
                onMouseDown={handleMouseDown}
            >
                {/* Reference Center Lines for the Container */}
                <div className="absolute w-full h-px bg-gray-800/50 pointer-events-none" />
                <div className="absolute h-full w-px bg-gray-800/50 pointer-events-none" />

                {/* The Visible Frame Wrapper */}
                <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
                    
                    {/* 1. Ghost Image (Outside Frame) - Low Opacity */}
                    <div className="absolute top-1/2 left-1/2 flex items-center justify-center pointer-events-none overflow-visible"
                        style={{ 
                            width: renderImgW, 
                            height: renderImgH,
                            transform: `translate(-50%, -50%) translate(${renderPanX}px, ${renderPanY}px) rotate(${layer.adjustments.rotation}deg)` 
                        }}
                    >
                        <img 
                            src={photo.previewUrl} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15, filter: 'grayscale(100%)' }}
                            draggable={false}
                            alt=""
                        />
                    </div>

                    {/* 2. The Frame (Crop Window) - Border */}
                    <div className="absolute inset-0 border border-blue-500/80 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] z-10 pointer-events-none rounded-[1px]"></div>
                    
                    {/* 3. The Actual Cropped Image (High Opacity) inside the Frame */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 flex items-center justify-center"
                            style={{ 
                                width: renderImgW, 
                                height: renderImgH,
                                transform: `translate(-50%, -50%) translate(${renderPanX}px, ${renderPanY}px) rotate(${layer.adjustments.rotation}deg)` 
                            }}
                        >
                            <img 
                                src={photo.previewUrl} 
                                style={{ 
                                    width: '100%', height: '100%', objectFit: 'cover',
                                    filter: `brightness(${100+layer.adjustments.brightness}%) contrast(${100+layer.adjustments.contrast}%) saturate(${100+layer.adjustments.saturation}%) hue-rotate(${layer.adjustments.temperature}deg)`
                                }}
                                draggable={false}
                                alt=""
                            />
                        </div>
                    </div>
                </div>

                {/* Overlay Hint */}
                <div className="absolute top-2 right-2 pointer-events-none">
                     <Move size={16} className="text-white/50" />
                </div>
            </div>
            <p className="text-[10px] text-gray-500 text-center">
                A parte escurecida será cortada. Arraste para ajustar.
            </p>
        </div>
    );
};

const GroupHeader: React.FC<{ icon: React.ElementType, title: string }> = ({ icon: Icon, title }) => (
    <h3 className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-widest px-1">
        <Icon size={12} className="text-blue-500" /> {title}
    </h3>
);

interface ProSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    defaultValue?: number;
    onChange: (val: number) => void;
    icon?: React.ElementType;
    bipolar?: boolean; 
    compact?: boolean;
    formatValue?: (v: number) => string;
}

const ProSlider: React.FC<ProSliderProps> = ({ 
    label, value, min, max, step = 1, defaultValue = 0, onChange, icon: Icon, bipolar = false, compact = false, formatValue
}) => {
    const isChanged = value !== defaultValue;
    
    // Visual calc
    let barLeft = '0%', barWidth = '0%';
    if (bipolar) {
        const range = max - min; 
        const center = (max + min) / 2;
        const pct = ((value - center) / (range/2)) * 50; 
        if (pct > 0) { barLeft = '50%'; barWidth = `${pct}%`; } 
        else { barLeft = `${50 + pct}%`; barWidth = `${Math.abs(pct)}%`; }
    } else {
        const pct = ((value - min) / (max - min)) * 100;
        barLeft = '0%'; barWidth = `${pct}%`;
    }

    return (
        <div className="group">
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2 text-xs">
                    {Icon && <Icon size={12} className={isChanged ? 'text-blue-400' : 'text-gray-600'} />}
                    <span className={`font-medium ${isChanged ? 'text-gray-200' : 'text-gray-400'} transition-colors`}>{label}</span>
                </div>
                <div className="flex items-center gap-1 group/input">
                     {isChanged && (
                        <button onClick={() => onChange(defaultValue)} className="text-gray-600 hover:text-white transition-colors" title="Reset">
                            <RotateCcw size={10} />
                        </button>
                    )}
                    <span className={`text-[10px] font-mono w-10 text-right ${isChanged ? 'text-blue-400' : 'text-gray-500 group-hover/input:text-gray-400'}`}>
                        {formatValue ? formatValue(value) : Math.round(value)}
                    </span>
                </div>
            </div>

            <div className="relative h-4 flex items-center cursor-pointer touch-none">
                {/* Track */}
                <div className="absolute left-0 right-0 h-1 bg-gray-800 rounded-full overflow-hidden">
                    {bipolar && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600"></div>}
                    <div className={`absolute top-0 bottom-0 transition-all duration-75 ${isChanged ? 'bg-blue-500' : 'bg-gray-600'}`} style={{ left: barLeft, width: barWidth }} />
                </div>
                
                {/* Input */}
                <input 
                    type="range" min={min} max={max} step={step} value={value} 
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                />

                {/* Thumb */}
                <div 
                    className={`absolute h-3 w-3 bg-gray-200 rounded-full shadow border border-gray-900 pointer-events-none transition-transform duration-75 ${isChanged ? 'bg-white scale-110' : 'scale-0 group-hover:scale-100'}`}
                    style={{ left: bipolar ? `${((value - min) / (max - min)) * 100}%` : `${((value - min) / (max - min)) * 100}%`, transform: 'translateX(-50%)' }}
                />
            </div>
        </div>
    );
};
