// Dashboard application logic

/**
 * Page-specific initialization registry
 */
window.pageInit = {
    overview: () => {
        console.log('Initializing overview page');
        updateLastRefresh();
    },
    analytics: () => {
        console.log('Initializing analytics page');
    },
    settings: () => {
        console.log('Initializing settings page');
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');

    // Render static components
    window.header.render();
    window.footer.render();

    // Navigate to initial page
    window.router.navigate('overview');

    // Setup communicator subscriptions
    setupCommunicator();

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

    // Subscribe to messages from main process using the communicator
    window.communicator.subscribe('message-to-renderer', (data) => {
        console.log('Response from main:', data);
    });

    // Subscribe to ping messages from main process and respond with pong
    window.communicator.subscribe('ping', (data) => {
        console.log('Ping received from main:', data);
        window.communicator.send('pong-from-renderer', {
            timestamp: new Date(),
            currentPage: window.router.getCurrentPage(),
            response: 'pong'
        });
    });
}

/**
 * Listen for page changes and run page-specific initialization
 */
window.addEventListener('page-changed', (e) => {
    const page = e.detail.page;
    console.log(`Navigated to: ${page}`);

    // Call page-specific initialization function if it exists
    if (window.pageInit && window.pageInit[page]) {
        window.pageInit[page]();
    }
});

/**
 * Update last refresh timestamp
 */
function updateLastRefresh() {
    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
        const now = new Date();
        lastUpdateEl.textContent = now.toLocaleString();
    }
}

/**
 * Refresh dashboard data
 */
function refreshDashboard() {
    console.log('Refreshing dashboard...');
    updateLastRefresh();
    // Add your data refresh logic here
}

/**
 * Setup automatic refresh interval
 */
function setupRefreshInterval() {
    // Refresh dashboard every 5 minutes
    setInterval(refreshDashboard, 5 * 60 * 1000);
}
