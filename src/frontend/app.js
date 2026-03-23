// Dashboard application logic

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupNavigation();
    updateLastRefresh();
});

/**
 * Initialize application
 */
function initializeApp() {
    console.log('Dashboard initialized');

    // Request dashboard data from main process
    window.electronAPI.getDashboardData().then(result => {
        console.log('Dashboard data received:', result);
    }).catch(err => console.error('Error fetching data:', err));

    // Subscribe to messages from main process using the new communicator
    window.communicator.subscribe('message-to-renderer', (data) => {
        console.log('Response from main:', data);
    });

    // Subscribe to ping messages from main process and respond with pong
    window.communicator.subscribe('ping', (data) => {
        console.log('Ping received from main:', data);
        window.communicator.send('pong-from-renderer', { timestamp: new Date(), response: 'pong' });
    });
}

/**
 * Setup navigation between sections
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');

    navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Get the target section
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (!targetSection) return;

            // Remove active class from all sections and links
            contentSections.forEach((section) => {
                section.classList.remove('active');
            });
            navLinks.forEach((navLink) => {
                navLink.classList.remove('active');
            });

            // Add active class to selected section and link
            targetSection.classList.add('active');
            link.classList.add('active');
        });
    });
}

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

// Refresh dashboard every 5 minutes
setInterval(refreshDashboard, 5 * 60 * 1000);

// Allow manual refresh with Ctrl+R
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshDashboard();
    }
});
