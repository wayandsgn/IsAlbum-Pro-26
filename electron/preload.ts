

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // Fix: Update 'data' type from 'Buffer' to 'Uint8Array' for IPC compatibility.
    saveFile: (options: { title: string, defaultPath: string, filters: any[], data: Uint8Array }) => {
        return ipcRenderer.invoke('save-dialog', options);
    }
});