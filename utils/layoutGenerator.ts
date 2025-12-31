

import { Spread, Layer, Photo, AlbumConfig } from '../types';

const uuid = () => Math.random().toString(36).substr(2, 9);

const defaultAdjustments = {
  exposure: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  highlights: 0,
  shadows: 0,
  blacks: 0,
  temperature: 0,
  rotation: 0,
  scale: 1,
  panX: 0,
  panY: 0
};

// --- HELPERS ---

const getGapPctX = (config: AlbumConfig) => (config.gap / config.spreadWidth) * 100;
const getGapPctY = (config: AlbumConfig) => (config.gap / config.spreadHeight) * 100;
const getMarginPctX = (config: AlbumConfig) => (config.margin / config.spreadWidth) * 100;
const getMarginPctY = (config: AlbumConfig) => (config.margin / config.spreadHeight) * 100;

// Helper to create a signature for a layout to check for duplicates
export const getLayoutHash = (layers: Layer[]): string => {
    // Sort layers by x then y to normalize order
    const sorted = [...layers].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return sorted.map(l => `${l.x.toFixed(1)}:${l.y.toFixed(1)}:${l.width.toFixed(1)}:${l.height.toFixed(1)}`).join('|');
};

// --- TEMPLATE DATABASE (Based on Visual References) ---
// Defined in normalized grid units (0 to 1)
type TemplateBox = { x: number, y: number, w: number, h: number };
type TemplateDb = Record<number, TemplateBox[][]>;

