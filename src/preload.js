// Preload script for secure IPC communication
// You can expose selective APIs here to the renderer process

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Add your IPC methods here if needed
    // Example: invoke: (channel, args) => ipcRenderer.invoke(channel, args),
});
