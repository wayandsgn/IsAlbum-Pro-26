
import React, { useState, useEffect } from 'react';
import { Spread, Photo, AlbumConfig } from '../types';
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface BookPreviewModalProps {
  spreads: Spread[];
  photos: Photo[];
  config: AlbumConfig;
  onClose: () => void;
}

// Helper to render HALF of a spread (Left or Right side)
const HalfSpread: React.FC<{ 
    spread?: Spread; 
    photos: Photo[]; 
    config: AlbumConfig;
    side: 'left' | 'right';
}> = ({ spread, photos, config, side }) => {
    
    if (!spread) {
         return (
             <div className="w-full h-full bg-gray-100 border-r border-gray-200"></div> 
         );
    }

    return (
        <div className="w-full h-full overflow-hidden relative bg-white">
            <div 
                className="absolute top-0 h-full"
                style={{
                    width: '200%', 
                    left: side === 'left' ? '0' : '-100%',
                    display: 'flex'
                }}
            >
                <div className="w-full h-full relative">
                     {/* Spine / Gutter */}
                     <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-gray-300 opacity-30 z-10"></div>
                     
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
                              alt=""
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
            </div>
            {/* Gradient Shadow for Depth */}
            <div 
                className={`absolute top-0 bottom-0 w-8 pointer-events-none z-20 ${side === 'left' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/10 to-transparent`} 
            />
        </div>
    );
}