const STATIC_TEMPLATES: TemplateDb = {
    2: [
        [{x:0, y:0, w:0.5, h:1}, {x:0.5, y:0, w:0.5, h:1}],
        [{x:0, y:0, w:1, h:0.5}, {x:0, y:0.5, w:1, h:0.5}],
        [{x:0, y:0, w:0.66, h:1}, {x:0.66, y:0, w:0.34, h:1}],
        [{x:0, y:0, w:0.34, h:1}, {x:0.34, y:0, w:0.66, h:1}],
        [{x:0.05, y:0.1, w:0.425, h:0.8}, {x:0.525, y:0.1, w:0.425, h:0.8}]
    ],
    3: [
        [{x:0, y:0, w:0.333, h:1}, {x:0.333, y:0, w:0.333, h:1}, {x:0.666, y:0, w:0.333, h:1}],
        [{x:0, y:0, w:0.5, h:1}, {x:0.5, y:0, w:0.5, h:0.5}, {x:0.5, y:0.5, w:0.5, h:0.5}],
        // From user image 2
        [{x:0, y:0, w:0.5, h:0.5}, {x:0, y:0.5, w:0.5, h:0.5}, {x:0.5, y:0, w:0.5, h:1}],
        [{x:0, y:0, w:1, h:0.6}, {x:0, y:0.6, w:0.5, h:0.4}, {x:0.5, y:0.6, w:0.5, h:0.4}],
        [{x:0, y:0, w:1, h:0.333}, {x:0, y:0.333, w:1, h:0.333}, {x:0, y:0.666, w:1, h:0.333}]
    ],
    4: [
        [{x:0, y:0, w:0.5, h:0.5}, {x:0.5, y:0, w:0.5, h:0.5}, {x:0, y:0.5, w:0.5, h:0.5}, {x:0.5, y:0.5, w:0.5, h:0.5}],
        [{x:0, y:0, w:0.25, h:1}, {x:0.25, y:0, w:0.25, h:1}, {x:0.5, y:0, w:0.25, h:1}, {x:0.75, y:0, w:0.25, h:1}],
        [{x:0, y:0, w:0.5, h:1}, {x:0.5, y:0, w:0.5, h:0.333}, {x:0.5, y:0.333, w:0.5, h:0.333}, {x:0.5, y:0.666, w:0.5, h:0.333}],
        // From user image 1
        [{x:0, y:0, w:0.5, h:0.5}, {x:0, y:0.5, w:0.25, h:0.5}, {x:0.25, y:0.5, w:0.25, h:0.5}, {x:0.5, y:0, w:0.5, h:1}],
        // From user image 3
        [{x:0, y:0, w:0.25, h:0.5}, {x:0.25, y:0, w:0.25, h:0.5}, {x:0, y:0.5, w:0.5, h:0.5}, {x:0.5, y:0, w:0.5, h:1}],
        [{x:0, y:0, w:1, h:0.65}, {x:0, y:0.65, w:0.333, h:0.35}, {x:0.333, y:0.65, w:0.333, h:0.35}, {x:0.666, y:0.65, w:0.333, h:0.35}]
    ],
    5: [
        [{x:0, y:0, w:0.5, h:1}, {x:0.5, y:0, w:0.25, h:0.5}, {x:0.75, y:0, w:0.25, h:0.5}, {x:0.5, y:0.5, w:0.25, h:0.5}, {x:0.75, y:0.5, w:0.25, h:0.5}],
        [{x:0, y:0, w:0.5, h:0.5}, {x:0.5, y:0, w:0.5, h:0.5}, {x:0, y:0.5, w:0.333, h:0.5}, {x:0.333, y:0.5, w:0.333, h:0.5}, {x:0.666, y:0.5, w:0.333, h:0.5}],
        [{x:0, y:0, w:0.2, h:1}, {x:0.2, y:0, w:0.2, h:1}, {x:0.4, y:0, w:0.2, h:1}, {x:0.6, y:0, w:0.2, h:1}, {x:0.8, y:0, w:0.2, h:1}],
        // From user image 4
        [{x:0, y:0, w:0.25, h:0.5}, {x:0.25, y:0, w:0.25, h:0.5}, {x:0, y:0.5, w:0.25, h:0.5}, {x:0.25, y:0.5, w:0.25, h:0.5}, {x:0.5, y:0, w:0.5, h:1}],
        // From user image 8
        [{x:0, y:0, w:0.5, h:0.5}, {x:0.5, y:0, w:0.25, h:0.5}, {x:0.75, y:0, w:0.25, h:0.5}, {x:0, y:0.5, w:0.5, h:0.5}, {x:0.5, y:0.5, w:0.5, h:0.5}],
        // From user image 9
        [{x:0, y:0, w:0.5, h:0.5}, {x:0.5, y:0, w:0.5, h:0.5}, {x:0, y:0.5, w:0.25, h:0.5}, {x:0.25, y:0.5, w:0.25, h:0.5}, {x:0.5, y:0.5, w:0.5, h:0.5}]
    ],
    6: [
        [{x:0, y:0, w:0.5, h:0.6}, {x:0.5, y:0, w:0.5, h:0.6}, {x:0, y:0.6, w:0.333, h:0.4}, {x:0.333, y:0.6, w:0.333, h:0.4}, {x:0.666, y:0.6, w:0.333, h:0.4}],
        // From user image 5 (2x3 Grid)
        [{x:0, y:0, w:0.333, h:0.5}, {x:0.333, y:0, w:0.333, h:0.5}, {x:0.666, y:0, w:0.333, h:0.5}, {x:0, y:0.5, w:0.333, h:0.5}, {x:0.333, y:0.5, w:0.333, h:0.5}, {x:0.666, y:0.5, w:0.333, h:0.5}],
        [{x:0, y:0, w:0.5, h:0.333}, {x:0.5, y:0, w:0.5, h:0.333}, {x:0, y:0.333, w:0.5, h:0.333}, {x:0.5, y:0.333, w:0.5, h:0.333}, {x:0, y:0.666, w:0.5, h:0.333}, {x:0.5, y:0.666, w:0.5, h:0.333}],
        [{x:0, y:0, w:0.5, h:1}, {x:0.5, y:0, w:0.25, h:0.5}, {x:0.75, y:0, w:0.25, h:0.5}, {x:0.5, y:0.5, w:0.25, h:0.5}, {x:0.75, y:0.5, w:0.25, h:0.5}]
    ],
    7: [
        // From user image 6 (simplified grid)
        [{x:0, y:0, w:0.333, h:0.5}, {x:0.333, y:0, w:0.333, h:0.5}, {x:0.666, y:0, w:0.333, h:0.5}, {x:0, y:0.5, w:0.25, h:0.5}, {x:0.25, y:0.5, w:0.25, h:0.5}, {x:0.5, y:0.5, w:0.25, h:0.5}, {x:0.75, y:0.5, w:0.25, h:0.5}]
    ],
    8: [
        // From user image 7 (4x2 grid)
        [{x:0, y:0, w:0.25, h:0.5}, {x:0.25, y:0, w:0.25, h:0.5}, {x:0.5, y:0, w:0.25, h:0.5}, {x:0.75, y:0, w:0.25, h:0.5}, {x:0, y:0.5, w:0.25, h:0.5}, {x:0.25, y:0.5, w:0.25, h:0.5}, {x:0.5, y:0.5, w:0.25, h:0.5}, {x:0.75, y:0.5, w:0.25, h:0.5}]
    ]
};

