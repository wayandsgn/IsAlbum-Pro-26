
import React, { useState, useEffect } from 'react';
import { Spread, Photo, AlbumConfig } from '../types';
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface BookPreviewModalProps {
  spreads: Spread[];
  photos: Photo[];
  config: AlbumConfig;
  onClose: () => void;
}

export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({ spreads, photos, config, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const next = () => setCurrentIndex(p => Math.min(spreads.length - 1, p + 1));
  const prev = () => setCurrentIndex(p => Math.max(0, p - 1));

  const currentSpread = spreads[currentIndex];
  const aspectRatio = config.spreadWidth / config.spreadHeight;

  if (!currentSpread) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
        <div className="text-white font-medium flex items-center gap-2">
            <BookOpen className="text-blue-500" />
            <span>Visualização do Álbum</span>
        </div>
        <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white bg-gray-900 rounded-full p-2 transition-colors border border-gray-800"
        >
            <X size={24} />
        </button>
      </div>

      <div className="flex items-center gap-4 w-full h-full justify-center">
         <button 
            onClick={prev} 
            disabled={currentIndex === 0} 
            className="p-3 text-white disabled:opacity-20 hover:bg-gray-800 rounded-full transition-all"
         >
            <ChevronLeft size={48} />
         </button>
         
         <div className="flex-1 h-full flex items-center justify-center relative overflow-hidden">
             <div 
                className="relative shadow-2xl bg-white transition-all duration-300 ease-in-out" 
                style={{ 
                    aspectRatio: `${aspectRatio}`, 
                    maxHeight: '80vh', 
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto'
                }}
             >
                 {/* Center Fold Line */}
                 <div className="absolute top-0 bottom-0 left-1/2 w-px bg-black/10 z-10 shadow-[0_0_10px_rgba(0,0,0,0.2)]"></div>

                 {/* Render Layers Read-Only */}
                 {currentSpread.layers.map(layer => {
                     const photo = photos.find(p => p.id === layer.photoId);
                     if (!photo) return null;
                     const adj = layer.adjustments;

                     const frameW = (layer.width / 100) * config.spreadWidth;
                     const frameH = (layer.height / 100) * config.spreadHeight;
                     const frameAR = frameW / frameH;
                     const photoAR = photo.aspectRatio || (photo.width / photo.height) || 1;
                     const isWide = photoAR > frameAR;

                     return (
                         <div 
                            key={layer.id}
                            className="absolute overflow-hidden bg-gray-100 flex items-center justify-center"
                            style={{
                                left: `${layer.x}%`, 
                                top: `${layer.y}%`, 
                                width: `${layer.width}%`, 
                                height: `${layer.height}%`,
                                transform: `rotate(${layer.rotation}deg)`
                            }}
                         >
                             <img 
                                src={photo.previewUrl} 
                                className="block"
                                style={{
                                    width: isWide ? 'auto' : '100%',
                                    height: isWide ? '100%' : 'auto',
                                    maxWidth: 'none',
                                    maxHeight: 'none',
                                    objectFit: 'contain',
                                    transform: `scale(${adj.scale}) translate(${adj.panX}px, ${adj.panY}px)`,
                                    filter: `brightness(${100+adj.brightness}%) contrast(${100+adj.contrast}%) saturate(${100+adj.saturation}%) hue-rotate(${adj.temperature}deg)`
                                }}
                             />
                         </div>
                     );
                 })}
             </div>
             
             {/* Info Indicator */}
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white px-4 py-1 rounded-full text-sm font-mono border border-gray-700">
                 Lâmina {currentIndex + 1} de {spreads.length}
             </div>
         </div>

         <button 
            onClick={next} 
            disabled={currentIndex === spreads.length - 1} 
            className="p-3 text-white disabled:opacity-20 hover:bg-gray-800 rounded-full transition-all"
         >
            <ChevronRight size={48} />
         </button>
      </div>
    </div>
  );
};
