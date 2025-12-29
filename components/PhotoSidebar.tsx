
import React from 'react';
import { Photo } from '../types';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface PhotoSidebarProps {
  photos: Photo[];
  photoUsage: Map<string, number[]>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
}

export const PhotoSidebar: React.FC<PhotoSidebarProps> = ({ photos, photoUsage, onUpload, onRemove }) => {
  
  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    e.dataTransfer.setData('photoId', photoId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full z-20 shadow-xl">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-400" />
          Galeria
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {photos.length} fotos carregadas
        </p>

        <label className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors text-sm font-medium">
          <Upload className="w-4 h-4 mr-2" />
          Importar Fotos
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={onUpload}
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {photos.length === 0 && (
          <div className="text-center text-gray-600 mt-10">
            <p className="text-sm">Nenhuma foto importada.</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          {photos.map(photo => {
            const usage = photoUsage.get(photo.id);
            const isUsed = usage && usage.length > 0;
            return (
              <div 
                key={photo.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, photo.id)}
                className={clsx(
                  "relative group aspect-square bg-gray-800 rounded-md overflow-hidden border border-gray-800 transition-all cursor-grab active:cursor-grabbing",
                  isUsed ? "opacity-60 hover:opacity-100 border-blue-900/30" : "hover:border-blue-500/50 hover:shadow-md"
                )}
              >
                <img 
                  src={photo.previewUrl} 
                  alt="thumb" 
                  className="w-full h-full object-cover pointer-events-none"
                />
                
                {/* Usage Indicator - Top Left */}
                <div className="absolute top-1 left-1 z-10 pointer-events-none">
                    {isUsed ? (
                        <div className="w-6 h-6 rounded-full bg-yellow-500 border border-yellow-600 flex items-center justify-center shadow-md relative" title={`Usada na lâmina ${usage.join(', ')}`}>
                            <span className="text-[10px] font-bold text-black leading-none">{usage[0]}</span>
                            {usage.length > 1 && (
                                <span className="absolute -right-1 -bottom-1 bg-blue-600 text-white text-[8px] px-1 rounded-full flex items-center justify-center border border-gray-900 leading-tight h-3 min-w-[12px]">
                                    +
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-400/50 bg-black/20 flex items-center justify-center shadow-sm">
                            {/* Empty */}
                        </div>
                    )}
                </div>

                <button 
                  onClick={() => onRemove(photo.id)}
                  className="absolute top-1 right-1 bg-black/60 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-red-400 cursor-pointer"
                  title="Remover da galeria"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
