




export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Photo {
  id: string;
  file: File | null; // Can be null if missing
  path: string; // Original absolute path of the file
  fileName: string;
  previewUrl: string; // Data URL or object URL
  width: number;
  height: number;
  aspectRatio: number;
  isMissing?: boolean;
}

export interface PhotoMetadata {
  id: string;
  path: string;
  fileName: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ImageAdjustments {
  exposure: number; // -100 to 100
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100 (Realce/Vibração approximation)
  highlights: number; // -100 to 100 (CSS filter approximation)
  shadows: number; // -100 to 100 (CSS filter approximation)
  blacks: number; // -100 to 100
  temperature: number; // -100 to 100 (White balance)
  rotation: number; // Rotation within frame
  scale: number; // Scale within frame
  panX: number; // Pan within frame
  panY: number; // Pan within frame
}

export interface Layer {
  id: string;
  photoId: string;
  x: number; // Percentage (0-100) relative to spread width
  y: number; // Percentage (0-100) relative to spread height
  width: number; // Percentage (0-100)
  height: number; // Percentage (0-100)
  rotation: number; // Frame rotation
  adjustments: ImageAdjustments;
  isLocked?: boolean; // Protect layer from auto-layout
}

export interface Spread {
  id: string;
  index: number;
  layers: Layer[];
  isLocked?: boolean; // New property to lock layout geometry
}

export type Unit = 'px' | 'cm' | 'mm' | 'm' | 'pt';
export type ColorMode = 'RGB' | 'CMYK';

export interface AlbumConfig {
  projectName: string;
  spreadWidth: number; // always in pixels for internal logic
  spreadHeight: number; // always in pixels for internal logic
  displayUnit: Unit;
  dpi: number;
  colorMode: ColorMode;
  gap: number; // in pixels
  margin: number; // in pixels
}

export interface SavedProject {
  id:string;
  name: string;
  thumbnail?: string; // Data URL
  lastModified: number;
  config: AlbumConfig;
  spreads: Spread[];
  photos: PhotoMetadata[]; // Store photo info for relinking
}

export enum LayoutMode {
  Grid = 'GRID',
  Mosaic = 'MOSAIC',
  Single = 'SINGLE',
}

export interface AlbumPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: Unit;
  dpi: number;
}

export interface LoadedImage {
  success: boolean;
  path: string;
  dataUrl?: string;
  mimeType?: string;
}

export interface RelinkedFile {
    id: string;
    newPath: string;
    fileName: string;
    dataUrl: string;
    mimeType: string;
}

export interface ElectronAPI {
    saveFile: (options: {
        title: string;
        defaultPath: string;
        filters: { name: string; extensions: string[] }[];
        data: Uint8Array;
    }) => Promise<{ success: boolean; path?: string; error?: string }>;
    loadImageFromPath: (path: string) => Promise<LoadedImage>;
    selectDirectory: () => Promise<string | null>;
    findAndLoadFiles: (options: { 
        directoryPath: string; 
        filesToFind: { id: string, fileName: string }[] 
    }) => Promise<RelinkedFile[]>;
}
