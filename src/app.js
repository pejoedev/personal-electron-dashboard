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
    // Add initialization logic here
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
