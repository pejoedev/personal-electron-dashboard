const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const cron = require('./models/CronScheduler');
const { SetupRSS } = require('./rss/rss-setup');

let mainWindow;
let tray = null;

const createWindow = () => {
    // Create the browser window (start hidden)
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Load the index.html of the app
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

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
        path.join(__dirname, '../assets/tray-icon.png'),
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
    });

    // Example: Cleanup every hour
    cron.schedule('Cleanup Task', 60 * 60 * 1000, async () => {
        // TODO: Add your cleanup logic here
        // Example: clear temp files, refresh cache, etc.
    }, app);

    // Example: Health check every 30 seconds
    cron.schedule('Health Check', 30 * 1000, async () => {
        // TODO: Add your health check logic here
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
