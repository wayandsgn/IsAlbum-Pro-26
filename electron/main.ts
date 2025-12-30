// Fix: Manually declare __dirname as it is not available in the TS scope without node types.
declare const __dirname: string;

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  win.loadFile('index.html');
  
  // Open DevTools in development
  // win.webContents.openDevTools();
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
  // Fix: Cast `process` to `any` to access `platform` property,
  // as the default `Process` type is incomplete without node types.
  if ((process as any).platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler for native file saving
ipcMain.handle('save-dialog', async (event, { title, defaultPath, filters, data }) => {
    const { filePath } = await dialog.showSaveDialog({
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
