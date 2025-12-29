
import React, { useRef, useState, useEffect } from 'react';
import { AlbumConfig, Spread, Photo, Layer } from '../types';
import { clsx } from 'clsx';
import { 
  AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, FoldVertical, ArrowDownToLine,
  Trash, Layout, Maximize2, Wand2, RotateCw, ZoomIn, BringToFront, SendToBack,
  Grid as GridIcon, Magnet, ListRestart, Lock, Unlock, Trash2, Edit3
} from 'lucide-react';

export interface AlbumCanvasProps {
  spread: Spread;
  photos: Photo[];
  config: AlbumConfig;
  isActive: boolean;
  onSelectSpread: () => void;
  onUpdateLayers: (spreadId: string, layers: Layer[]) => void;
  onDeleteLayers: (spreadId: string, layerIds: string[]) => void;
  onDeleteSpread?: (spreadId: string) => void;
  onPhotoDrop: (spreadId: string, photoId: string, x: number, y: number, targetLayerId?: string, modifiers?: { ctrlKey: boolean }) => void;
  onShowTemplates?: () => void;
  onRedistribute?: () => void;
  onDistributeFromHere?: () => void;
  onToggleLock?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  selectedLayerIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

type InteractionMode = 'IDLE' | 'MOVING' | 'RESIZING' | 'ROTATING' | 'INTERNAL_EDIT' | 'INTERNAL_SCALE' | 'INTERNAL_ROTATE';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const SNAP_THRESHOLD = 0.8; 
const GRID_SIZE = 5; 

interface GapGuide {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
}

export const AlbumCanvas: React.FC<AlbumCanvasProps> = ({ 
  spread, photos, config, isActive, onSelectSpread, onUpdateLayers, onDeleteLayers, onDeleteSpread,
  onPhotoDrop, onShowTemplates, onRedistribute, onDistributeFromHere, onToggleLock, onUndo, canUndo,
  selectedLayerIds: controlledSelectedLayerIds, onSelectionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalSelectedLayerIds, setInternalSelectedLayerIds] = useState<Set<string>>(new Set());
  const selectedLayerIds = controlledSelectedLayerIds ?? internalSelectedLayerIds;

  const [interactionMode, setInteractionMode] = useState<InteractionMode>('IDLE');
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | 'rot' | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; layerId: string | null }>({
      visible: false, x: 0, y: 0, layerId: null
  });

  const [snapLines, setSnapLines] = useState<{ x?: number | null, y?: number | null }>({});
  const [gapGuides, setGapGuides] = useState<GapGuide[]>([]);
  
  const [showGrid, setShowGrid] = useState(false);
  const [enableSmartGuides, setEnableSmartGuides] = useState(true);
  
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const initialLayersState = useRef<Map<string, Layer>>(new Map());
  const groupBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const rotationStart = useRef<{ startAngle: number, centerX: number, centerY: number } | null>(null);

  const aspectRatio = config.spreadWidth / config.spreadHeight;

  const gapPctX = (config.gap / config.spreadWidth) * 100;
  const gapPctY = (config.gap / config.spreadHeight) * 100;

  const handleSelectionUpdate = (update: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    const prevIds = selectedLayerIds;
    let newSet: Set<string>;
    if (typeof update === 'function') {
        newSet = update(prevIds);
    } else {
        newSet = update;
    }
    if (onSelectionChange) onSelectionChange(newSet);
    if (!controlledSelectedLayerIds) setInternalSelectedLayerIds(newSet);
  };