const applyStaticTemplate = (template: TemplateBox[], photos: Photo[], config: AlbumConfig): Layer[] => {
    const marginX = getMarginPctX(config);
    const marginY = getMarginPctY(config);
    const gapX = getGapPctX(config);
    const gapY = getGapPctY(config);
    
    const availW = 100 - (marginX * 2);
    const availH = 100 - (marginY * 2);

    return photos.map((photo, i) => {
        if (!template[i]) return null;
        const box = template[i];
        
        let x = marginX + (box.x * availW);
        let y = marginY + (box.y * availH);
        let w = box.w * availW;
        let h = box.h * availH;

        const isLeftEdge = box.x <= 0.01;
        const isTopEdge = box.y <= 0.01;
        const isRightEdge = box.x + box.w >= 0.99;
        const isBottomEdge = box.y + box.h >= 0.99;

        if (!isLeftEdge) { x += gapX / 2; w -= gapX / 2; }
        if (!isRightEdge) { w -= gapX / 2; }
        
        if (!isTopEdge) { y += gapY / 2; h -= gapY / 2; }
        if (!isBottomEdge) { h -= gapY / 2; }

        return {
            id: uuid(),
            photoId: photo.id,
            x, y, width: w, height: h,
            rotation: 0,
            adjustments: { ...defaultAdjustments }
        };
    }).filter(Boolean) as Layer[];
};

/**
 * SMART STRUCTURED GENERATOR (Orientation Aware BSP)
 * Sorts photos by aspect ratio and creates splits that accommodate the photos' orientation.
 */
const generateBSP = (
    photos: Photo[], 
    box: {x: number, y: number, w: number, h: number}
): {x: number, y: number, w: number, h: number, photo: Photo}[] => {
    if (photos.length === 0) return [];
    if (photos.length === 1) {
        return [{ ...box, photo: photos[0] }];
    }

    // Sort by Aspect Ratio (Low [Vertical] to High [Horizontal])
    // This allows us to group verticals together and horizontals together
    const sortedPhotos = [...photos].sort((a, b) => (a.aspectRatio || 1) - (b.aspectRatio || 1));

    const count = sortedPhotos.length;
    const splitIndex = Math.floor(count / 2);
    
    const groupA = sortedPhotos.slice(0, splitIndex); // Likely Verticals (Low AR)
    const groupB = sortedPhotos.slice(splitIndex);    // Likely Horizontals (High AR)
    
    const avgAR_A = groupA.reduce((sum, p) => sum + (p.aspectRatio || 1), 0) / groupA.length;
    const avgAR_B = groupB.reduce((sum, p) => sum + (p.aspectRatio || 1), 0) / groupB.length;
    
    const boxAR = box.w / box.h;
    
    // DECISION LOGIC:
    // We want the resulting slot shape (AR) to match the Photo AR.
    // Vertical Cut -> Left/Right boxes. Box Width decreases. AR decreases (Taller).
    // Horizontal Cut -> Top/Bottom boxes. Box Height decreases. AR increases (Wider).
    
    // Group A (Low AR) prefers Vertical Cut (Narrow boxes).
    // Group B (High AR) prefers Horizontal Cut (Wide boxes).
    
    // Ratio of space allocation based on count
    const ratio = splitIndex / count;

    // Estimate Resulting ARs for both split types
    const boxA_Vert_AR = (boxAR * ratio); // W becomes W*ratio. H stays.
    const boxB_Vert_AR = (boxAR * (1-ratio)); 
    
    const boxA_Horz_AR = boxAR / ratio; // H becomes H*ratio. W stays. AR = W/(H*ratio)
    const boxB_Horz_AR = boxAR / (1-ratio);
    
    // Error metric: How far are resulting slots from ideal photo ARs?
    const errVert = Math.abs(boxA_Vert_AR - avgAR_A) + Math.abs(boxB_Vert_AR - avgAR_B);
    const errHorz = Math.abs(boxA_Horz_AR - avgAR_A) + Math.abs(boxB_Horz_AR - avgAR_B);
    
    // Choose split that minimizes error
    const splitVertically = errVert < errHorz;

    const boxA = { ...box };
    const boxB = { ...box };

    if (splitVertically) {
        boxA.w = box.w * ratio;
        boxB.w = box.w * (1 - ratio);
        boxB.x = box.x + boxA.w;
    } else {
        boxA.h = box.h * ratio;
        boxB.h = box.h * (1 - ratio);
        boxB.y = box.y + boxA.h;
    }

    return [
        ...generateBSP(groupA, boxA),
        ...generateBSP(groupB, boxB)
    ];
};

/**
 * Generate a Structured Layout within a specific region (Bounds).
 * If no bounds provided, uses default margins.
 */
