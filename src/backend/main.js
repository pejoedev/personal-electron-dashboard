const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const cron = require('./models/CronScheduler');
const Communicator = require('./models/Communicator');
const { db, initializeDatabase } = require('./sql/init.sql');
const packageInfo = require('../../package.json');

initializeDatabase();

const { SetupRSS, FetchRss } = require('./rss/rss-setup');

const settingsHandler = require("./models/settingsHandler")
let mainWindow;
let tray = null;
let communicator = new Communicator();

const createWindow = () => {
    // Read start minimized setting from database
    let startMinimized = false;
    try {
        const settingValue = db.prepare('SELECT value FROM userSetting WHERE key = ?').get('start.minimized');
        startMinimized = settingValue?.value === 'true';
    } catch (error) {
        console.error('[Window] Error reading start minimized setting:', error);
    }

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        // fullscreen: true,
        // fullscreenable: true,
        // kiosk: true,
        // frame: true,
        // minWidth: 800,
        // minHeight: 600,
        show: false,
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

    // Show window based on start minimized setting
    mainWindow.webContents.on('did-finish-load', () => {
        if (startMinimized) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
        }
    });

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
        communicator.emit(data.eventType, data.data);
    }
    // Send response back
    event.reply('message-to-renderer', { status: 'received', data: data });
});

ipcMain.handle('get-dashboard-data', async (event, args) => {
    // Replace with actual data fetching logic
    return { data: 'Dashboard data from main process', timestamp: new Date() };
});

ipcMain.handle('get-version', async () => {
    return {
        local: app.getVersion() || packageInfo.version,
        appName: packageInfo.name
    };
});

ipcMain.handle('check-for-updates', async () => {
    try {
        const response = await fetch('https://api.github.com/repos/pejoedev/personal-electron-dashboard/releases/latest');
        if (!response.ok) throw new Error('Failed to fetch releases');
        
        const data = await response.json();
        return {
            latest: data.tag_name.replace(/^v/, ''), // Remove 'v' prefix if present
            releaseUrl: data.html_url,
            publishedAt: data.published_at
        };
    } catch (error) {
        console.error('[Main] Error checking for updates:', error);
        return null;
    }
});

ipcMain.on('pong-from-renderer', (event, data) => {
    console.log('Pong received from frontend:', data);
});

// App event listeners
app.whenReady().then(() => {
    createWindow();
    createTray();
    setupBackgroundJobs();
    setupCommunicationHandlers();
    initializeHooks();
});

