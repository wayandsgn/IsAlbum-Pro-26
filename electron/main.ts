
// Fix: Manually declare Node.js globals to resolve TypeScript errors when type definitions are missing.
declare const __dirname: string;
declare const process: { platform: string; };

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      // Use path.resolve to be absolutely sure about the path
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // CRITICAL: Allows preload to expose complex objects/APIs correctly
      webSecurity: false // Optional: helpful for loading local images in dev, strictly handle with care in prod
    },
    icon: path.join(__dirname, '../assets/icon.svg')
  });

  // Load index.html relative to this script's location
  win.loadFile(path.join(__dirname, '../index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler for native file saving
ipcMain.handle('save-dialog', async (event, { title, defaultPath, filters, data }) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return { success: false, error: 'No active window' };

    const { filePath } = await dialog.showSaveDialog(win, {
        title,
        defaultPath,
        filters,
    });

    if (filePath) {
        try {
            fs.writeFileSync(filePath, data);
            return { success: true, path: filePath };
        } catch (error) {
            console.error('Failed to save the file:', error);
            return { success: false, error: (error as Error).message };
        }
    }
    
    return { success: false, error: 'Save cancelled by user.' };
});

// IPC handler to load a local image file
ipcMain.handle('load-image-from-path', async (event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
            return { success: true, path: filePath, dataUrl, mimeType };
        }
        return { success: false, path: filePath, error: 'File not found' };
    } catch (error) {
        console.error(`Failed to load image from ${filePath}:`, error);
        return { success: false, path: filePath, error: (error as Error).message };
    }
});

// IPC handler to open a directory selection dialog
ipcMain.handle('select-directory', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openDirectory'],
        title: 'Selecione a pasta onde estão as fotos originais'
    });
    if (!canceled && filePaths.length > 0) {
        return filePaths[0];
    }
    return null;
});

// IPC handler to find and load multiple files in a directory
ipcMain.handle('find-and-load-files', async (event, { directoryPath, filesToFind }) => {
    const foundFiles: { id: string, newPath: string, fileName: string, dataUrl: string, mimeType: string }[] = [];
    try {
        const dirContents = fs.readdirSync(directoryPath);
        
        // Map directory contents to lowercase for case-insensitive comparison
        // Map: lowercaseName -> originalName
        const dirMap = new Map<string, string>();
        dirContents.forEach(f => dirMap.set(f.toLowerCase(), f));

        for (const fileToFind of filesToFind) {
            const targetName = fileToFind.fileName.toLowerCase();
            
            if (dirMap.has(targetName)) {
                const realFileName = dirMap.get(targetName)!;
                const newPath = path.join(directoryPath, realFileName);
                
                try {
                    const buffer = fs.readFileSync(newPath);
                    const mimeType = mime.lookup(newPath) || 'application/octet-stream';
                    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
                    foundFiles.push({ ...fileToFind, newPath, dataUrl, mimeType });
                } catch (readError) {
                    console.error(`Error reading relinked file ${newPath}:`, readError);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${directoryPath}:`, error);
    }
    return foundFiles;
});