  const handleToggleLayerLock = (e: React.MouseEvent, layer: Layer) => {
      e.stopPropagation();
      const updatedLayers = spread.layers.map(l => {
          if (l.id !== layer.id) return l;
          return { ...l, isLocked: !l.isLocked };
      });
      onUpdateLayers(spread.id, updatedLayers);
  };

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerIds.size > 0 && !editingLayerId) {
        onDeleteLayers(spread.id, Array.from(selectedLayerIds));
        handleSelectionUpdate(new Set<string>());
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          if (onUndo) onUndo();
      }
      if (e.key === 'Escape') {
          setEditingLayerId(null);
          setInteractionMode('IDLE');
          handleSelectionUpdate(new Set<string>());
          setContextMenu({ ...contextMenu, visible: false });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedLayerIds, spread.id, onDeleteLayers, onUndo, editingLayerId, contextMenu]);

  const handleLayerMouseDown = (e: React.MouseEvent, layer: Layer) => {
    e.stopPropagation();
    onSelectSpread();
    
    setContextMenu({ ...contextMenu, visible: false });

    if (editingLayerId === layer.id) {
        setInteractionMode('INTERNAL_EDIT');
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialLayersState.current = new Map([[layer.id, { ...layer }]]);
        return;
    }
    
    setEditingLayerId(null);
    dragStart.current = { x: e.clientX, y: e.clientY };
    
    let newSelection = new Set<string>(selectedLayerIds);
    
    if (e.shiftKey) {
        if (newSelection.has(layer.id)) {
            newSelection.delete(layer.id);
        } else {
            newSelection.add(layer.id);
        }
        handleSelectionUpdate(newSelection);
    } else {
        if (!newSelection.has(layer.id)) {
            newSelection = new Set<string>([layer.id]);
            handleSelectionUpdate(newSelection);
        }
    }

    const stateMap = new Map<string, Layer>();
    spread.layers.forEach(l => {
        if (newSelection.has(l.id)) {
            stateMap.set(l.id, { ...l });
        }
    });
    
    initialLayersState.current = stateMap;
    if (!spread.isLocked && !layer.isLocked) {
        setInteractionMode('MOVING');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, layer: Layer) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectSpread();
      
      if (!selectedLayerIds.has(layer.id)) {
          handleSelectionUpdate(new Set([layer.id]));
      }

      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          layerId: layer.id
      });
  };

  const handleGlobalClick = () => {
      if (contextMenu.visible) {
          setContextMenu({ ...contextMenu, visible: false });
      }
  };

  useEffect(() => {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu.visible]);

  const handleLayerDoubleClick = (e: React.MouseEvent, layer: Layer) => {
      e.stopPropagation();
      setEditingLayerId(layer.id);
      handleSelectionUpdate(new Set([layer.id]));
      setInteractionMode('IDLE');
  };

  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle, layer: Layer) => {
    if (spread.isLocked || layer.isLocked) return; 
    e.stopPropagation();
    setInteractionMode('RESIZING');
    setActiveHandle(handle);
    dragStart.current = { x: e.clientX, y: e.clientY };
    
    const stateMap = new Map<string, Layer>();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    spread.layers.forEach(l => {
        if (selectedLayerIds.has(l.id)) {
            stateMap.set(l.id, { ...l });
            minX = Math.min(minX, l.x);
            minY = Math.min(minY, l.y);
            maxX = Math.max(maxX, l.x + l.width);
            maxY = Math.max(maxY, l.y + l.height);
        }
    });

    if (stateMap.size > 0) {
        groupBounds.current = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    initialLayersState.current = stateMap;
  };

  const handleRotateStart = (e: React.MouseEvent, layer: Layer) => {
      if (spread.isLocked || layer.isLocked) return;
      e.stopPropagation();
      setInteractionMode('ROTATING');
      setActiveHandle('rot');

      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.left + ((layer.x + layer.width / 2) / 100) * rect.width;
          const centerY = rect.top + ((layer.y + layer.height / 2) / 100) * rect.height;
          
          const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
          
          rotationStart.current = {
              startAngle: startAngle - layer.rotation,
              centerX,
              centerY
          };
          initialLayersState.current = new Map([[layer.id, { ...layer }]]);
      }
  };

  const handleContentResizeStart = (e: React.MouseEvent, handle: ResizeHandle, layer: Layer) => {
      e.stopPropagation();
      setInteractionMode('INTERNAL_SCALE');
      setActiveHandle(handle);
      dragStart.current = { x: e.clientX, y: e.clientY };
      initialLayersState.current = new Map([[layer.id, { ...layer }]]);
  };

  const handleWheel = (e: React.WheelEvent, layer: Layer) => {
      if (editingLayerId !== layer.id) return;
      e.stopPropagation();
      const zoomSensitivity = 0.001;
      const newScale = Math.max(0.1, Math.min(5, layer.adjustments.scale - e.deltaY * zoomSensitivity));
      const updatedLayers = spread.layers.map(l => l.id !== layer.id ? l : { ...l, adjustments: { ...l.adjustments, scale: newScale }});
      onUpdateLayers(spread.id, updatedLayers);
  };

  const updateContentRotation = (layerId: string, delta: number) => {
      const updatedLayers = spread.layers.map(l => {
          if (l.id !== layerId) return l;
          return { ...l, adjustments: { ...l.adjustments, rotation: l.adjustments.rotation + delta }};
      });
      onUpdateLayers(spread.id, updatedLayers);
  };

  useEffect(() => {
    if (interactionMode === 'IDLE') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const dxPx = dragStart.current ? e.clientX - dragStart.current.x : 0;
      const dyPx = dragStart.current ? e.clientY - dragStart.current.y : 0;
      let dxPct = (dxPx / rect.width) * 100;
      let dyPct = (dyPx / rect.height) * 100;

      let newSnapLines = { x: null as number | null, y: null as number | null };
      let newGapGuides: GapGuide[] = [];

      const updatedLayers = spread.layers.map(originalLayer => {
          const initialState = initialLayersState.current.get(originalLayer.id);
          if (!initialState) return originalLayer; 
          
          let newLayer = { ...initialState };

          if (interactionMode === 'MOVING') {
            let newX = initialState.x + dxPct;
            let newY = initialState.y + dyPct;

            if (selectedLayerIds.size === 1 && enableSmartGuides && !spread.isLocked) {
                const candidatesX: { val: number, source: 'grid' | 'gap', gapStart?: number }[] = [];
                const candidatesY: { val: number, source: 'grid' | 'gap', gapStart?: number }[] = [];
                
                const gridTargetsX = [0, 50, 100];
                const gridTargetsY = [0, 50, 100];
                if (showGrid) {
                    for (let i = GRID_SIZE; i < 100; i += GRID_SIZE) {
                        gridTargetsX.push(i);
                        gridTargetsY.push(i);
                    }
                }
                
                spread.layers.forEach(other => {
                      if (selectedLayerIds.has(other.id)) return;
                      gridTargetsX.push(other.x, other.x + other.width, other.x + other.width/2);
                      gridTargetsY.push(other.y, other.y + other.height, other.y + other.height/2);
                });

                gridTargetsX.forEach(t => candidatesX.push({ val: t, source: 'grid' }));
                gridTargetsY.forEach(t => candidatesY.push({ val: t, source: 'grid' }));

                spread.layers.forEach(other => {
                    if (selectedLayerIds.has(other.id)) return;
                    candidatesX.push({ val: other.x + other.width + gapPctX, source: 'gap', gapStart: other.x + other.width });
                    candidatesX.push({ val: other.x - gapPctX - newLayer.width, source: 'gap', gapStart: other.x - gapPctX });
                    candidatesY.push({ val: other.y + other.height + gapPctY, source: 'gap', gapStart: other.y + other.height });
                    candidatesY.push({ val: other.y - gapPctY - newLayer.height, source: 'gap', gapStart: other.y - gapPctY });
                });

                let closestX = null;
                let minDiffX = SNAP_THRESHOLD;
                for (const c of candidatesX) {
                    const diff = Math.abs(newX - c.val);
                    if (diff < minDiffX) { minDiffX = diff; closestX = c; }
                }
                if (closestX) {
                    newX = closestX.val;
                    if (closestX.source === 'gap' && closestX.gapStart !== undefined) {
                        const gStart = Math.min(closestX.gapStart, newX + (newX < closestX.gapStart ? newLayer.width : 0));
                        newGapGuides.push({ x: gStart, y: newY + newLayer.height/2 - 2, width: gapPctX, height: 0, label: `${config.gap}px` });
                        newSnapLines.x = closestX.gapStart; 
                    } else {
                        newSnapLines.x = closestX.val;
                    }
                }

                let closestY = null;
                let minDiffY = SNAP_THRESHOLD;
                for (const c of candidatesY) {
                    const diff = Math.abs(newY - c.val);
                    if (diff < minDiffY) { minDiffY = diff; closestY = c; }
                }
                if (closestY) {
                    newY = closestY.val;
                    if (closestY.source === 'gap' && closestY.gapStart !== undefined) {
                        const gStart = Math.min(closestY.gapStart, newY + (newY < closestY.gapStart ? newLayer.height : 0));
                        newGapGuides.push({ x: newX + newLayer.width/2 - 2, y: gStart, width: 0, height: gapPctY, label: `${config.gap}px` });
                        newSnapLines.y = closestY.gapStart;
                    } else {
                         newSnapLines.y = closestY.val;
                    }
                }
            }
            newLayer.x = newX;
            newLayer.y = newY;

          } else if (interactionMode === 'RESIZING' && activeHandle && selectedLayerIds.has(newLayer.id) && !spread.isLocked && !newLayer.isLocked) {
             const oldBounds = groupBounds.current;
             
             if (oldBounds && oldBounds.w > 0 && oldBounds.h > 0) {
                 // Group Resizing Logic
                 let newBoundsX = oldBounds.x;
                 let newBoundsY = oldBounds.y;
                 let newBoundsW = oldBounds.w;
                 let newBoundsH = oldBounds.h;
                 const minSize = 2;

                 if (activeHandle.includes('e')) newBoundsW = Math.max(minSize, oldBounds.w + dxPct);
                 if (activeHandle.includes('w')) {
                     const potentialW = Math.max(minSize, oldBounds.w - dxPct);
                     newBoundsX = oldBounds.x + (oldBounds.w - potentialW); 
                     newBoundsW = potentialW;
                 }
                 if (activeHandle.includes('s')) newBoundsH = Math.max(minSize, oldBounds.h + dyPct);
                 if (activeHandle.includes('n')) {
                     const potentialH = Math.max(minSize, oldBounds.h - dyPct);
                     newBoundsY = oldBounds.y + (oldBounds.h - potentialH); 
                     newBoundsH = potentialH;
                 }
                 
                 // Proportional Scaling
                 const relX = (initialState.x - oldBounds.x) / oldBounds.w;
                 const relY = (initialState.y - oldBounds.y) / oldBounds.h;
                 const relW = initialState.width / oldBounds.w;
                 const relH = initialState.height / oldBounds.h;
                 
                 newLayer.x = newBoundsX + (relX * newBoundsW);
                 newLayer.y = newBoundsY + (relY * newBoundsH);
                 newLayer.width = Math.max(1, relW * newBoundsW);
                 newLayer.height = Math.max(1, relH * newBoundsH);
             } else {
                 const minSize = 2; 
                 let targetW = initialState.width;
                 let targetH = initialState.height;
                 let targetX = initialState.x;
                 let targetY = initialState.y;

                 if (activeHandle.includes('e')) targetW = initialState.width + dxPct;
                 if (activeHandle.includes('w')) {
                     const potentialWidth = initialState.width - dxPct;
                     targetX = initialState.x - (potentialWidth - initialState.width);
                     targetW = potentialWidth;
                 }
                 if (activeHandle.includes('s')) targetH = initialState.height + dyPct;
                 if (activeHandle.includes('n')) {
                     const potentialHeight = initialState.height - dyPct;
                     targetY = initialState.y - (potentialHeight - initialState.height);
                     targetH = potentialHeight;
                 }
                 
                 newLayer.x = targetX;
                 newLayer.y = targetY;
                 newLayer.width = Math.max(minSize, targetW);
                 newLayer.height = Math.max(minSize, targetH);
             }

          } else if (interactionMode === 'ROTATING' && rotationStart.current && selectedLayerIds.has(newLayer.id) && !newLayer.isLocked) {
              const currentAngle = Math.atan2(e.clientY - rotationStart.current.centerY, e.clientX - rotationStart.current.centerX) * (180 / Math.PI);
              let angle = currentAngle - rotationStart.current.startAngle;
              if (e.shiftKey) angle = Math.round(angle / 45) * 45;
              newLayer.rotation = angle;

          } else if (interactionMode === 'INTERNAL_EDIT' && selectedLayerIds.has(newLayer.id)) {
              newLayer.adjustments.panX = initialState.adjustments.panX + dxPx;
              newLayer.adjustments.panY = initialState.adjustments.panY + dyPx;

          } else if (interactionMode === 'INTERNAL_SCALE' && selectedLayerIds.has(newLayer.id)) {
               const sensitivity = 0.005;
               let scaleChange = 0;
               if (activeHandle?.includes('n')) scaleChange -= dyPx;
               if (activeHandle?.includes('s')) scaleChange += dyPx;
               if (activeHandle?.includes('w')) scaleChange -= dxPx;
               if (activeHandle?.includes('e')) scaleChange += dxPx;
               newLayer.adjustments.scale = Math.max(0.1, initialState.adjustments.scale + (scaleChange * sensitivity));
              
          } else if (interactionMode === 'INTERNAL_ROTATE' && selectedLayerIds.has(newLayer.id)) {
              const sensitivity = 0.5;
              newLayer.adjustments.rotation = (initialState.adjustments.rotation + (dxPx * sensitivity)) % 360;
          }
          
          return newLayer;
      });

      setSnapLines(newSnapLines);
      setGapGuides(newGapGuides);
      onUpdateLayers(spread.id, updatedLayers);
    };

    const handleMouseUp = () => {
      setInteractionMode('IDLE');
      setActiveHandle(null);
      setSnapLines({});
      setGapGuides([]);
      dragStart.current = null;
      rotationStart.current = null;
      initialLayersState.current = new Map();
      groupBounds.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [interactionMode, activeHandle, spread.id, selectedLayerIds, aspectRatio, editingLayerId, photos, enableSmartGuides, gapPctX, gapPctY, showGrid, spread.isLocked]);

  const handleAlign = (alignment: string) => {
    if (selectedLayerIds.size === 0 || spread.isLocked) return;

    const selectedLayers = spread.layers.filter(l => selectedLayerIds.has(l.id));
    if (selectedLayers.some(l => l.isLocked)) return; 
    
    let minX = 0, maxX = 0, minY = 0, maxY = 0, centerX = 50, centerY = 50;

    if (selectedLayers.length > 1) {
        minX = Math.min(...selectedLayers.map(l => l.x));
        maxX = Math.max(...selectedLayers.map(l => l.x + l.width));
        minY = Math.min(...selectedLayers.map(l => l.y));
        maxY = Math.max(...selectedLayers.map(l => l.y + l.height));
        centerX = (minX + maxX) / 2;
        centerY = (minY + maxY) / 2;
    }

    const updated = spread.layers.map(l => {
      if (!selectedLayerIds.has(l.id)) return l;
      let { x, y } = l;

      if (selectedLayers.length > 1) {
          switch (alignment) {
            case 'left': x = minX; break;
            case 'center-x': x = centerX - (l.width / 2); break;
            case 'right': x = maxX - l.width; break;
            case 'top': y = minY; break;
            case 'center-y': y = centerY - (l.height / 2); break;
            case 'bottom': y = maxY - l.height; break;
          }
      } else {
          switch (alignment) {
            case 'left': x = 0; break;
            case 'center-x': x = 50 - (l.width / 2); break;
            case 'right': x = 100 - l.width; break;
            case 'top': y = 0; break;
            case 'center-y': y = 50 - (l.height / 2); break;
            case 'bottom': y = 100 - l.height; break;
          }
      }
      return { ...l, x, y };
    });
    onUpdateLayers(spread.id, updated);
  };

  const handleLayerOrder = (direction: 'front' | 'back') => {
      if (selectedLayerIds.size === 0) return;
      const selected: Layer[] = [];
      const unselected: Layer[] = [];
      spread.layers.forEach(l => {
          if (selectedLayerIds.has(l.id)) selected.push(l);
          else unselected.push(l);
      });
      let newOrder = direction === 'front' ? [...unselected, ...selected] : [...selected, ...unselected];
      onUpdateLayers(spread.id, newOrder);
  };

  return (
    <div 
      className={clsx(
        "relative w-full mb-12 transition-all duration-300 select-none group",
        isActive ? "opacity-100 shadow-2xl ring-1 ring-gray-700" : "opacity-50 hover:opacity-80 scale-95 hover:scale-100 grayscale hover:grayscale-0",
        spread.isLocked && "ring-1 ring-red-500/50"
      )}
      style={{ aspectRatio: `${aspectRatio}` }}
      ref={containerRef}
      onMouseDown={(e) => {
          if (e.target === containerRef.current) { handleSelectionUpdate(new Set<string>()); setEditingLayerId(null); }
          onSelectSpread();
      }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={(e) => {
          e.preventDefault();
          const photoId = e.dataTransfer.getData('photoId');
          
          if (!containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          const dropX = ((e.clientX - rect.left)/rect.width)*100;
          const dropY = ((e.clientY - rect.top)/rect.height)*100;

          let targetLayerId = undefined;
          for (let i = spread.layers.length - 1; i >= 0; i--) {
              const l = spread.layers[i];
              if (dropX >= l.x && dropX <= l.x + l.width && dropY >= l.y && dropY <= l.y + l.height) {
                  targetLayerId = l.id;
                  break;
              }
          }

          onPhotoDrop(spread.id, photoId, dropX, dropY, targetLayerId, { ctrlKey: e.ctrlKey || e.metaKey });
      }}
    >
      <div className="absolute inset-0 bg-white shadow-sm overflow-hidden rounded-sm cursor-default">
        <div className="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none" />

        {/* Central Guide / Fold Line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-gray-400 opacity-50 z-0 pointer-events-none"></div>

        {showGrid && (
             <div className="absolute inset-0 pointer-events-none z-0">
                 {Array.from({ length: Math.floor(100 / GRID_SIZE) - 1 }).map((_, i) => (
                     <React.Fragment key={i}>
                         <div className="absolute top-0 bottom-0 w-px bg-blue-300/30 border-r border-dashed border-blue-400/20" style={{ left: `${(i + 1) * GRID_SIZE}%` }} />
                         <div className="absolute left-0 right-0 h-px bg-blue-300/30 border-b border-dashed border-blue-400/20" style={{ top: `${(i + 1) * GRID_SIZE}%` }} />
                     </React.Fragment>
                 ))}
             </div>
        )}

        {isActive && selectedLayerIds.size > 0 && !editingLayerId && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur border border-gray-700 p-1 rounded-lg flex items-center gap-1 shadow-xl">
             {!spread.isLocked && (
                 <>
                    <div className="flex gap-0.5">
                        <button onClick={() => handleAlign('left')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Alinhar à Esquerda"><AlignLeft size={16} /></button>
                        <button onClick={() => handleAlign('center-x')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Centralizar Horizontalmente"><AlignCenter size={16} /></button>
                        <button onClick={() => handleAlign('right')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Alinhar à Direita"><AlignRight size={16} /></button>
                    </div>
                    
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                    
                    <div className="flex gap-0.5">
                        <button onClick={() => handleAlign('top')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Alinhar ao Topo"><ArrowUpToLine size={16} /></button>
                        <button onClick={() => handleAlign('center-y')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Centralizar Verticalmente"><FoldVertical size={16} /></button>
                        <button onClick={() => handleAlign('bottom')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Alinhar à Base"><ArrowDownToLine size={16} /></button>
                    </div>

                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                 </>
             )}
             
             {selectedLayerIds.size === 1 && (
                 <>
                    {/* Single Layer Lock Button */}
                    <button 
                        onClick={(e) => {
                            const l = spread.layers.find(ly => ly.id === Array.from(selectedLayerIds)[0]);
                            if(l) handleToggleLayerLock(e, l);
                        }} 
                        className={clsx(
                            "p-1.5 rounded transition-colors", 
                            spread.layers.find(ly => ly.id === Array.from(selectedLayerIds)[0])?.isLocked ? "bg-red-500/80 text-white" : "hover:bg-gray-700 text-gray-300"
                        )} 
                        title="Bloquear/Desbloquear Camada"
                    >
                         {spread.layers.find(ly => ly.id === Array.from(selectedLayerIds)[0])?.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                 </>
             )}

             <button onClick={() => handleLayerOrder('front')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Trazer para Frente"><BringToFront size={16} /></button>
             <button onClick={() => handleLayerOrder('back')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Enviar para Trás"><SendToBack size={16} /></button>
             <div className="w-px h-4 bg-gray-600 mx-1"></div>
             <button 
                onClick={() => setEnableSmartGuides(!enableSmartGuides)} 
                className={clsx("p-1.5 rounded transition-colors", enableSmartGuides ? "bg-purple-600 text-white" : "hover:bg-gray-700 text-gray-300")} 
                title="Guias Inteligentes (Snap)"
             >
                 <Magnet size={16} />
             </button>
             <button 
                onClick={() => setShowGrid(!showGrid)} 
                className={clsx("p-1.5 rounded transition-colors", showGrid ? "bg-blue-600 text-white" : "hover:bg-gray-700 text-gray-300")} 
                title="Mostrar Grade (5%)"
             >
                 <GridIcon size={16} />
             </button>
             <div className="w-px h-4 bg-gray-600 mx-1"></div>
             
             {onRedistribute && !spread.isLocked && (
                <button 
                    onClick={() => onRedistribute()} 
                    className="p-1.5 hover:bg-blue-600 text-blue-400 hover:text-white rounded transition-colors"
                    title="Otimizar Redistribuição (Smart Fit)"
                >
                    <Wand2 size={16} />
                </button>
             )}
             
             <div className="w-px h-4 bg-gray-600 mx-1"></div>
             <button onClick={() => onDeleteLayers(spread.id, Array.from(selectedLayerIds))} className="p-1.5 hover:bg-red-900/50 text-red-400 rounded" title="Excluir"><Trash size={16} /></button>
          </div>
        )}

        {/* Snap Lines */}
        {snapLines.x !== null && <div className="absolute top-0 bottom-0 w-[1px] bg-pink-500 z-50 shadow-[0_0_8px_rgba(236,72,153,0.8)]" style={{ left: `${snapLines.x}%` }} />}
        {snapLines.y !== null && <div className="absolute left-0 right-0 h-[1px] bg-pink-500 z-50 shadow-[0_0_8px_rgba(236,72,153,0.8)]" style={{ top: `${snapLines.y}%` }} />}

        {/* Gap Guides Indicators */}
        {gapGuides.map((g, i) => (
             <div 
                key={i} 
                className="absolute z-50 pointer-events-none flex items-center justify-center animate-in fade-in duration-100"
                style={{
                    left: `${g.x}%`,
                    top: `${g.y}%`,
                    width: g.width > 0 ? `${g.width}%` : '1px',
                    height: g.height > 0 ? `${g.height}%` : '1px'
                }}
             >
                 <div className={clsx("absolute bg-blue-500/20 border-blue-400/50", g.width > 0 ? "border-x inset-y-0 w-full" : "border-y inset-x-0 h-full")} />
                 <span className="relative z-10 bg-blue-600 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg border border-blue-400/50 whitespace-nowrap">
                     {g.label}
                 </span>
             </div>
        ))}

        {spread.layers.map((layer) => {
          const photo = photos.find(p => p.id === layer.photoId);
          if (!photo) return null;
          const isSelected = selectedLayerIds.has(layer.id);
          const isEditing = editingLayerId === layer.id;
          const adj = layer.adjustments;
          
          const frameW = (layer.width / 100) * config.spreadWidth;
          const frameH = (layer.height / 100) * config.spreadHeight;
          const frameAR = frameW / frameH;
          const photoAR = photo.aspectRatio || (photo.width / photo.height) || 1;
          const isWide = photoAR > frameAR;

          return (
            <div
              key={layer.id}
              className={clsx("absolute transition-shadow duration-200", isEditing ? "z-50" : (isSelected ? "z-30" : "z-10 hover:z-20"))}
              style={{
                left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`,
                transform: `rotate(${layer.rotation}deg)`,
                cursor: isEditing ? 'grab' : ((spread.isLocked || layer.isLocked) ? 'default' : 'move')
              }}
              draggable={!spread.isLocked && !layer.isLocked} 
              onDragStart={(e) => {
                  if (spread.isLocked || layer.isLocked) {
                      e.dataTransfer.setData('photoId', layer.photoId);
                      e.dataTransfer.setData('sourceLayerId', layer.id); 
                      e.dataTransfer.effectAllowed = 'move';
                  }
              }}
              onDragOver={(e) => {
                  if (spread.isLocked) {
                       e.preventDefault();
                       e.dataTransfer.dropEffect = 'move';
                  }
              }}
              onContextMenu={(e) => handleContextMenu(e, layer)}
              onMouseDown={(e) => handleLayerMouseDown(e, layer)}
              onDoubleClick={(e) => handleLayerDoubleClick(e, layer)}
              onWheel={(e) => handleWheel(e, layer)}
            >
              <div className={clsx(
                "w-full h-full overflow-hidden bg-gray-100 relative select-none flex items-center justify-center",
                isEditing ? "ring-2 ring-emerald-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]" : (isSelected ? "ring-2 ring-blue-500 shadow-xl" : "shadow-sm"),
                layer.isLocked && !isSelected && "ring-1 ring-red-500/50 hover:ring-red-400",
                spread.isLocked && "hover:ring-2 hover:ring-purple-400 transition-all cursor-grab active:cursor-grabbing"
              )}>
                 <img 
                    src={photo.previewUrl} 
                    className="pointer-events-none block"
                    style={{
                        width: isWide ? 'auto' : '100%',
                        height: isWide ? '100%' : 'auto',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        objectFit: 'contain', 
                        filter: `brightness(${100+adj.brightness}%) contrast(${100+adj.contrast}%) saturate(${100+adj.saturation}%) hue-rotate(${adj.temperature}deg)`,
                        transform: `scale(${adj.scale}) translate(${adj.panX}px, ${adj.panY}px) rotate(${adj.rotation}deg)`
                    }}
                 />
                 {!isEditing && !isSelected && <div className="absolute inset-0 hover:bg-blue-500/20 transition-colors" />}
                 
                 {layer.isLocked && (
                     <div className="absolute top-1 right-1 z-20">
                         <div className="bg-red-500/80 p-1 rounded-full shadow-sm text-white">
                             <Lock size={10} />
                         </div>
                     </div>
                 )}

                 {(isSelected || isEditing) && (
                     <div className="absolute inset-0 pointer-events-none opacity-40">
                         <div className="absolute left-1/3 w-px h-full bg-white/50 shadow-sm" />
                         <div className="absolute right-1/3 w-px h-full bg-white/50 shadow-sm" />
                         <div className="absolute top-1/3 h-px w-full bg-white/50 shadow-sm" />
                         <div className="absolute bottom-1/3 h-px w-full bg-white/50 shadow-sm" />
                     </div>
                 )}
                 
                 {isEditing && (
                     <>
                        <div className="absolute top-1 left-1 w-3 h-3 bg-emerald-500 border border-white rounded-full cursor-nwse-resize z-50 pointer-events-auto" onMouseDown={(e) => handleContentResizeStart(e, 'nw', layer)} />
                        <div className="absolute top-1 right-1 w-3 h-3 bg-emerald-500 border border-white rounded-full cursor-nesw-resize z-50 pointer-events-auto" onMouseDown={(e) => handleContentResizeStart(e, 'ne', layer)} />
                        <div className="absolute bottom-1 left-1 w-3 h-3 bg-emerald-500 border border-white rounded-full cursor-nesw-resize z-50 pointer-events-auto" onMouseDown={(e) => handleContentResizeStart(e, 'sw', layer)} />
                        <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 border border-white rounded-full cursor-nwse-resize z-50 pointer-events-auto" onMouseDown={(e) => handleContentResizeStart(e, 'se', layer)} />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 pointer-events-auto">
                            <div className="flex items-center gap-2 bg-black/80 backdrop-blur rounded-full px-3 py-1.5 shadow-xl border border-gray-700">
                                <ZoomIn size={14} className="text-gray-400" />
                                <span className="text-[10px] text-gray-300 font-mono w-8 text-center">{Math.round(adj.scale * 100)}%</span>
                                <div className="w-px h-3 bg-gray-600 mx-1" />
                                <button onMouseDown={(e) => { e.stopPropagation(); updateContentRotation(layer.id, -90); }} className="text-white hover:text-blue-400" title="-90°">
                                    <RotateCw size={14} className="-scale-x-100" />
                                </button>
                                <button onMouseDown={(e) => { e.stopPropagation(); updateContentRotation(layer.id, 90); }} className="text-white hover:text-blue-400" title="+90°">
                                    <RotateCw size={14} />
                                </button>
                            </div>
                        </div>
                     </>
                 )}
              </div>

              {isSelected && !isEditing && !spread.isLocked && !layer.isLocked && (
                 <>
                    {/* Rotation Handle */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 cursor-grab active:cursor-grabbing group/rot"
                         onMouseDown={(e) => handleRotateStart(e, layer)}
                    >
                        <div className="w-5 h-5 bg-white border border-blue-600 rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform">
                             <RotateCw size={12} className="text-blue-600" />
                        </div>
                        <div className="w-px h-3 bg-blue-600"></div>
                    </div>

                    {['nw', 'ne', 'sw', 'se'].map((h) => (
                        <div key={h} 
                             className={clsx(
                                 "absolute w-3 h-3 bg-white border border-blue-600 rounded-full z-40 hover:scale-125 transition-transform",
                                 h.includes('n') ? '-top-1.5' : '-bottom-1.5',
                                 h.includes('w') ? '-left-1.5' : '-right-1.5',
                                 h === 'nw' || h === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'
                             )}
                             onMouseDown={(e) => handleResizeStart(e, h as ResizeHandle, layer)}
                        />
                    ))}
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-8 h-2 cursor-ns-resize z-40" onMouseDown={(e) => handleResizeStart(e, 'n', layer)} />
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -mb-1 w-8 h-2 cursor-ns-resize z-40" onMouseDown={(e) => handleResizeStart(e, 's', layer)} />
                     <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 h-8 w-2 cursor-ew-resize z-40" onMouseDown={(e) => handleResizeStart(e, 'w', layer)} />
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1 h-8 w-2 cursor-ew-resize z-40" onMouseDown={(e) => handleResizeStart(e, 'e', layer)} />
                 </>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute -top-8 left-0 flex items-center gap-3">
         <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded uppercase tracking-wider">Lâmina {spread.index}</span>
      </div>

      {isActive && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
             {onToggleLock && (
                 <button onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className={clsx("flex items-center gap-2 px-3 py-2 backdrop-blur border rounded-md text-xs font-medium shadow-lg transition-all", spread.isLocked ? "bg-red-500/90 hover:bg-red-600 border-red-400 text-white" : "bg-gray-900/90 hover:bg-gray-700 border-gray-700 text-gray-200")} title={spread.isLocked ? "Desbloquear Layout" : "Bloquear Layout"}>
                     {spread.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                 </button>
             )}
             <div className="h-px w-full bg-gray-600 my-1"></div>
             {onRedistribute && !spread.isLocked && (
                <button onClick={(e) => { e.stopPropagation(); onRedistribute(); }} className="flex items-center gap-2 px-3 py-2 bg-gray-900/90 hover:bg-blue-600 backdrop-blur border border-gray-700 rounded-md text-xs font-medium text-gray-200 shadow-lg transition-all" title="Otimizar / Variar Layout">
                    <Wand2 size={14} className="text-blue-400 group-hover:text-white" />
                    <span className="hidden sm:inline">Otimizar</span>
                </button>
             )}
             {onDistributeFromHere && !spread.isLocked && (
                 <button onClick={(e) => { e.stopPropagation(); onDistributeFromHere(); }} className="flex items-center gap-2 px-3 py-2 bg-gray-900/90 hover:bg-purple-600 backdrop-blur border border-gray-700 rounded-md text-xs font-medium text-gray-200 shadow-lg transition-all" title="Variar e distribuir fotos desta lâmina em diante">
                     <ListRestart size={14} className="text-purple-400 group-hover:text-white" />
                     <span className="hidden sm:inline">Variar Daqui</span>
                 </button>
             )}
             {onShowTemplates && (
                <button onClick={(e) => { e.stopPropagation(); onShowTemplates(); }} className="flex items-center gap-2 px-3 py-2 bg-gray-900/90 hover:bg-blue-600 backdrop-blur border border-gray-700 rounded-md text-xs font-medium text-gray-200 shadow-lg transition-all" title="Templates">
                    <Layout size={14} className="text-blue-400 group-hover:text-white" />
                    <span className="hidden sm:inline">Templates</span>
                </button>
             )}
          </div>
      )}
      
      {editingLayerId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-pulse border border-emerald-400 pointer-events-none">
              <Maximize2 size={14} /> Editando Conteúdo (Esc para sair)
          </div>
      )}
      {spread.isLocked && (
           <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
               <div className="bg-red-500 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                   <Lock size={10} /> Layout Bloqueado
               </div>
           </div>
      )}
      
      {contextMenu.visible && contextMenu.layerId && (
          <div 
              className="fixed z-50 bg-gray-800 border border-gray-700 shadow-2xl rounded-md py-1 min-w-[160px] text-gray-200"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
          >
              <button 
                  onClick={() => {
                      if (contextMenu.layerId) {
                          setEditingLayerId(contextMenu.layerId);
                          setInteractionMode('IDLE');
                          setContextMenu({ ...contextMenu, visible: false });
                      }
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                  <Edit3 size={14} className="text-emerald-400" /> Editar Conteúdo (Zoom/Pan)
              </button>
              
               <button 
                  onClick={(e) => {
                      const l = spread.layers.find(ly => ly.id === contextMenu.layerId);
                      if(l) handleToggleLayerLock(e, l);
                      setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                  {spread.layers.find(ly => ly.id === contextMenu.layerId)?.isLocked ? (
                      <><Unlock size={14} className="text-red-400" /> Desbloquear</>
                  ) : (
                      <><Lock size={14} className="text-gray-400" /> Bloquear</>
                  )}
              </button>

              <button 
                  onClick={() => {
                      if (contextMenu.layerId) updateContentRotation(contextMenu.layerId, 90);
                      setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                  <RotateCw size={14} /> Rotacionar +90°
              </button>
              <button 
                   onClick={() => {
                      if (contextMenu.layerId) updateContentRotation(contextMenu.layerId, -90);
                      setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                  <RotateCw size={14} className="-scale-x-100" /> Rotacionar -90°
              </button>

              <div className="h-px bg-gray-700 my-1"></div>

              <button 
                  onClick={() => {
                      handleLayerOrder('front');
                      setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                  <BringToFront size={14} /> Trazer para Frente
              </button>
              <button 
                  onClick={() => {
                      handleLayerOrder('back');
                      setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                  <SendToBack size={14} /> Enviar para Trás
              </button>

              <div className="h-px bg-gray-700 my-1"></div>

              <button 
                  onClick={() => {
                      if (contextMenu.layerId) onDeleteLayers(spread.id, [contextMenu.layerId]);
                      setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-900/50 text-red-400 flex items-center gap-2 text-sm"
              >
                  <Trash size={14} /> Deletar
              </button>
          </div>
      )}
    </div>
  );
};