export const generateStructuredLayout = (
    photos: Photo[], 
    config: AlbumConfig,
    bounds?: { x: number, y: number, width: number, height: number }
): Layer[] => {
    if (photos.length === 0) return [];
    
    const marginX = getMarginPctX(config);
    const marginY = getMarginPctY(config);
    const gapX = getGapPctX(config);
    const gapY = getGapPctY(config);
    
    // If Bounds are provided, use them. Otherwise calculate standard available space.
    let regionX, regionY, regionW, regionH;
    
    if (bounds) {
        regionX = bounds.x;
        regionY = bounds.y;
        regionW = bounds.width;
        regionH = bounds.height;
    } else {
        const availW = 100 - (marginX * 2);
        const availH = 100 - (marginY * 2);
        regionX = marginX;
        regionY = marginY;
        regionW = availW;
        regionH = availH;
    }
    
    const bspResults = generateBSP(photos, {x: 0, y: 0, w: regionW, h: regionH});

    return bspResults.map(res => {
        let x = regionX + res.x;
        let y = regionY + res.y;
        let w = res.w;
        let h = res.h;

        // Apply gaps
        // Smart Gap Logic:
        const isLeftEdge = res.x <= 0.001; // Relative to region start (0)
        const isTopEdge = res.y <= 0.001;
        const isRightEdge = res.x + res.w >= regionW - 0.001;
        const isBottomEdge = res.y + res.h >= regionH - 0.001;

        // If we are strictly inside the region, we need gaps.
        if (!isLeftEdge) { x += gapX/2; w -= gapX/2; }
        if (!isRightEdge) { w -= gapX/2; }
        if (!isTopEdge) { y += gapY/2; h -= gapY / 2; }
        if (!isBottomEdge) { h -= gapY / 2; }

        return {
            id: uuid(),
            photoId: res.photo.id,
            x, y, width: w, height: h,
            rotation: 0,
            adjustments: { ...defaultAdjustments }
        };
    });
};


/**
 * SMART MOSAIC (Row-based Linear Partition)
 * Refined to maximize space filling.
 */
