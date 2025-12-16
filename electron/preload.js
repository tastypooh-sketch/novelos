
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // File System Operations
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // NEW: Bulletproof Save Protocol
  writeZipToFolder: (folderPath, fileName, content) => ipcRenderer.invoke('write-zip-to-folder', folderPath, fileName, content),
  scanForLatestZip: (folderPath) => ipcRenderer.invoke('scan-for-latest-zip', folderPath),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  // Alias for compatibility with Manuscript.tsx which calls importNoveliFile
  importNoveliFile: () => ipcRenderer.invoke('open-file-dialog'),

  // Licensing
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),
  checkLicense: () => ipcRenderer.invoke('check-license'),

  // Open Local Path
  openPath: (path) => ipcRenderer.invoke('open-path', path),

  // UI Dialogs
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});
