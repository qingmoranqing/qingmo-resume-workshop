'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (payload) => ipcRenderer.invoke('data:save', payload),
  exportPdf: (suggestedFileName) => ipcRenderer.invoke('pdf:export', suggestedFileName),
});
