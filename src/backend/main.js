const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const cron = require('./models/CronScheduler');
const Communicator = require('./models/Communicator');
const { SetupRSS } = require('./rss/rss-setup');

let mainWindow;
let tray = null;
let communicator = new Communicator();

const createWindow = () => {
    // Create the browser window (start hidden)
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        // fullscreen: true,
        // fullscreenable: true,
        // kiosk: true,
        // frame: true,
        // minWidth: 800,
        // minHeight: 600,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Set the communicator's main window reference
    communicator.setMainWindow(mainWindow);

    // Load the index.html of the app
    mainWindow.loadFile(path.join(__dirname, '../frontend/index.html'));

    // Open DevTools in development (comment out for production)
    // mainWindow.webContents.openDevTools();

    // Handle minimize to tray
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    // Handle close to tray
    mainWindow.on('close', (event) => {
        if (mainWindow && mainWindow.isVisible()) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

const createTray = () => {
    // Try multiple possible paths for the tray icon
    const possiblePaths = [
        // For packaged app - assets in app directory
        path.join(app.getAppPath(), 'assets', 'tray-icon.png'),
        // In resources directory (some build configurations)
        path.join(process.resourcesPath, 'app', 'assets', 'tray-icon.png'),
        // In resources root
        path.join(process.resourcesPath, 'assets', 'tray-icon.png'),
        // Development mode
        path.join(__dirname, '../../assets/tray-icon.png'),
    ];

    let iconPath = null;
    for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
            iconPath = testPath;
            console.log('Tray icon found at:', iconPath);
            break;
        }
    }

    let trayImage;
    if (iconPath) {
        try {
            trayImage = nativeImage.createFromPath(iconPath);
        } catch (error) {
            console.error('Failed to load tray icon:', error);
            trayImage = nativeImage.createEmpty();
        }
    } else {
        console.warn('Tray icon not found at any expected path, using empty icon');
        console.warn('Checked paths:', possiblePaths);
        trayImage = nativeImage.createEmpty();
    }

    try {
        tray = new Tray(trayImage);
    } catch (error) {
        console.error('Failed to create tray:', error);
        return;
    }

    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
        },
        {
            label: 'Hide',
            click: () => {
                if (mainWindow) {
                    mainWindow.hide();
                }
            },
        },
        {
            type: 'separator',
        },
        {
            label: 'Quit',
            click: () => {
                mainWindow = null;
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);

    // Toggle window visibility on tray click
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
};

// IPC Handlers for main/renderer communication
ipcMain.on('message-from-renderer', (event, data) => {
    console.log('Main received:', data);
    // Emit to all subscribers of this message type
    if (data.eventType) {
        communicator.emit(data.eventType, data);
    }
    // Send response back
    event.reply('message-to-renderer', { status: 'received', data: data });
});

ipcMain.handle('get-dashboard-data', async (event, args) => {
    // Replace with actual data fetching logic
    return { data: 'Dashboard data from main process', timestamp: new Date() };
});

ipcMain.on('pong-from-renderer', (event, data) => {
    console.log('Pong received from frontend:', data);
});

// App event listeners
app.whenReady().then(() => {
    createWindow();
    createTray();
    setupBackgroundJobs();
    initializeHooks();
});

function initializeHooks() {
    SetupRSS()
}

/**
 * Setup background cron jobs
 * Add your periodic tasks here
 */
function setupBackgroundJobs() {
    // Example: Sync data every 5 minutes
    cron.schedule('Sync Dashboard Data', 5 * 60 * 1000, async () => {
        // TODO: Add your data sync logic here
        // Example: fetch from API, update database, etc.
    }, app);

    // Example: Cleanup every hour
    cron.schedule('Cleanup Task', 60 * 60 * 1000, async () => {
        // TODO: Add your cleanup logic here
        // Example: clear temp files, refresh cache, etc.
    }, app);

    // Example: Health check every 30 seconds
    cron.schedule('Health Check', 30 * 1000, async () => {
        // TODO: Add your health check logic here
    }, app);

    // Ping frontend every 10 seconds
    cron.schedule('Ping Frontend', 10 * 1000, async () => {
        communicator.send('ping', { timestamp: new Date() });
    }, app);

    // Start all scheduled jobs
    cron.startAll();
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