export const generateSmartMosaicLayout = (
    photos: Photo[], 
    config: AlbumConfig,
    shuffle: boolean = false,
    forceRowCount?: number,
    bounds?: { x: number, y: number, width: number, height: number }
): Layer[] => {
    if (photos.length === 0) return [];
    
    let workingPhotos = [...photos];
    if (shuffle) workingPhotos.sort(() => Math.random() - 0.5);
    
    let availablePixelWidth, availablePixelHeight, startX_Px_Base, startY_Px_Base;

    if (bounds) {
        availablePixelWidth = (bounds.width / 100) * config.spreadWidth;
        availablePixelHeight = (bounds.height / 100) * config.spreadHeight;
        startX_Px_Base = (bounds.x / 100) * config.spreadWidth;
        startY_Px_Base = (bounds.y / 100) * config.spreadHeight;
    } else {
        availablePixelWidth = config.spreadWidth - (config.margin * 2);
        availablePixelHeight = config.spreadHeight - (config.margin * 2);
        startX_Px_Base = config.margin;
        startY_Px_Base = config.margin;
    }

    
    // Function to calculate a layout given a specific number of rows
    const calculateLayoutForRows = (rowCount: number) => {
        const rows: Photo[][] = [];
        let currentRow: Photo[] = [];
        let currentAR = 0;
        
        // Target Aspect Ratio for each row to evenly distribute
        const totalPhotosAR = workingPhotos.reduce((sum, p) => sum + (p.aspectRatio || 1.5), 0);
        const avgARPerRow = totalPhotosAR / rowCount;

        // Distribute photos into rows (Greedy Partitioning)
        let photoIdx = 0;
        for (let r = 0; r < rowCount; r++) {
            currentRow = [];
            currentAR = 0;
            
            // If last row, take all remainder
            if (r === rowCount - 1) {
                while(photoIdx < workingPhotos.length) {
                    currentRow.push(workingPhotos[photoIdx++]);
                }
                rows.push(currentRow);
                break;
            }

            while (photoIdx < workingPhotos.length) {
                const p = workingPhotos[photoIdx];
                const pAR = p.aspectRatio || 1.5;
                
                // Check if adding this photo gets us closer or further from avgARPerRow
                const diffCurrent = Math.abs(currentAR - avgARPerRow);
                const diffNext = Math.abs((currentAR + pAR) - avgARPerRow);
                
                // If adding pushes us further away from ideal, stop (unless row is empty)
                if (currentRow.length > 0 && diffNext > diffCurrent) {
                    break;
                }
                
                currentRow.push(p);
                currentAR += pAR;
                photoIdx++;
            }
            rows.push(currentRow);
        }

        // Calculate dimensions
        // Each row fills the full width (minus gaps).
        // Height is determined by the AR sum of photos in that row.
        const processedRows = rows.map(row => {
            if (row.length === 0) return { row, heightPixels: 0, rowSumAR: 0 };
            
            // Calculate effective width available for photos in this row
            // Width = SpreadWidth - Margins - Gaps
            const gapsCount = Math.max(0, row.length - 1);
            const gapPixelsTotal = gapsCount * config.gap;
            const contentPixelsAvailable = availablePixelWidth - gapPixelsTotal;
            
            const rowSumAR = row.reduce((s, p) => s + (p.aspectRatio || 1.5), 0);
            
            // rowSumAR = Width / Height  => Height = Width / rowSumAR
            const rowHeightPixels = contentPixelsAvailable / rowSumAR;
            
            return { row, heightPixels: rowHeightPixels, rowSumAR };
        });

        // Total content height including vertical gaps
        const totalRowHeight = processedRows.reduce((sum, r) => sum + r.heightPixels, 0);
        const totalGapsHeight = Math.max(0, rows.length - 1) * config.gap;
        const totalContentHeight = totalRowHeight + totalGapsHeight;

        // MAXIMIZE FILL LOGIC
        // We want the total content height to match available pixel height as closely as possible.
        // Scale Factor determines how much we shrink/grow to fit.
        // Constraint: We cannot crop width (rows always fill width).
        // So the variable is Total Height.
        
        let scaleFactor = 1;
        let fillScore = 0; // 0 to 1, higher is better

        if (totalContentHeight > availablePixelHeight) {
             // Too tall, must scale down. 
             // This creates whitespace on the sides (because we scale uniformly).
             scaleFactor = availablePixelHeight / totalContentHeight;
             // The area filled is proportional to the scaleFactor.
             fillScore = scaleFactor; 
        } else {
             // Fits vertically. 
             // We occupy full width, but have whitespace at bottom/top.
             scaleFactor = 1; // Do not scale up (prevents cropping or huge images)
             fillScore = totalContentHeight / availablePixelHeight;
        }

        return { rows: processedRows, fillScore, scaleFactor, totalContentHeight };
    };

    let bestLayout = null;

    if (forceRowCount && forceRowCount > 0) {
        bestLayout = calculateLayoutForRows(forceRowCount);
    } else {
        // ITERATIVE OPTIMIZATION
        // Try all reasonable row counts to find the one that fills the square best.
        // Start from 1 up to N (or a reasonable max).
        const maxRows = Math.min(workingPhotos.length, 10); 
        
        for (let r = 1; r <= maxRows; r++) {
            const result = calculateLayoutForRows(r);
            
            // Prioritize the layout with the highest Fill Score (Uses most area)
            // Use a small epsilon for floating point comparison stability
            if (!bestLayout || result.fillScore > bestLayout.fillScore) { 
                bestLayout = result;
            }
        }
    }

    if (!bestLayout) return [];

    const layers: Layer[] = [];
    
    // Apply final scaling
    const finalContentHeight = bestLayout.totalContentHeight * bestLayout.scaleFactor;
    const finalContentWidth = availablePixelWidth * bestLayout.scaleFactor;
    
    // Center the block in the BOUNDED AREA
    const startY_Px = startY_Px_Base + (availablePixelHeight - finalContentHeight) / 2;
    const startX_Px = startX_Px_Base + (availablePixelWidth - finalContentWidth) / 2;

    let currentY_Px = startY_Px;

    bestLayout.rows.forEach(r => {
        const rowHeightPx = r.heightPixels * bestLayout!.scaleFactor;
        const rowGapPx = config.gap * bestLayout!.scaleFactor; 
        
        let currentX_Px = startX_Px;
        
        r.row.forEach((p) => {
            const pAR = p.aspectRatio || 1.5;
            const pWidthPx = rowHeightPx * pAR;
            
            const lX = (currentX_Px / config.spreadWidth) * 100;
            const lY = (currentY_Px / config.spreadHeight) * 100;
            const lW = (pWidthPx / config.spreadWidth) * 100;
            const lH = (rowHeightPx / config.spreadHeight) * 100;

            layers.push({
                id: uuid(),
                photoId: p.id,
                x: lX,
                y: lY,
                width: lW,
                height: lH,
                rotation: 0,
                adjustments: { ...defaultAdjustments }
            });

            currentX_Px += pWidthPx + rowGapPx;
        });

        currentY_Px += rowHeightPx + rowGapPx;
    });

    return layers;
};

