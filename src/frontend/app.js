/**
 * Main Application Entry Point
 * Slim orchestrator that initializes the app and manages page switching
 */

/**
 * Page-specific initialization registry
 */
window.pageInit = {
    dashboard: () => {
        console.log('Initializing dashboard page');
        updateLastRefresh();
        setupPaginationControls();
        console.log('[Dashboard Init] Requesting RSS feed data');
        requestRssPage(0);
    },
    messages: () => {
        console.log('Initializing messages page');
        setupMessagesFilters();
        setupMessagesPaginationControls();
        requestMessagesPage(0);
    },
    analytics: () => {
        console.log('Initializing analytics page');
    },
    settings: () => {
        console.log('Initializing settings page');
    }
};

/**
 * Setup Electron IPC communication
 */
function setupCommunicator() {
    // Request dashboard data from main process
    if (window.electronAPI && window.electronAPI.getDashboardData) {
        window.electronAPI.getDashboardData().then(result => {
            console.log('Dashboard data received:', result);
        }).catch(err => console.error('Error fetching data:', err));
    }

    // Subscribe to generic messages from main process
    window.communicator.subscribe('message-to-renderer', (data) => {
        console.log('Response from main:', data);
    });

    // Subscribe to ping messages and respond with pong
    window.communicator.subscribe('ping', (data) => {
        console.log('Ping received from main:', data);
        window.communicator.send('pong-from-renderer', {
            timestamp: new Date(),
            currentPage: window.router.getCurrentPage(),
            response: 'pong'
        });
    });

    // Setup RSS feed updates
    subscribeToRssUpdates();

    // Setup messages feed updates
    subscribeToMessagesUpdates();
}

/**
 * Listen for page changes and run page-specific initialization
 */
window.addEventListener('page-changed', (e) => {
    const page = e.detail.page;
    console.log(`Navigated to: ${page}`);

    if (window.pageInit && window.pageInit[page]) {
        window.pageInit[page]();
    }
});

/**
 * Initialize application on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...');

    // Render static components
    window.header.render();
    window.footer.render();

    // Setup communicator subscriptions first
    setupCommunicator();

    // Navigate to initial page
    await window.router.navigate('dashboard');

    // Setup periodic refresh
    setupRefreshInterval();

    // Allow manual refresh with Ctrl+R
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            refreshDashboard();
        }
    });
});
