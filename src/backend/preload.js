// Preload script for secure IPC communication
// You can expose selective APIs here to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Send one-way message to main process
    sendMessage: (message) => ipcRenderer.send('message-from-renderer', message),
    
    // Listen for responses from main process
    onResponse: (callback) => ipcRenderer.on('message-to-renderer', (_event, data) => callback(data)),
    
    // Send async request and wait for response
    getDashboardData: () => ipcRenderer.invoke('get-dashboard-data'),
    
    // Listen for ping from main process
    onPing: (callback) => ipcRenderer.on('ping', (_event, data) => callback(data)),
    
    // Send pong back to main process
    sendPong: (data) => ipcRenderer.send('pong-from-renderer', data)
});
