const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'src', 'backend', 'preload.js')
        }
    })

    win.loadFile(path.join(__dirname, 'src', 'frontend', 'index.html'))
}

// Listen for messages FROM the renderer
ipcMain.on('message-from-renderer', (event, data) => {
    console.log('Main received:', data)
    // Send response back
    event.reply('message-to-renderer', { status: 'received', data: data })
})

// Handle async requests (renderer waits for response)
ipcMain.handle('get-dashboard-data', async (event, args) => {
    // Replace with actual data fetching logic
    return { data: 'Dashboard data from main process', timestamp: new Date() }
})

app.whenReady().then(() => {
    createWindow()
})