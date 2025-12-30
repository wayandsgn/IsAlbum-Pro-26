



import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (options: { title: string, defaultPath: string, filters: any[], data: Uint8Array }) => {
        return ipcRenderer.invoke('save-dialog', options);
    },
    loadImageFromPath: (path: string) => {
        return ipcRenderer.invoke('load-image-from-path', path);
    },
    selectDirectory: () => {
        return ipcRenderer.invoke('select-directory');
    },
    findAndLoadFiles: (options: { directoryPath: string, filesToFind: { id: string, fileName: string }[] }) => {
        return ipcRenderer.invoke('find-and-load-files', options);
    }
});