export const generateGridLayout = (photos: Photo[], config: AlbumConfig, cols: number): Layer[] => {
    if (photos.length === 0) return [];
    const rows = Math.ceil(photos.length / cols);
    const marginX = getMarginPctX(config);
    const marginY = getMarginPctY(config);
    const gapX = getGapPctX(config);
    const gapY = getGapPctY(config);
    const availableW = 100 - (marginX * 2);
    const availableH = 100 - (marginY * 2);
    const cellW = (availableW - (gapX * (cols - 1))) / cols;
    const cellH = (availableH - (gapY * (rows - 1))) / rows;
    const layers: Layer[] = [];
    photos.forEach((photo, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        layers.push({
            id: uuid(),
            photoId: photo.id,
            x: marginX + (c * (cellW + gapX)),
            y: marginY + (r * (cellH + gapY)),
            width: cellW,
            height: cellH,
            rotation: 0,
            adjustments: { ...defaultAdjustments }
        });
    });
    return layers;
};

export const generateFocusLayout = (photos: Photo[], config: AlbumConfig, focusIndex: number = 0): Layer[] => {
     if (photos.length < 2) return generateSmartMosaicLayout(photos, config);
     const mainPhoto = photos[focusIndex];
     const others = photos.filter((_, i) => i !== focusIndex);
     const marginX = getMarginPctX(config);
     const marginY = getMarginPctY(config);
     const gapX = getGapPctX(config);
     const availableW = 100 - (marginX * 2);
     const availableH = 100 - (marginY * 2);
     const layers: Layer[] = [];
     const mainW = (availableW - gapX) * 0.6;
     const sideW = (availableW - gapX) * 0.4;
     layers.push({
         id: uuid(),
         photoId: mainPhoto.id,
         x: marginX,
         y: marginY,
         width: mainW,
         height: availableH,
         rotation: 0,
         adjustments: { ...defaultAdjustments }
     });
     const sideGapY = getGapPctY(config);
     const sideH = (availableH - (sideGapY * (others.length - 1))) / others.length;
     others.forEach((p, idx) => {
         layers.push({
             id: uuid(),
             photoId: p.id,
             x: marginX + mainW + gapX,
             y: marginY + (idx * (sideH + sideGapY)),
             width: sideW,
             height: sideH,
             rotation: 0,
             adjustments: { ...defaultAdjustments }
         });
     });
     return layers;
};

// Hybrid generator that chooses between systems
export const generateProceduralLayout = (photos: Photo[], config: AlbumConfig, randomizeOrder: boolean = true): Layer[] => {
    // DEFAULT TO SMART MOSAIC (100% preference for now to solve cropping issues)
    // Smart Mosaic respects aspect ratios (No-Crop logic)
    return generateSmartMosaicLayout(photos, config, randomizeOrder);
};