export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({ spreads, photos, config, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [turnState, setTurnState] = useState<{ 
      active: boolean; 
      direction: 'next' | 'prev'; 
  }>({ active: false, direction: 'next' });

  const ANIM_DURATION = 900; 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (turnState.active) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, spreads.length, turnState.active]);

  const goNext = () => {
      if (currentIndex >= spreads.length - 1) return;
      setTurnState({ active: true, direction: 'next' });
      
      setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setTurnState({ active: false, direction: 'next' });
      }, ANIM_DURATION);
  };

  const goPrev = () => {
      if (currentIndex <= 0) return;
      setTurnState({ active: true, direction: 'prev' });
      
      setTimeout(() => {
          setCurrentIndex(prev => prev - 1);
          setTurnState({ active: false, direction: 'prev' });
      }, ANIM_DURATION);
  };

  const ar = config.spreadWidth / config.spreadHeight;

  // Spreads involved
  const currentSpread = spreads[currentIndex];
  const nextSpread = currentIndex < spreads.length - 1 ? spreads[currentIndex + 1] : undefined;
  const prevSpread = currentIndex > 0 ? spreads[currentIndex - 1] : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8" onClick={onClose}>
        <style>{`
            .book-perspective {
                perspective: 2500px;
            }
            .preserve-3d {
                transform-style: preserve-3d;
            }
            .backface-hidden {
                backface-visibility: hidden;
            }
            .rotate-y-180 {
                transform: rotateY(180deg);
            }
            
            /* Pivot on Spine (Left edge of Right Page) */
            .leaf-pivot-right {
                transform-origin: left center;
            }
             /* Pivot on Spine (Right edge of Left Page) */
            .leaf-pivot-left {
                transform-origin: right center;
            }

            @keyframes turnNext {
                0% { transform: rotateY(0deg); }
                100% { transform: rotateY(-180deg); }
            }
            @keyframes turnPrev {
                0% { transform: rotateY(180deg); }
                100% { transform: rotateY(0deg); }
            }
            
            .anim-next {
                animation: turnNext ${ANIM_DURATION}ms cubic-bezier(0.645, 0.045, 0.355, 1.000) forwards;
            }
            .anim-prev {
                animation: turnPrev ${ANIM_DURATION}ms cubic-bezier(0.645, 0.045, 0.355, 1.000) forwards;
            }
        `}</style>

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
          disabled={currentIndex === 0 || turnState.active}
          className="p-3 text-white disabled:opacity-20 hover:bg-gray-800 rounded-full transition-all z-50 transform hover:scale-110 active:scale-95"
        >
          <ChevronLeft size={48} />
        </button>

        <div className="flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden book-perspective">
            <div 
                className="relative shadow-2xl bg-gray-900"
                style={{
                    width: `min(90vw, calc(85vh * ${ar}))`,
                    aspectRatio: `${ar}`,
                }}
            >
                {/* --- STATIC BASE LAYER --- */}
                <div className="absolute inset-0 flex">
                    {/* Left Base: 
                        If Going Next: We see Current Left.
                        If Going Prev: We see Prev Left (because Current Left is flipping).
                    */}
                    <div className="w-1/2 h-full">
                        <HalfSpread 
                            side="left" config={config} photos={photos}
                            spread={turnState.active && turnState.direction === 'prev' ? prevSpread : currentSpread} 
                        />
                    </div>
                    {/* Right Base:
                        If Going Next: We see Next Right (because Current Right is flipping).
                        If Going Prev: We see Current Right.
                    */}
                    <div className="w-1/2 h-full">
                        <HalfSpread 
                            side="right" config={config} photos={photos}
                            spread={turnState.active && turnState.direction === 'next' ? nextSpread : currentSpread} 
                        />
                    </div>
                </div>

                {/* --- MOVING LEAF --- */}
                {turnState.active && (
                    <div 
                        className={`absolute top-0 w-1/2 h-full preserve-3d z-30 ${
                            turnState.direction === 'next' 
                                ? 'right-0 leaf-pivot-right anim-next' 
                                : 'left-0 leaf-pivot-left anim-prev' // Actually logic below handles position
                        }`}
                        // For Prev animation, we conceptualize it as a page on Left flipping to Right. 
                        // But CSS rotation 180->0 on right pivot is easier.
                        // Let's stick to Right Pivot for consistency:
                        // Prev: Page starts at -180 (Left side) and goes to 0 (Right side).
                        // Wait, physically: The leaf is the one between Prev and Curr. 
                        // It has Prev-Right on one side, Curr-Left on other.
                        // We will use a Single Flipper positioned on the Right Half, pivoting on Left Edge.
                        style={turnState.direction === 'prev' ? { right: 0, transformOrigin: 'left center' } : {}}
                    >
                        {/* 
                           FRONT FACE (0deg): Visible when page is on Right.
                           Next: This is Current(Right).
                           Prev: This is Current(Right)? No, Prev animation ends at 0deg (Right).
                                 The page landing on the right is the one with Prev(Right) on it?
                                 No, going back means revealing Prev. 
                                 Wait. 
                                 Start: [Prev Left] [Curr Left] | [Curr Right] (Hidden)
                                 Motion: [Curr Left] flips to become [Curr Right].
                                 End: [Prev Left] [Prev Right].
                                 
                                 So for PREV:
                                 Static Left: Prev Left.
                                 Static Right: Curr Right.
                                 Flipper rotates -180 (Left) -> 0 (Right).
                                 At -180 (Left): We see "Back" of flipper. This must be Curr-Left.
                                 At 0 (Right): We see "Front" of flipper. This must be Prev-Right.
                        */}
                        
                        {/* FRONT FACE (Visible at 0deg - Right Side) */}
                        <div className="absolute inset-0 w-full h-full backface-hidden bg-white">
                            <HalfSpread 
                                side="right" config={config} photos={photos}
                                spread={turnState.direction === 'next' ? currentSpread : prevSpread} 
                            />
                            {/* Shadow for Front Face */}
                            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/30 pointer-events-none mix-blend-multiply" />
                        </div>

                        {/* BACK FACE (Visible at -180deg - Left Side) */}
                        <div className="absolute inset-0 w-full h-full rotate-y-180 backface-hidden bg-white">
                            <HalfSpread 
                                side="left" config={config} photos={photos}
                                spread={turnState.direction === 'next' ? nextSpread : currentSpread} 
                            />
                             {/* Shadow for Back Face */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30 pointer-events-none mix-blend-multiply" />
                        </div>
                    </div>
                )}
                
                {/* Central Spine Shadow (Static) */}
                <div className="absolute top-0 bottom-0 left-1/2 -ml-[1px] w-[2px] bg-black/40 z-40 blur-[2px]" />
            </div>
        </div>

        <button
          onClick={goNext}
          disabled={currentIndex >= spreads.length - 1 || turnState.active}
          className="p-3 text-white disabled:opacity-20 hover:bg-gray-800 rounded-full transition-all z-50 transform hover:scale-110 active:scale-95"
        >
          <ChevronRight size={48} />
        </button>
      </div>
      
       <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white px-4 py-1 rounded-full text-sm font-mono border border-gray-700 transition-opacity duration-300">
         Lâmina {currentIndex + 1} de {spreads.length}
       </div>
    </div>
  );
};
