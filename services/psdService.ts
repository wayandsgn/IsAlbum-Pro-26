import { writePsd, Psd } from 'ag-psd';
import { AlbumConfig, Spread, Photo } from '../types';

// Helper to load image data
const loadImageData = async (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Helper to draw image to canvas and get pixel data (ag-psd needs pixel data or canvas)
const getImageCanvas = (img: HTMLImageElement, width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw image covering the area (simulating object-fit: cover)
    const scale = Math.max(width / img.width, height / img.height);
    const x = (width / 2) - (img.width / 2) * scale;
    const y = (height / 2) - (img.height / 2) * scale;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }
  return canvas;
};

export const exportSpreadToPSD = async (
  spread: Spread,
  photos: Photo[],
  config: AlbumConfig
): Promise<Blob> => {
  const children = [];

  // Background Layer
  children.push({
    name: 'Background',
    canvas: (() => {
      const c = document.createElement('canvas');
      c.width = config.spreadWidth;
      c.height = config.spreadHeight;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      return c;
    })()
  });

  // Process Layers (Reverse order for PSD stacking usually, but ag-psd uses array order 0=bottom)
  // Actually ag-psd 0 is bottom-most.
  
  for (const layer of spread.layers) {
    const photo = photos.find(p => p.id === layer.photoId);
    if (!photo) continue;

    const imgElement = await loadImageData(photo.file);
    
    // Calculate actual pixels from percentages
    const finalW = Math.round((layer.width / 100) * config.spreadWidth);
    const finalH = Math.round((layer.height / 100) * config.spreadHeight);
    const finalX = Math.round((layer.x / 100) * config.spreadWidth);
    const finalY = Math.round((layer.y / 100) * config.spreadHeight);

    const layerCanvas = getImageCanvas(imgElement, finalW, finalH);

    children.push({
      name: `Image - ${photo.file.name}`,
      left: finalX,
      top: finalY,
      width: finalW,
      height: finalH,
      canvas: layerCanvas, // ag-psd will grab the pixels
    });
  }

  const psd: Psd = {
    width: config.spreadWidth,
    height: config.spreadHeight,
    children: children,
  };

  const buffer = writePsd(psd);
  return new Blob([buffer], { type: 'application/octet-stream' });
};