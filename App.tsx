

import React, { useState, useEffect, useRef } from 'react';
import { PhotoSidebar } from './components/PhotoSidebar';
import { Toolbar } from './components/Toolbar';
import { AlbumCanvas } from './components/AlbumCanvas';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PropertiesPanel } from './components/PropertiesPanel';
import { BookPreviewModal } from './components/BookPreviewModal';
import { ExportModal } from './components/ExportModal';
import { Photo, Spread, AlbumConfig, Layer, SavedProject, ElectronAPI, PhotoMetadata, LoadedImage, RelinkedFile } from './types';
import { distributePhotosToSpreads, generateAlternativeLayouts, generateNoCropRowLayout, distributePhotosFromIndex, generateSmartMosaicLayout, generateUniqueVariations, getLayoutHash, generateStructuredLayout } from './utils/layoutGenerator';
import { exportSpreadToPSD, exportSpreadToJPG, exportSpreadToPDF, exportMultipleSpreadsToPDF } from './services/exportService';
import { X, RefreshCw, AlertCircle, Plus } from 'lucide-react';

// Make TypeScript aware of the Electron API exposed on the window object
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

type ViewState = 'WELCOME' | 'WORKSPACE';

interface HistoryState {
  spreads: Spread[];
}

// Helper to convert a data URL to a File object
async function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: mimeType });
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('WELCOME');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [spreads, setSpreads] = useState<Spread[]>([]);
  
  const [distributionVariation, setDistributionVariation] = useState(0);
  
  const [activeSpreadId, setActiveSpreadId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const historyIndex = useRef(-1); 
  const isUndoRedoAction = useRef(false);
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [layoutSuggestions, setLayoutSuggestions] = useState<{ type: string, layers: Layer[] }[]>([]);
  const [seenLayoutHashes, setSeenLayoutHashes] = useState<Set<string>>(new Set());
  const [templatesExhausted, setTemplatesExhausted] = useState(false);

  const [config, setConfig] = useState<AlbumConfig>({
    projectName: 'Sem Título',
    spreadWidth: 6000, 
    spreadHeight: 3000,
    displayUnit: 'cm', 
    dpi: 300,
    colorMode: 'RGB',
    gap: 40,
    margin: 100
  });
  
  const [totalSpreads, setTotalSpreads] = useState(10);
  const missingPhotos = photos.filter(p => p.isMissing);

  useEffect(() => {
    const history = localStorage.getItem('album_architect_history');
    if (history) {
      try {
        setSavedProjects(JSON.parse(history));
      } catch (e) { console.error("History parse error", e); }
    }
  }, []);

  const updateProjectHistory = (newProject: SavedProject) => {
    const updated = [newProject, ...savedProjects.filter(p => p.id !== newProject.id)];
    setSavedProjects(updated);
    localStorage.setItem('album_architect_history', JSON.stringify(updated));
  };

  // --- HISTORY MANAGEMENT ---
  const saveToHistory = (newSpreads: Spread[]) => {
      if (isUndoRedoAction.current) {
          isUndoRedoAction.current = false;
          return;
      }

      setHistory(prev => {
          let updatedHistory = [...prev];
          if (historyIndex.current < updatedHistory.length - 1) {
              updatedHistory = updatedHistory.slice(0, historyIndex.current + 1);
          }
          updatedHistory.push({ spreads: JSON.parse(JSON.stringify(newSpreads)) });
          if (updatedHistory.length > 20) {
              updatedHistory = updatedHistory.slice(updatedHistory.length - 20);
          }
          return updatedHistory;
      });
      
      if (historyIndex.current < 19) {
          historyIndex.current += 1; 
      } else {
           historyIndex.current = 19;
      }
      
      setSpreads(newSpreads);
  };

  const handleUndo = () => {
      if (historyIndex.current > 0) {
          isUndoRedoAction.current = true;
          historyIndex.current -= 1;
          const previousState = history[historyIndex.current];
          if (previousState && previousState.spreads) {
              setSpreads(JSON.parse(JSON.stringify(previousState.spreads)));
          }
      }
  };

  const handleRedo = () => {
      if (historyIndex.current < history.length - 1) {
          isUndoRedoAction.current = true;
          historyIndex.current += 1;
          const nextState = history[historyIndex.current];
          if (nextState && nextState.spreads) {
              setSpreads(JSON.parse(JSON.stringify(nextState.spreads)));
          }
      }
  };

  const updateSpreadsWithHistory = (updater: (prev: Spread[]) => Spread[]) => {
      const newSpreads = updater(spreads);
      saveToHistory(newSpreads);
  };

  const handleCreateProject = (newConfig: AlbumConfig) => {
    setConfig(newConfig);
    setPhotos([]);
    setSpreads([]);
    setTotalSpreads(10);
    setView('WORKSPACE');
    setHistory([]);
    historyIndex.current = -1;
    setCurrentProjectId(Date.now().toString() + Math.random());
  };

  const handleSaveProject = async () => {
    // Create serializable metadata from the photos state
    const photoMetadata: PhotoMetadata[] = photos.map(p => ({
        id: p.id,
        path: p.path,
        fileName: p.fileName,
        width: p.width,
        height: p.height,
        aspectRatio: p.aspectRatio,
    }));

    const projectData: SavedProject = {
      id: currentProjectId || Date.now().toString(),
      name: config.projectName,
      lastModified: Date.now(),
      config,
      spreads,
      photos: photoMetadata
    };
    updateProjectHistory(projectData);
    
    const jsonString = JSON.stringify(projectData, null, 2);
    const dataBuffer = new TextEncoder().encode(jsonString);

    await window.electronAPI.saveFile({
        title: 'Salvar Projeto',
        defaultPath: `${config.projectName.replace(/\s+/g, '_')}.aaproj`,
        filters: [{ name: 'IsAlbum Project', extensions: ['aaproj'] }],
        data: dataBuffer
    });
  };

  const handleLoadProjectFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as SavedProject;
        await loadProjectIntoState(data);
      } catch (err) {
        alert("Erro ao ler arquivo de projeto.");
      }
    };
    reader.readAsText(file);
  };

  const loadProjectIntoState = async (data: SavedProject) => {
    setConfig(data.config);
    setSpreads(data.spreads);

    const photoPromises = (data.photos || []).map(async (meta): Promise<Photo> => {
        const loadedImage: LoadedImage = await window.electronAPI.loadImageFromPath(meta.path);
        if (loadedImage.success && loadedImage.dataUrl) {
            const file = await dataUrlToFile(loadedImage.dataUrl, meta.fileName, loadedImage.mimeType!);
            return { ...meta, file, previewUrl: loadedImage.dataUrl, isMissing: false };
        } else {
            return { ...meta, file: null, previewUrl: '', isMissing: true };
        }
    });

    const loadedPhotos = await Promise.all(photoPromises);
    setPhotos(loadedPhotos);

    setHistory([{ spreads: data.spreads }]);
    historyIndex.current = 0;
    alert(`Projeto "${data.name}" carregado.`);
    setView('WORKSPACE');
    setCurrentProjectId(data.id);
  };

  const handleRelink = async () => {
      const directoryPath = await window.electronAPI.selectDirectory();
      if (!directoryPath) return;

      const filesToFind = missingPhotos.map(p => ({ id: p.id, fileName: p.fileName }));
      const relinkedFiles = await window.electronAPI.findAndLoadFiles({ directoryPath, filesToFind });

      if (relinkedFiles.length === 0) {
          alert("Nenhuma foto correspondente encontrada na pasta selecionada.");
          return;
      }

      const relinkedMap = new Map<string, RelinkedFile>(relinkedFiles.map(f => [f.id, f]));

      const photoUpdatePromises = photos.map(async (p): Promise<Photo> => {
          if (p.isMissing && relinkedMap.has(p.id)) {
              const relinked = relinkedMap.get(p.id)!;
              const file = await dataUrlToFile(relinked.dataUrl, relinked.fileName, relinked.mimeType);
              return { ...p, file, path: relinked.newPath, previewUrl: relinked.dataUrl, isMissing: false };
          }
          return p;
      });

      const updatedPhotos = await Promise.all(photoUpdatePromises);
      setPhotos(updatedPhotos);

      alert(`${relinkedFiles.length} de ${filesToFind.length} fotos ausentes foram relincadas com sucesso!`);
  };

  const handleReturnToWelcome = () => {
      if (currentProjectId && (spreads.length > 0 || photos.length > 0)) {
          // Trigger an auto-save before returning
          handleSaveProject();
      }
      setView('WELCOME');
  };

  const handleResizeProject = (newW: number, newH: number) => {
      const newConfig = { ...config, spreadWidth: newW, spreadHeight: newH };
      setConfig(newConfig);

      const remappedSpreads = spreads.map(s => {
          const spreadPhotos = s.layers
             .map(l => photos.find(p => p.id === l.photoId))
             .filter((p): p is Photo => !!p);
          
          if (spreadPhotos.length === 0) return s;

          const newLayers = generateSmartMosaicLayout(spreadPhotos, newConfig);
          return { ...s, layers: newLayers };
      });
      
      updateSpreadsWithHistory(() => remappedSpreads);
  };

  const handleUpdateGap = (newGap: number) => {
      const newConfig = { ...config, gap: newGap };
      setConfig(newConfig);

      // Re-layout active spread with new gap
      if (activeSpreadId) {
          updateSpreadsWithHistory(prev => prev.map(s => {
              if (s.id !== activeSpreadId) return s;
              const spreadPhotos = s.layers
                  .map(l => photos.find(p => p.id === l.photoId))
                  .filter((p): p is Photo => !!p);
              
              if (spreadPhotos.length === 0) return s;

              // Regenerate with new gap
              const newLayers = generateSmartMosaicLayout(spreadPhotos, newConfig);
              return { ...s, layers: newLayers };
          }));
      }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotosPromises = Array.from(e.target.files).map(async (file: File & { path: string }) => {
        return new Promise<Photo>((resolve) => {
           const img = new Image();
           const url = URL.createObjectURL(file);
           img.onload = () => {
             resolve({
                id: Math.random().toString(36).substr(2, 9),
                file: file,
                path: file.path, // Electron provides the full path
                fileName: file.name,
                previewUrl: url,
                width: img.naturalWidth, 
                height: img.naturalHeight,
                aspectRatio: img.naturalWidth / img.naturalHeight,
                isMissing: false
             });
           };
           img.src = url;
        });
      });
      
      const newPhotos = await Promise.all(newPhotosPromises);
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    updateSpreadsWithHistory(prev => prev.map(s => ({
      ...s,
      layers: s.layers.filter(l => l.photoId !== id)
    })));
  };

  const handleAutoDistribute = (minDensity: number | null, maxDensity: number | null) => {
    setDistributionVariation(0); 
    const newSpreads = distributePhotosToSpreads(photos, totalSpreads, config, 0, minDensity, maxDensity);
    
    if (newSpreads.length > 0) {
        setTotalSpreads(newSpreads.length);
    }
    
    saveToHistory(newSpreads);
    if (newSpreads.length > 0) setActiveSpreadId(newSpreads[0].id);
  };

  const handleGlobalRedistribute = () => {
      const nextVar = (distributionVariation + 1) % 15; 
      setDistributionVariation(nextVar);
      
      const lockedSpreadIds = new Set(spreads.filter(s => s.isLocked).map(s => s.id));
      const photosInLockedSpreads = new Set<string>();
      spreads.filter(s => s.isLocked).forEach(s => s.layers.forEach(l => photosInLockedSpreads.add(l.photoId)));
      
      const availablePhotos = photos.filter(p => !photosInLockedSpreads.has(p.id));
      const availableSpreadsCount = Math.max(1, totalSpreads - lockedSpreadIds.size);

      const newGeneratedSpreads = distributePhotosToSpreads(availablePhotos, availableSpreadsCount, config, nextVar);
      
      const finalSpreads: Spread[] = [];
      let genIndex = 0;
      
      for(let i=0; i<totalSpreads; i++) {
          const original = spreads[i];
          if (original && original.isLocked) {
              finalSpreads.push(original);
          } else {
              if (genIndex < newGeneratedSpreads.length) {
                  finalSpreads.push({ ...newGeneratedSpreads[genIndex], id: original ? original.id : newGeneratedSpreads[genIndex].id, index: i+1 });
                  genIndex++;
              } else {
                   finalSpreads.push({ id: Math.random().toString(36).substr(2, 9), index: i+1, layers: [] });
              }
          }
      }

      while(genIndex < newGeneratedSpreads.length) {
          const s = newGeneratedSpreads[genIndex];
          finalSpreads.push({ ...s, index: finalSpreads.length + 1 });
          genIndex++;
      }
      
      setTotalSpreads(finalSpreads.length);
      saveToHistory(finalSpreads);
      if (finalSpreads.length > 0) setActiveSpreadId(finalSpreads[0].id);
  };
  
  const handleDistributeFromSpread = (spreadId: string) => {
      const spreadIndex = spreads.findIndex(s => s.id === spreadId);
      if (spreadIndex === -1) return;
      const nextVar = (distributionVariation + 1) % 15;
      setDistributionVariation(nextVar);
      const newSpreads = distributePhotosFromIndex(spreads, photos, spreadIndex, totalSpreads, config, nextVar);
      saveToHistory(newSpreads);
  };

  const handleToggleLockSpread = (spreadId: string) => {
      updateSpreadsWithHistory(prev => prev.map(s => {
          if (s.id !== spreadId) return s;
          return { ...s, isLocked: !s.isLocked };
      }));
  };

  const handleAddSpread = () => {
      setTotalSpreads(prev => prev + 1);
      updateSpreadsWithHistory(prev => [
          ...prev, 
          {
              id: Math.random().toString(36).substr(2, 9),
              index: prev.length + 1,
              layers: []
          }
      ]);
  };
  
  const handleAddSpreadAt = (index: number) => {
      setTotalSpreads(prev => prev + 1);
      updateSpreadsWithHistory(prev => {
          const newSpread: Spread = {
              id: Math.random().toString(36).substr(2, 9),
              index: 0, 
              layers: []
          };
          const newSpreads = [...prev];
          newSpreads.splice(index, 0, newSpread);
          return newSpreads.map((s, i) => ({ ...s, index: i + 1 }));
      });
  };

  const handleDeleteSpread = (spreadId: string) => {
      if (window.confirm("Tem certeza que deseja excluir esta lâmina?")) {
          setTotalSpreads(prev => Math.max(1, prev - 1));
          updateSpreadsWithHistory(prev => {
              const filtered = prev.filter(s => s.id !== spreadId);
              return filtered.map((s, i) => ({ ...s, index: i + 1 }));
          });
          if (activeSpreadId === spreadId) {
              setActiveSpreadId(null);
              setSelectedLayerId(null);
          }
      }
  };

  const handleUpdateLayers = (spreadId: string, updatedLayers: Layer[]) => {
    updateSpreadsWithHistory(prev => prev.map(s => {
      if (s.id !== spreadId) return s;
      return { ...s, layers: updatedLayers };
    }));
  };

  const handleUpdateActiveLayer = (updatedLayer: Layer) => {
      if (!activeSpreadId) return;
      updateSpreadsWithHistory(prev => prev.map(s => {
          if (s.id !== activeSpreadId) return s;
          return {
              ...s,
              layers: s.layers.map(l => l.id === updatedLayer.id ? updatedLayer : l)
          };
      }));
  };

  const handleDeleteLayers = (spreadId: string, layerIds: string[]) => {
    updateSpreadsWithHistory(prev => prev.map(s => {
          if (s.id !== spreadId) return s;
          
          const remainingPhotos = s.layers
             .filter(l => !layerIds.includes(l.id))
             .map(l => photos.find(p => p.id === l.photoId))
             .filter((p): p is Photo => !!p);
          
          if (remainingPhotos.length === 0) {
              return { ...s, layers: [] };
          }
          
          const newLayout = generateStructuredLayout(remainingPhotos, config);
          return { ...s, layers: newLayout };
      }));
      
    if (selectedLayerId && layerIds.includes(selectedLayerId)) {
        setSelectedLayerId(null);
    }
  };

  const handleRedistributeSpread = (spreadId: string) => {
      updateSpreadsWithHistory(prev => prev.map(s => {
          if (s.id !== spreadId) return s;
          if (s.isLocked) return s; 

          const lockedLayers = s.layers.filter(l => l.isLocked);
          const unlockedLayers = s.layers.filter(l => !l.isLocked);
          
          const photosToRedistribute = unlockedLayers
             .map(l => photos.find(p => p.id === l.photoId))
             .filter((p): p is Photo => !!p);

          if (photosToRedistribute.length === 0) return s;
          
          if (lockedLayers.length === 0) {
              const newLayers = (distributionVariation % 2 === 0) 
                  ? generateStructuredLayout(photosToRedistribute, config)
                  : generateSmartMosaicLayout(photosToRedistribute, config, true);
              return { ...s, layers: newLayers };
          }

          let minX = 100, minY = 100, maxX = 0, maxY = 0;
          unlockedLayers.forEach(l => {
              minX = Math.min(minX, l.x);
              minY = Math.min(minY, l.y);
              maxX = Math.max(maxX, l.x + l.width);
              maxY = Math.max(maxY, l.y + l.height);
          });
          
          if (minX >= maxX || minY >= maxY) {
              return s;
          }
          
          const region = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY
          };

          const newUnlockedLayers = generateStructuredLayout(photosToRedistribute, config, region);
          
          return { ...s, layers: [...lockedLayers, ...newUnlockedLayers] };
      }));
      
      setDistributionVariation(prev => prev + 1);
  };

  const handlePhotoDrop = (spreadId: string, photoId: string, x: number, y: number, targetLayerId?: string, modifiers?: { ctrlKey: boolean }) => {
    updateSpreadsWithHistory(prev => {
        const newSpreads = [...prev];
        const targetSpreadIndex = newSpreads.findIndex(s => s.id === spreadId);
        if (targetSpreadIndex === -1) return prev;

        const sourceSpreadIndex = newSpreads.findIndex(s => s.layers.some(l => l.photoId === photoId));
        
        if (targetLayerId) {
             const targetSpread = newSpreads[targetSpreadIndex];
             const targetLayer = targetSpread.layers.find(l => l.id === targetLayerId);
             
             if (targetLayer) {
                 if (targetLayer.isLocked) return prev;

                 const targetPhotoId = targetLayer.photoId;
                 
                 if (targetPhotoId === photoId) return prev;
                 
                 if (sourceSpreadIndex !== -1) {
                     const sourceSpread = newSpreads[sourceSpreadIndex];
                     const sourceLayer = sourceSpread.layers.find(l => l.photoId === photoId);
                     
                     if (sourceLayer) {
                         if (sourceLayer.isLocked) return prev;
                         
                         newSpreads[sourceSpreadIndex] = {
                             ...sourceSpread,
                             layers: sourceSpread.layers.map(l => l.id === sourceLayer.id ? { ...l, photoId: targetPhotoId } : l)
                         };
                         
                         const updatedTargetSpread = newSpreads[targetSpreadIndex];
                         newSpreads[targetSpreadIndex] = {
                             ...updatedTargetSpread,
                             layers: updatedTargetSpread.layers.map(l => l.id === targetLayerId ? { ...l, photoId: photoId } : l)
                         };
                         
                         return newSpreads;
                     }
                 }
                 
                 newSpreads[targetSpreadIndex] = {
                     ...targetSpread,
                     layers: targetSpread.layers.map(l => l.id === targetLayerId ? { ...l, photoId: photoId } : l)
                 };
                 return newSpreads;
             }
        }

        if (sourceSpreadIndex !== -1) {
            const sourceSpread = newSpreads[sourceSpreadIndex];
            const sourceLayer = sourceSpread.layers.find(l => l.photoId === photoId);
            
            if (sourceLayer && !sourceLayer.isLocked) {
                const remainingPhotos = sourceSpread.layers
                    .filter(l => l.photoId !== photoId)
                    .map(l => photos.find(p => p.id === l.photoId)).filter((p): p is Photo => !!p);
                
                const lockedInSource = sourceSpread.layers.filter(l => l.isLocked && l.photoId !== photoId);
                const unlockedPhotos = remainingPhotos.filter(p => !lockedInSource.some(l => l.photoId === p.id));
                
                if (lockedInSource.length > 0) {
                     const newLayout = generateStructuredLayout(remainingPhotos, config); 
                     newSpreads[sourceSpreadIndex] = { ...sourceSpread, layers: newLayout };
                } else {
                     newSpreads[sourceSpreadIndex] = {
                        ...sourceSpread,
                        layers: generateStructuredLayout(remainingPhotos, config)
                     };
                }
            } else if (sourceLayer && sourceLayer.isLocked) {
                return prev;
            }
        }

        const currentTargetSpread = newSpreads[targetSpreadIndex];
        if (currentTargetSpread.isLocked) return prev;

        const targetPhotos = currentTargetSpread.layers
            .map(l => photos.find(p => p.id === l.photoId)).filter((p): p is Photo => !!p);
        
        const photoToAdd = photos.find(p => p.id === photoId);
        if (photoToAdd) {
            targetPhotos.push(photoToAdd);
        }
        
        newSpreads[targetSpreadIndex] = {
            ...currentTargetSpread,
            layers: generateStructuredLayout(targetPhotos, config)
        };

        return newSpreads;
    });
  };

  const handleExportConfirm = async (scope: 'current' | 'all' | 'selected', format: 'PSD' | 'JPG' | 'PDF', selectedIds: string[]) => {
      setIsExporting(true);
      setShowExportModal(false);

      let spreadsToExport: Spread[] = [];
      if (scope === 'current') {
          const current = spreads.find(s => s.id === activeSpreadId);
          if (current) spreadsToExport = [current];
      } else if (scope === 'all') {
          spreadsToExport = spreads;
      } else {
          spreadsToExport = spreads.filter(s => selectedIds.includes(s.id));
      }

      if (spreadsToExport.length === 0) {
          alert("Nenhuma lâmina selecionada para exportação.");
          setIsExporting(false);
          return;
      }

      try {
          if (format === 'PDF') {
              const blob = await exportMultipleSpreadsToPDF(spreadsToExport, photos, config);
              const buffer = new Uint8Array(await blob.arrayBuffer());
              await window.electronAPI.saveFile({
                  title: 'Salvar PDF', defaultPath: `${config.projectName}.pdf`,
                  filters: [{ name: 'PDF', extensions: ['pdf'] }], data: buffer
              });
          } else {
              for (const spread of spreadsToExport) {
                  let blob: Blob; let ext: string;
                  if (format === 'PSD') { blob = await exportSpreadToPSD(spread, photos, config); ext = 'psd'; }
                  else { blob = await exportSpreadToJPG(spread, photos, config); ext = 'jpg'; }
                  
                  const buffer = new Uint8Array(await blob.arrayBuffer());
                  const idxStr = String(spread.index).padStart(2, '0');
                  
                  await window.electronAPI.saveFile({
                      title: `Salvar Lâmina ${spread.index}`,
                      defaultPath: `${config.projectName}_Lamina_${idxStr}.${ext}`,
                      filters: [{ name: format, extensions: [ext] }],
                      data: buffer
                  });
              }
          }
      } catch (error) {
          console.error("Export failed", error);
          alert(`Falha ao exportar. Verifique o console.`);
      } finally {
          setIsExporting(false);
      }
  };

  const openTemplateModal = () => {
      if (!activeSpreadId) return;
      const spread = spreads.find(s => s.id === activeSpreadId);
      if (!spread || spread.layers.length === 0) {
          alert("Adicione fotos à lâmina para ver sugestões.");
          return;
      }
      const photosInSpread = spread.layers.map(l => photos.find(p => p.id === l.photoId)).filter((p): p is Photo => !!p);
      const suggestions = generateAlternativeLayouts(photosInSpread, config);
      const initialHashes = new Set<string>();
      suggestions.forEach(s => initialHashes.add(getLayoutHash(s.layers)));
      setSeenLayoutHashes(initialHashes);
      setTemplatesExhausted(false);
      setLayoutSuggestions(suggestions);
      setShowTemplateModal(true);
  };

  const handleGenerateMoreTemplates = () => {
      if (!activeSpreadId) return;
      const spread = spreads.find(s => s.id === activeSpreadId);
      if (!spread) return;
      const photosInSpread = spread.layers.map(l => photos.find(p => p.id === l.photoId)).filter((p): p is Photo => !!p);
      const { results, exhausted } = generateUniqueVariations(photosInSpread, config, seenLayoutHashes, 6);
      if (results.length > 0) setLayoutSuggestions(prev => [...prev, ...results]);
      // Exhausted check removed to allow infinite generation
  };
  
  const applyTemplate = (layers: Layer[]) => {
      if (!activeSpreadId) return;
      handleUpdateLayers(activeSpreadId, layers);
      setShowTemplateModal(false);
  };

  const activeSpread = spreads.find(s => s.id === activeSpreadId);
  const activeLayer = activeSpread?.layers.find(l => l.id === selectedLayerId) || null;
  
  const photoUsage = new Map<string, number[]>();
  spreads.forEach(s => {
      s.layers.forEach(l => {
          const list = photoUsage.get(l.photoId) || [];
          if (!list.includes(s.index)) {
              list.push(s.index);
              list.sort((a,b) => a-b);
          }
          photoUsage.set(l.photoId, list);
      });
  });

  if (view === 'WELCOME') {
    return (
      <WelcomeScreen 
        onCreateProject={handleCreateProject}
        onOpenProject={handleLoadProjectFile}
        savedProjects={savedProjects}
        onLoadSavedProject={loadProjectIntoState}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white relative">
      <Toolbar 
        config={config} 
        totalSpreads={totalSpreads} 
        totalPhotos={photos.length}
        onUpdateConfig={updates => setConfig(prev => ({ ...prev, ...updates }))}
        onUpdateSpreads={setTotalSpreads}
        onAutoDistribute={handleAutoDistribute}
        onRedistributeGlobal={handleGlobalRedistribute}
        onExport={() => setShowExportModal(true)}
        onSaveProject={handleSaveProject}
        onPreview={() => setShowPreview(true)}
        isExporting={isExporting}
        onShowTemplates={openTemplateModal}
        onAddSpread={handleAddSpread}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex.current > 0}
        canRedo={historyIndex.current < history.length - 1}
        onResizeProject={handleResizeProject}
        onUpdateGap={handleUpdateGap}
        onReturnToWelcome={handleReturnToWelcome}
      />

      <div className="flex flex-1 overflow-hidden">
        <PhotoSidebar 
          photos={photos} 
          photoUsage={photoUsage}
          onUpload={handleUpload}
          onRemove={handleRemovePhoto}
          onRelink={handleRelink}
          missingCount={missingPhotos.length}
        />

        <main className="flex-1 overflow-y-auto bg-gray-900/50 p-12 flex flex-col items-center custom-scrollbar"
              onClick={() => { setSelectedLayerId(null); }}
        >
            {spreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                    <p className="mb-4 text-xl">Comece importando fotos e clicando em "Auto Distribuir"</p>
                </div>
            ) : (
                <div className="w-full max-w-5xl">
                    {spreads.map((spread, index) => (
                    <React.Fragment key={spread.id}>
                        <AlbumCanvas 
                            spread={spread}
                            photos={photos}
                            config={config}
                            isActive={spread.id === activeSpreadId}
                            selectedLayerIds={selectedLayerId && spread.id === activeSpreadId ? new Set([selectedLayerId]) : undefined}
                            onSelectionChange={(ids) => {
                                if (ids.size > 0) { setActiveSpreadId(spread.id); setSelectedLayerId(Array.from(ids)[0]); } 
                                else { if (activeSpreadId === spread.id) setSelectedLayerId(null); }
                            }}
                            onSelectSpread={() => setActiveSpreadId(spread.id)}
                            onUpdateLayers={handleUpdateLayers}
                            onDeleteLayers={handleDeleteLayers}
                            onDeleteSpread={handleDeleteSpread}
                            onPhotoDrop={handlePhotoDrop}
                            onShowTemplates={() => { setActiveSpreadId(spread.id); openTemplateModal(); }}
                            onRedistribute={() => handleRedistributeSpread(spread.id)}
                            onDistributeFromHere={() => handleDistributeFromSpread(spread.id)}
                            onToggleLock={() => handleToggleLockSpread(spread.id)}
                            onUndo={handleUndo}
                            canUndo={historyIndex.current > 0}
                        />
                        
                        <div className="py-6 flex items-center justify-center relative group">
                             <div className="absolute inset-x-12 h-px bg-gray-800 group-hover:bg-blue-900/50 transition-colors"></div>
                             <button 
                                onClick={() => handleAddSpreadAt(index + 1)}
                                className="z-10 w-8 h-8 flex items-center justify-center bg-gray-900 border border-gray-700 text-gray-500 rounded hover:bg-blue-600 hover:border-blue-500 hover:text-white hover:scale-110 transition-all shadow-sm"
                                title="Inserir Nova Lâmina"
                             >
                                <Plus size={16} />
                             </button>
                        </div>
                    </React.Fragment>
                    ))}
                    <div className="h-20"></div>
                </div>
            )}
        </main>

        <PropertiesPanel 
          selectedLayer={activeLayer} 
          onUpdateLayer={handleUpdateActiveLayer} 
          photos={photos}
          config={config}
        />
      </div>
      
      {showPreview && (
          <BookPreviewModal 
              spreads={spreads} 
              photos={photos} 
              config={config} 
              onClose={() => setShowPreview(false)} 
          />
      )}

      {showTemplateModal && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
              <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center p-6 border-b border-gray-800">
                      <h2 className="text-xl font-bold text-white">Sugestões de Layout (No-Crop)</h2>
                      <button onClick={() => setShowTemplateModal(false)} className="hover:text-red-400"><X /></button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 auto-rows-fr">
                          {layoutSuggestions.map((suggestion, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => applyTemplate(suggestion.layers)}
                                className="w-full bg-gray-800 border border-gray-700 hover:border-blue-500 cursor-pointer rounded-lg relative group overflow-hidden transition-all hover:scale-105 shadow-md flex flex-col"
                              >
                                <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 text-[10px] rounded z-20 font-bold uppercase tracking-wider shadow-sm pointer-events-none">{suggestion.type}</div>
                                
                                <div className="p-2 flex-1 flex items-center justify-center bg-gray-800/50">
                                    <div 
                                        className="relative bg-white shadow-sm overflow-hidden"
                                        style={{ 
                                            aspectRatio: `${config.spreadWidth / config.spreadHeight}`,
                                            width: '100%'
                                        }}
                                    >
                                        {suggestion.layers.map(l => {
                                            const photo = photos.find(p => p.id === l.photoId);
                                            return (
                                                <div key={l.id} className="absolute overflow-hidden bg-gray-200"
                                                      style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.width}%`, height: `${l.height}%` }}
                                                >
                                                    {photo && !photo.isMissing && <img src={photo.previewUrl} className="w-full h-full object-cover" alt="" loading="lazy" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                              </div>
                          ))}
                      </div>
                      <div className="mt-8 flex flex-col items-center gap-2">
                              <button onClick={handleGenerateMoreTemplates} className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full text-sm font-medium transition-all hover:shadow-lg hover:border-blue-500 hover:text-blue-400">
                                 <RefreshCw size={16} /> Gerar Novos Layouts
                              </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <ExportModal 
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onConfirm={handleExportConfirm}
          spreads={spreads}
          activeSpreadId={activeSpreadId}
          isExporting={isExporting}
      />
    </div>
  );
};

export default App;