function setupCommunicationHandlers() {
    // Handle RSS feed requests from frontend
    communicator.subscribe('request-rss-feed', (data) => {
        const messagesHandler = require('./models/MessagesHandler');

        const page = data.page || 0;
        const limit = data.limit || 20;

        try {
            // Use new fetchMessages API with options object
            // RSS feed on dashboard shows only unviewed items by default
            const result = messagesHandler.fetchMessages({
                type: 'rss',
                viewedStatus: 'unviewed',
                limit: limit,
                page: page
            });

            if (!result || !Array.isArray(result.items)) {
                console.error('[Main] Invalid result from fetchMessages, result:', result);
                communicator.send('rss-feed-update', {
                    feeds: [],
                    totalCount: 0,
                    currentPage: page,
                    pageSize: limit
                });
                return;
            }

            communicator.send('rss-feed-update', {
                feeds: result.items || [],
                totalCount: result.totalCount || 0,
                currentPage: result.currentPage || page,
                pageSize: result.pageSize || limit
            });

            console.log(`[Main] Sent ${result.items.length} RSS feeds to frontend (total: ${result.totalCount}, page: ${page})`);
        } catch (error) {
            console.error('[Main] Failed to fetch RSS feed data:', error);
            communicator.send('rss-feed-update', {
                feeds: [],
                totalCount: 0,
                currentPage: page,
                pageSize: limit,
                error: error.message
            });
        }
    });

    // Handle mark item as viewed requests from frontend
    communicator.subscribe('mark-item-viewed', (data) => {
        const messagesHandler = require('./models/MessagesHandler');
        const messageId = data.messageId;

        if (!messageId) {
            console.error('[Main] mark-item-viewed: messageId not provided');
            return;
        }

        try {
            const success = messagesHandler.markMessageAsViewed(messageId);
            console.log(`[Main] Marked message ${messageId} as viewed:`, success);
        } catch (error) {
            console.error('[Main] Failed to mark message as viewed:', error);
        }
    });

    // Handle messages feed requests from frontend with advanced filtering
    communicator.subscribe('request-messages-feed', (data) => {
        const messagesHandler = require('./models/MessagesHandler');

        const options = {
            page: data.page || 0,
            limit: data.limit || 20,
            type: data.type || 'all',
            viewedStatus: data.viewedStatus || 'all',
            searchQuery: data.searchQuery || '',
            feedName: data.feedName || '',
            projectName: data.projectName || ''
        };

        try {
            const result = messagesHandler.fetchMessages(options);

            communicator.send('messages-feed-update', {
                items: result.items,
                totalCount: result.totalCount,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
                totalPages: result.totalPages
            });

            console.log(`[Main] Sent ${result.items.length} messages to frontend (total: ${result.totalCount}, filters:`, JSON.stringify(options), ')');
        } catch (error) {
            console.error('[Main] Failed to fetch messages feed data:', error);
            communicator.send('messages-feed-error', {
                error: error.message
            });
        }
    });

    // Handle filter options request (feed and project names)
    communicator.subscribe('request-filter-options', () => {
        const messagesHandler = require('./models/MessagesHandler');

        try {
            const feedNames = messagesHandler.getUniqueFeedNames();
            const projectNames = messagesHandler.getUniqueProjectNames();

            communicator.send('filter-options-update', {
                feedNames: feedNames,
                projectNames: projectNames
            });

            console.log(`[Main] Sent filter options to frontend (feeds: ${feedNames.length}, projects: ${projectNames.length})`);
        } catch (error) {
            console.error('[Main] Failed to fetch filter options:', error);
            communicator.send('filter-options-error', {
                error: error.message
            });
        }
    });

    // Handle RSS feeds CRUD operations
    const RSSFeedsHandler = require('./models/RSSFeedsHandler');
    const rssFeedsHandler = new RSSFeedsHandler();

    // Get all RSS feeds
    communicator.subscribe('request-rss-feeds-list', () => {
        try {
            const feeds = rssFeedsHandler.getAllFeeds();
            communicator.send('rss-feeds-list-update', {
                feeds: feeds,
                totalCount: feeds.length
            });
            console.log(`[Main] Sent ${feeds.length} RSS feeds to frontend`);
        } catch (error) {
            console.error('[Main] Failed to fetch RSS feeds list:', error);
            communicator.send('rss-feeds-error', {
                error: error.message
            });
        }
    });

    // Create new RSS feed
    communicator.subscribe('create-rss-feed', async (data) => {
        try {
            if (!data.name || !data.rssLink) {
                communicator.send('rss-feed-error', {
                    error: 'Feed name and RSS link are required'
                });
                return;
            }

            const newFeed = rssFeedsHandler.createFeed(data.name, data.rssLink);
            communicator.send('rss-feed-created', {
                feed: newFeed,
                success: true
            });

            console.log(`[Main] Created new RSS feed: ${newFeed.uuid}`);
            
            // Immediately fetch the new feed
            console.log('[Main] Fetching RSS for newly created feed...');
            await FetchRss();
        } catch (error) {
            console.error('[Main] Failed to create RSS feed:', error);
            communicator.send('rss-feed-error', {
                error: error.message
            });
        }
    });

    // Update RSS feed
    communicator.subscribe('update-rss-feed', async (data) => {
        try {
            if (!data.uuid) {
                communicator.send('rss-feed-error', {
                    error: 'Feed UUID is required'
                });
                return;
            }

            const updatedFeed = rssFeedsHandler.updateFeed(data.uuid, data.name, data.rssLink);
            communicator.send('rss-feed-updated', {
                feed: updatedFeed,
                success: true
            });

            console.log(`[Main] Updated RSS feed: ${data.uuid}`);
            
            // Immediately fetch the updated feed
            console.log('[Main] Fetching RSS for updated feed...');
            await FetchRss();
        } catch (error) {
            console.error('[Main] Failed to update RSS feed:', error);
            communicator.send('rss-feed-error', {
                error: error.message
            });
        }
    });

    // Get delete preview for a feed
    communicator.subscribe('request-rss-feed-delete-preview', (data) => {
        try {
            if (!data.uuid) {
                communicator.send('rss-feed-error', {
                    error: 'Feed UUID is required'
                });
                return;
            }

            const preview = rssFeedsHandler.getDeletePreview(data.uuid);
            communicator.send('rss-feed-delete-preview', {
                preview: preview
            });

            console.log(`[Main] Sent delete preview for RSS feed: ${data.uuid}`);
        } catch (error) {
            console.error('[Main] Failed to get delete preview:', error);
            communicator.send('rss-feed-error', {
                error: error.message
            });
        }
    });

    // Delete RSS feed
    communicator.subscribe('delete-rss-feed', (data) => {
        try {
            if (!data.uuid) {
                communicator.send('rss-feed-error', {
                    error: 'Feed UUID is required'
                });
                return;
            }

            const result = rssFeedsHandler.deleteFeed(data.uuid, data.strategy);

            // Check if result is an ask response
            if (result.askUser) {
                // Return preview and ask user to choose
                communicator.send('rss-feed-ask-deletion-method', {
                    feedUuid: data.uuid,
                    preview: result.preview
                });
                console.log(`[Main] Asking user for deletion method for feed: ${data.uuid}`);
            } else {
                // Deletion was performed
                communicator.send('rss-feed-deleted', {
                    result: result,
                    success: true
                });
                console.log(`[Main] Deleted RSS feed: ${data.uuid} (method: ${result.deleteType})`);

                // Refresh the feeds list after deletion
                const feeds = rssFeedsHandler.getAllFeeds();
                communicator.send('rss-feeds-list-update', {
                    feeds: feeds,
                    totalCount: feeds.length
                });
            }
        } catch (error) {
            console.error('[Main] Failed to delete RSS feed:', error);
            communicator.send('rss-feed-error', {
                error: error.message
            });
        }
    });

    // Get deletion mode setting
    communicator.subscribe('get-deletion-mode', (data) => {
        try {
            const setting = db.prepare(`
                SELECT value FROM userSetting WHERE key = ?
            `).get('delete.data.on.rssfollow.delete');

            const deletionMode = setting ? parseInt(setting.value) : 3; // Default to 3 if not set

            communicator.send('deletion-mode-response', {
                deletionMode: deletionMode,
                success: true
            });
            console.log(`[Main] Sent deletion mode: ${deletionMode}`);
        } catch (error) {
            console.error('[Main] Failed to get deletion mode:', error);
            communicator.send('deletion-mode-error', {
                error: error.message
            });
        }
    });

    // Set deletion mode setting
    communicator.subscribe('set-deletion-mode', (data) => {
        try {
            if (data.mode === undefined || data.mode === null) {
                communicator.send('deletion-mode-error', {
                    error: 'Deletion mode is required'
                });
                return;
            }

            const mode = parseInt(data.mode);
            if (![1, 2, 3].includes(mode)) {
                communicator.send('deletion-mode-error', {
                    error: 'Invalid deletion mode. Must be 1, 2, or 3'
                });
                return;
            }

            const stmt = db.prepare(`
                UPDATE userSetting SET value = ? WHERE key = ?
            `);
            const result = stmt.run(mode.toString(), 'delete.data.on.rssfollow.delete');

            if (result.changes === 0) {
                // Setting doesn't exist, insert it
                db.prepare(`
                    INSERT INTO userSetting (key, value) VALUES (?, ?)
                `).run('delete.data.on.rssfollow.delete', mode.toString());
            }

            communicator.send('deletion-mode-updated', {
                deletionMode: mode,
                success: true
            });
            console.log(`[Main] Updated deletion mode to: ${mode}`);
        } catch (error) {
            console.error('[Main] Failed to set deletion mode:', error);
            communicator.send('deletion-mode-error', {
                error: error.message
            });
        }
    });

    // Save settings (from frontend settings page)
    communicator.subscribe('save-settings', (data) => {
        try {
            // Save delete mode if provided
            if (data.delete_mode !== undefined) {
                const mode = parseInt(data.delete_mode);
                if ([1, 2, 3].includes(mode)) {
                    const stmt = db.prepare(`
                        UPDATE userSetting SET value = ? WHERE key = ?
                    `);
                    const result = stmt.run(mode.toString(), 'delete.data.on.rssfollow.delete');

                    if (result.changes === 0) {
                        db.prepare(`
                            INSERT INTO userSetting (key, value) VALUES (?, ?)
                        `).run('delete.data.on.rssfollow.delete', mode.toString());
                    }
                }
            }

            // Save start minimized if provided
            if (data.start_minimized !== undefined) {
                const startMinimized = data.start_minimized === true || data.start_minimized === 'true';
                const stmt = db.prepare(`
                    UPDATE userSetting SET value = ? WHERE key = ?
                `);
                const result = stmt.run(startMinimized.toString(), 'start.minimized');

                if (result.changes === 0) {
                    db.prepare(`
                        INSERT INTO userSetting (key, value) VALUES (?, ?)
                    `).run('start.minimized', startMinimized.toString());
                }
            }

            // Send success response
            communicator.send('settings-saved', {
                success: true
            });
        } catch (error) {
            console.error('[Main] Error saving settings:', error);
            communicator.send('settings-save-error', {
                error: error.message
            });
        }
    });
}

function initializeHooks() {
    setTimeout(() => {
        SetupRSS(communicator)
    }, 1000)
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
    cron.schedule('Health Check', 10 * 1000, async (cronjob) => {
        // TODO: Add your health check logic here
    }, app, 3);

    // Ping frontend every 10 seconds
    // cron.schedule('Ping Frontend', 10 * 1000, async () => {
    //     communicator.send('ping', { timestamp: new Date() });
    // }, app);

    // Start all scheduled jobs
    cron.startAll(true);
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
