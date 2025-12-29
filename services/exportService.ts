
import { writePsd, Psd } from 'ag-psd';
import { jsPDF } from 'jspdf';
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

// Helper to draw image to canvas and get pixel data
const getImageCanvas = (img: HTMLImageElement, width: number, height: number, layer?: any): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Internal Transforms (Scale, Rotation, Pan)
    if (layer && layer.adjustments) {
        ctx.save();
        // Move to center of canvas
        ctx.translate(width / 2, height / 2);
        
        // Rotate
        ctx.rotate((layer.adjustments.rotation * Math.PI) / 180);
        
        // Scale
        ctx.scale(layer.adjustments.scale, layer.adjustments.scale);
        
        // Pan
        ctx.translate(layer.adjustments.panX, layer.adjustments.panY);
        
        // Draw image centered at origin
        // We need to calculate draw dimensions based on 'cover' style logic relative to canvas size
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        
        let drawW, drawH;
        if (imgRatio > canvasRatio) {
            drawH = height;
            drawW = height * imgRatio;
        } else {
            drawW = width;
            drawH = width / imgRatio;
        }
        
        // Filter simulation for Canvas (Limited support compared to CSS)
        // Basic Brightness/Contrast can be simulated with filter property string
        const adj = layer.adjustments;
        ctx.filter = `brightness(${100 + adj.brightness}%) contrast(${100 + adj.contrast}%) saturate(${100 + adj.saturation}%)`;

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        
        ctx.restore();
    } else {
        // Fallback simple draw
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }
  }
  return canvas;
};

// --- PSD EXPORT ---
export const exportSpreadToPSD = async (
  spread: Spread,
  photos: Photo[],
  config: AlbumConfig
): Promise<Blob> => {
  const children = [];

  // Background
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

  for (const layer of spread.layers) {
    const photo = photos.find(p => p.id === layer.photoId);
    if (!photo) continue;

    const imgElement = await loadImageData(photo.file);
    
    const finalW = Math.round((layer.width / 100) * config.spreadWidth);
    const finalH = Math.round((layer.height / 100) * config.spreadHeight);
    const finalX = Math.round((layer.x / 100) * config.spreadWidth);
    const finalY = Math.round((layer.y / 100) * config.spreadHeight);

    const layerCanvas = getImageCanvas(imgElement, finalW, finalH, layer);

    children.push({
      name: `Image - ${photo.file.name}`,
      left: finalX,
      top: finalY,
      width: finalW,
      height: finalH,
      canvas: layerCanvas, 
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

// --- JPG EXPORT ---
export const exportSpreadToJPG = async (
  spread: Spread,
  photos: Photo[],
  config: AlbumConfig
): Promise<Blob> => {
  // Create a main canvas composing everything
  const canvas = document.createElement('canvas');
  canvas.width = config.spreadWidth;
  canvas.height = config.spreadHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Canvas context failed");

  // White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const layer of spread.layers) {
    const photo = photos.find(p => p.id === layer.photoId);
    if (!photo) continue;

    const imgElement = await loadImageData(photo.file);
    const w = Math.round((layer.width / 100) * config.spreadWidth);
    const h = Math.round((layer.height / 100) * config.spreadHeight);
    const x = Math.round((layer.x / 100) * config.spreadWidth);
    const y = Math.round((layer.y / 100) * config.spreadHeight);

    const layerCanvas = getImageCanvas(imgElement, w, h, layer);
    
    // Draw rotated frame if needed (Frame Rotation)
    ctx.save();
    // Move to center of layer frame
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.drawImage(layerCanvas, -w/2, -h/2);
    ctx.restore();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/jpeg', 0.95);
  });
};

// --- SINGLE PDF EXPORT ---
export const exportSpreadToPDF = async (
    spread: Spread,
    photos: Photo[],
    config: AlbumConfig
): Promise<Blob> => {
    const jpgBlob = await exportSpreadToJPG(spread, photos, config);
    const jpgDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(jpgBlob);
    });

    const doc = new jsPDF({
        orientation: config.spreadWidth > config.spreadHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [config.spreadWidth, config.spreadHeight]
    });

    doc.addImage(jpgDataUrl, 'JPEG', 0, 0, config.spreadWidth, config.spreadHeight);
    return doc.output('blob');
};

// --- MULTIPLE PDF EXPORT ---
export const exportMultipleSpreadsToPDF = async (
    spreads: Spread[],
    photos: Photo[],
    config: AlbumConfig
): Promise<Blob> => {
    const doc = new jsPDF({
        orientation: config.spreadWidth > config.spreadHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [config.spreadWidth, config.spreadHeight]
    });

    for (let i = 0; i < spreads.length; i++) {
        if (i > 0) doc.addPage([config.spreadWidth, config.spreadHeight]);
        
        const spread = spreads[i];
        const jpgBlob = await exportSpreadToJPG(spread, photos, config);
        const jpgDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(jpgBlob);
        });

        doc.addImage(jpgDataUrl, 'JPEG', 0, 0, config.spreadWidth, config.spreadHeight);
    }

    return doc.output('blob');
};