const getDistributionCounts = (totalPhotos: number, totalSpreads: number, patternIndex: number): number[] => {
    if (totalSpreads <= 0) return [];
    if (totalSpreads === 1) return [totalPhotos];
    let weights: number[] = new Array(totalSpreads).fill(1);
    const mode = patternIndex % 15;
    switch (mode) {
        case 0: weights.fill(10); break;
        case 1: weights = weights.map((_, i) => 1 + i); break;
        case 2: weights = weights.map((_, i) => totalSpreads - i); break;
        case 3: weights.fill(5); weights[0] = 0.5; break;
        case 4: weights.fill(5); weights[totalSpreads - 1] = 0.5; break;
        case 5: weights.fill(3); weights[0] = 10; break;
        case 6: weights = weights.map((_, i) => { const center = totalSpreads/2; return 10 - Math.abs(i - center)*(10/center); }); break;
        case 7: weights = weights.map((_, i) => { const center = totalSpreads/2; return 1 + Math.abs(i - center)*(10/center); }); break;
        case 8: weights = weights.map((_, i) => (i % 2 === 0 ? 2 : 6)); break;
        case 9: weights = weights.map((_, i) => (i % 2 === 0 ? 6 : 2)); break;
        case 10: weights = weights.map((_, i) => 3 + (i % 3)); break;
        case 11: weights = weights.map((_, i) => (i % 3 === 0 ? 6 : 3)); break;
        case 12: weights = weights.map((_, i) => [1, 2, 4][i % 3]); break;
        case 13: weights = weights.map((_, i) => Math.min(8, Math.ceil((i+1) * 1.5))); break;
        case 14: weights = weights.map((_, i) => 1 + ((i * 7) % 8)); break;
    }
    const minPhotoPerSpread = Math.floor(totalPhotos / totalSpreads) === 0 ? 0 : 1;
    let currentCounts = new Array(totalSpreads).fill(minPhotoPerSpread);
    let assigned = currentCounts.reduce((a, b) => a + b, 0);
    if (assigned > totalPhotos) return currentCounts.map((_, i) => i < totalPhotos ? 1 : 0);
    let remaining = totalPhotos - assigned;
    const totalWeight = weights.reduce((a, b) => a + Math.max(0.1, b), 0);
    let fractionalCounts = weights.map(w => (w / totalWeight) * remaining);
    for (let i = 0; i < totalSpreads; i++) {
        const add = Math.floor(fractionalCounts[i]);
        currentCounts[i] += add;
        fractionalCounts[i] -= add;
        remaining -= add;
    }
    const indices = fractionalCounts.map((val, idx) => ({ val, idx }));
    indices.sort((a, b) => b.val - a.val);
    for (let i = 0; i < remaining; i++) {
        const targetIndex = indices[i % indices.length].idx;
        currentCounts[targetIndex]++;
    }
    if (mode === 3 && currentCounts[0] > 1 && totalSpreads > 1) { const diff = currentCounts[0] - 1; currentCounts[0] = 1; currentCounts[1] += diff; }
    if (mode === 4 && currentCounts[totalSpreads-1] > 1 && totalSpreads > 1) { const diff = currentCounts[totalSpreads-1] - 1; currentCounts[totalSpreads-1] = 1; currentCounts[totalSpreads-2] += diff; }
    return currentCounts;
};

export const distributePhotosToSpreads = (
  photos: Photo[],
  targetSpreads: number, 
  config: AlbumConfig,
  variationIndex: number = 0,
  minPhotos: number | null = null,
  maxPhotos: number | null = null
): Spread[] => {
  if (photos.length === 0) return [];
  const spreads: Spread[] = [];
  
  let counts: number[] = [];

  if (minPhotos !== null && maxPhotos !== null && minPhotos > 0) {
      let remaining = photos.length;
      while (remaining > 0) {
          if (remaining <= maxPhotos) {
               if (remaining < minPhotos && counts.length > 0) {
                   const prev = counts[counts.length - 1];
                   if (prev + remaining <= maxPhotos) {
                       counts[counts.length - 1] += remaining;
                   } else {
                       const total = prev + remaining;
                       const newPrev = Math.floor(total / 2);
                       const newCurr = total - newPrev;
                       counts[counts.length - 1] = newPrev;
                       counts.push(newCurr);
                   }
               } else {
                   counts.push(remaining);
               }
               remaining = 0;
               break;
          }

          let count = Math.floor(Math.random() * (maxPhotos - minPhotos + 1)) + minPhotos;
          if (remaining - count < minPhotos) {
              const maxFeasible = remaining - minPhotos;
              if (maxFeasible >= minPhotos) {
                  count = Math.floor(Math.random() * (maxFeasible - minPhotos + 1)) + minPhotos;
              } else {
                  count = minPhotos; 
              }
          }
          counts.push(count);
          remaining -= count;
      }
  } else {
      counts = getDistributionCounts(photos.length, targetSpreads, variationIndex);
  }

  let photoOffset = 0;
  for (let i = 0; i < counts.length; i++) {
      const count = counts[i];
      const spreadPhotos = photos.slice(photoOffset, photoOffset + count);
      photoOffset += count;
      
      // VARY ALGORITHM: Use procedural generator
      const layout = count > 0 ? generateProceduralLayout(spreadPhotos, config) : [];
      
      spreads.push({
          id: uuid(),
          index: i + 1,
          layers: layout
      });
  }
  
  if (minPhotos === null && photoOffset < photos.length) {
      const leftovers = photos.slice(photoOffset);
      if (spreads.length > 0) {
          const lastSpread = spreads[spreads.length - 1];
          const lastCount = counts[counts.length-1];
          const allLastPhotos = photos.slice(photoOffset - lastCount);
          lastSpread.layers = generateProceduralLayout(allLastPhotos, config);
      } else {
           spreads.push({
              id: uuid(),
              index: 1,
              layers: generateProceduralLayout(leftovers, config)
          });
      }
  }
  return spreads;
};

