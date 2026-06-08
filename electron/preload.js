const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any IPC methods you need here
  // Example:
  // sendNotification: (message) => ipcRenderer.send('notification', message),
  // onNotification: (callback) => ipcRenderer.on('notification', (event, args) => callback(args)),
  
  // Platform info
  platform: process.platform,
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
