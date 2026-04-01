// Preload script for secure IPC communication
// You can expose selective APIs here to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

// Store message handlers
let messageHandlers = [];
let messageListenerSetup = false;

contextBridge.exposeInMainWorld('electronAPI', {
    // Send one-way message to main process
    sendMessage: (message) => ipcRenderer.send('message-from-renderer', message),

    // Listen for messages from main process (generic message listener)
    onMessageFromMain: (callback) => {
        // Set up the unified listener only once
        if (!messageListenerSetup) {
            ipcRenderer.on('message-from-main', (_event, data) => {
                // Call all registered handlers with the message data
                messageHandlers.forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        console.error('Error in message handler:', error);
                    }
                });
            });
            messageListenerSetup = true;
        }

        // Add this callback to the handlers list
        messageHandlers.push(callback);

        // Return unsubscribe function
        return () => {
            const index = messageHandlers.indexOf(callback);
            if (index > -1) {
                messageHandlers.splice(index, 1);
            }
        };
    },

    // Get local version and app info
    getVersion: () => ipcRenderer.invoke('get-version'),

    // Check for updates from GitHub releases
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
});
