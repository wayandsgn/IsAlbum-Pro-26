
import React, { useState, useEffect } from 'react';
import { Spread, Photo, AlbumConfig, Layer } from '../types';
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface BookPreviewModalProps {
  spreads: Spread[];
  photos: Photo[];
  config: AlbumConfig;
  onClose: () => void;
}

// Read-only component to display a single spread without interactive elements.
const ReadonlySpread: React.FC<{ spread?: Spread; photos: Photo[]; config: AlbumConfig }> = ({ spread, photos, config }) => {
  if (!spread) {
    return (
      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500">
        Lâmina inválida.
      </div>
    );
  }

  const aspectRatio = config.spreadWidth / config.spreadHeight;

  return (
    <div className="relative bg-white shadow-2xl" style={{ aspectRatio: `${aspectRatio}` }}>
      {/* Central Guide Line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-gray-400 opacity-50 z-0"></div>

      {spread.layers.map(layer => {
        const photo = photos.find(p => p.id === layer.photoId);
        if (!photo) return null;
        
        const adj = layer.adjustments;
        const frameW = (layer.width / 100) * config.spreadWidth;
        const frameH = (layer.height / 100) * config.spreadHeight;
        const frameAR = frameW / frameH;
        const photoAR = photo.aspectRatio || 1;
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
              alt={photo.fileName}
              style={{
                width: isWide ? 'auto' : '100%',
                height: isWide ? '100%' : 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: 'contain',
                transform: `scale(${adj.scale}) translate(${adj.panX}px, ${adj.panY}px) rotate(${adj.rotation}deg)`,
                filter: `brightness(${100 + adj.brightness}%) contrast(${100 + adj.contrast}%) saturate(${100 + adj.saturation}%) hue-rotate(${adj.temperature}deg)`
              }}
            />
          </div>
        );
      })}
    </div>
  );
};


export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({ spreads, photos, config, onClose }) => {
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSpreadIndex, spreads.length]);

  const goNext = () => setCurrentSpreadIndex(i => Math.min(i + 1, spreads.length - 1));
  const goPrev = () => setCurrentSpreadIndex(i => Math.max(i - 1, 0));

  const currentSpread = spreads[currentSpreadIndex];

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8" onClick={onClose}>
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

      <div className="flex items-center gap-4 w-full h-full justify-center" onClick={e => e.stopPropagation()}>
        <button
          onClick={goPrev}
          disabled={currentSpreadIndex === 0}
          className="p-3 text-white disabled:opacity-20 hover:bg-gray-800 rounded-full transition-all z-50"
        >
          <ChevronLeft size={48} />
        </button>

        <div className="flex-1 w-full h-full flex items-center justify-center p-4">
            <div className="w-auto h-auto max-w-full max-h-full">
                <ReadonlySpread spread={currentSpread} photos={photos} config={config} />
            </div>
        </div>

        <button
          onClick={goNext}
          disabled={currentSpreadIndex >= spreads.length - 1}
          className="p-3 text-white disabled:opacity-20 hover:bg-gray-800 rounded-full transition-all z-50"
        >
          <ChevronRight size={48} />
        </button>
      </div>
      
       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white px-4 py-1 rounded-full text-sm font-mono border border-gray-700">
         Lâmina {currentSpreadIndex + 1} de {spreads.length}
       </div>
    </div>
  );
};