export const distributePhotosFromIndex = (
    currentSpreads: Spread[],
    allPhotos: Photo[],
    startIndex: number,
    totalSpreads: number,
    config: AlbumConfig,
    variationIndex: number
): Spread[] => {
    const fixedSpreads = currentSpreads.slice(0, startIndex);
    const spreadsToOverwrite = currentSpreads.slice(startIndex);
    const photoIdsToDistribute = new Set<string>();
    spreadsToOverwrite.forEach(s => s.layers.forEach(l => photoIdsToDistribute.add(l.photoId)));
    const photosToDistribute = allPhotos.filter(p => photoIdsToDistribute.has(p.id));

    if (photosToDistribute.length === 0) return currentSpreads;

    const remainingSpreadsCount = Math.max(1, totalSpreads - startIndex);
    const newSpreads = distributePhotosToSpreads(photosToDistribute, remainingSpreadsCount, config, variationIndex);

    newSpreads.forEach((s, i) => s.index = startIndex + 1 + i);

    return [...fixedSpreads, ...newSpreads];
};

export const generateUniqueVariations = (
    photos: Photo[], 
    config: AlbumConfig, 
    seenHashes: Set<string>,
    count: number = 4
): { results: { type: string, layers: Layer[] }[], exhausted: boolean } => {
    
    const results: { type: string, layers: Layer[] }[] = [];
    let attempts = 0;
    const maxAttempts = 100;

    while (results.length < count && attempts < maxAttempts) {
        attempts++;
        
        // 1. Try different structure strategies
        const useMosaic = Math.random() > 0.3; // Favor Mosaic (70%) for better fit
        
        let layers: Layer[] = [];
        if (useMosaic) {
            // Mosaic with random row count deviation
            layers = generateSmartMosaicLayout(photos, config, true); 
        } else {
            layers = generateStructuredLayout(photos, config);
        }
        
        const hash = getLayoutHash(layers);

        if (!seenHashes.has(hash) && layers.length > 0) {
            seenHashes.add(hash);
            results.push({
                type: `Opção ${seenHashes.size}`,
                layers: layers
            });
        }
    }
    
    // FORCE FILL if we didn't find enough unique GEOMETRIES.
    // Ensure we never exhaust - just generate "shuffled" versions using Mosaic
    if (results.length < count) {
        for (let i = 0; i < count - results.length; i++) {
             // Generate a layout and shuffle photos to create a "New Version"
             // Smart Mosaic with shuffle=true changes the layout geometry too
             const baseLayers = generateSmartMosaicLayout(photos, config, true);
             results.push({
                type: `Variação ${seenHashes.size + i + 1}`,
                layers: baseLayers
            });
        }
    }

    return {
        results,
        exhausted: false // Infinite Variations
    };
};

export const generateAlternativeLayouts = (spreadPhotos: Photo[], config: AlbumConfig): { type: string, layers: Layer[] }[] => {
    const layouts = [];
    const count = spreadPhotos.length;

    if (STATIC_TEMPLATES[count]) {
        STATIC_TEMPLATES[count].forEach((tpl, idx) => {
             layouts.push({ type: `Clássico ${idx + 1}`, layers: applyStaticTemplate(tpl, spreadPhotos, config) });
        });
    }

    layouts.push({ type: 'Smart Mosaic', layers: generateSmartMosaicLayout(spreadPhotos, config, false) });
    
    // Add BSP Layout option
    layouts.push({ type: 'Estruturado', layers: generateStructuredLayout(spreadPhotos, config) });

    const maxRows = Math.min(spreadPhotos.length, 6);
    for(let i=1; i<=maxRows; i++) {
        const layers = generateSmartMosaicLayout(spreadPhotos, config, false, i);
        layouts.push({ type: `${i} Linhas`, layers: layers });
    }

    if (count > 1) {
        const sqrt = Math.ceil(Math.sqrt(count));
        layouts.push({ type: 'Grid Quadrado', layers: generateGridLayout(spreadPhotos, config, sqrt) });
        if (count % 2 === 0) layouts.push({ type: 'Grid 2 Col', layers: generateGridLayout(spreadPhotos, config, 2) });
    }

    if (count >= 3) {
        layouts.push({ type: 'Destaque Esq.', layers: generateFocusLayout(spreadPhotos, config, 0) });
        const rightFocus = generateFocusLayout(spreadPhotos, config, 0).map(l => ({
            ...l, 
            x: 100 - l.x - l.width // Mirror X
        }));
        layouts.push({ type: 'Destaque Dir.', layers: rightFocus });
    }
    
    return layouts;
};

export const generateNoCropRowLayout = generateSmartMosaicLayout;
export const generateRandomVariations = generateUniqueVariations;
