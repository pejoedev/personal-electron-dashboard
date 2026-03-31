// Dashboard application logic

/**
 * Initialize RSS page state with defaults
 */
window.rssPageState = {
    currentPage: 0,
    pageSize: 20,
    totalCount: 0,
    feeds: []
};

/**
 * Page-specific initialization registry
 */
window.pageInit = {
    dashboard: () => {
        console.log('Initializing dashboard page');
        updateLastRefresh();
        // Setup pagination after dashboard HTML is loaded
        setupPaginationControls();
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
    window.router.navigate('dashboard');

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

    // Subscribe to RSS feed updates from main process
    window.communicator.subscribe('rss-feed-update', (data) => {
        console.log('RSS feed update received from main:', data);
        if (data && data.feeds) {
            window.rssPageState = {
                currentPage: data.currentPage ?? 0,
                pageSize: data.pageSize ?? 20,
                totalCount: data.totalCount ?? 0,
                feeds: data.feeds ?? []
            };
            console.log('[RSS] State updated:', window.rssPageState);
            renderRssFeeds(data.feeds);
            updatePaginationControls();
        }
    });

    // Request initial RSS feed data from main process
    setTimeout(() => {
        requestRssPage(0);
    }, 500);
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
 * Setup event listeners for pagination buttons
 */
function setupPaginationControls() {
    const prevBtn = document.getElementById('rss-prev-btn');
    const nextBtn = document.getElementById('rss-next-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            console.log('[Pagination] Previous button clicked');
            previousRssPage();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            console.log('[Pagination] Next button clicked');
            nextRssPage();
        });
    }

    console.log('[Pagination] Event listeners attached to buttons');
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

/**
 * Setup automatic refresh interval
 */
function setupRefreshInterval() {
    // Refresh dashboard every 5 minutes
    setInterval(refreshDashboard, 5 * 60 * 1000);
}

// ==================== RSS Feed Functions ====================

/**
 * Render RSS feeds dynamically in the RSS feed container
 * @param {Array} items - Array of feed items to render
 */
function renderRssFeeds(items) {
    const container = document.getElementById('rss-feed');
    if (!container) {
        console.warn('[RSS Render] RSS feed container not found');
        return;
    }

    // Remove all non-static cards
    const allCards = container.querySelectorAll('.news-card, .rss-card');
    allCards.forEach(card => {
        if (card.getAttribute('data-static') !== 'true') {
            card.remove();
        }
    });

    // Render new cards
    if (!items || items.length === 0) {
        console.log('[RSS Render] No items to render');
        return;
    }

    items.forEach(item => {
        const cardElement = createCardElement(item);
        container.appendChild(cardElement);
    });

    console.log(`[RSS Render] Rendered ${items.length} feed items`);
}

/**
 * Create a card element for a feed item (RSS or Alert)
 * @param {Object} item - The item to create a card for
 * @returns {HTMLElement} The card element
 */
function createCardElement(item) {
    const card = document.createElement('div');
    card.className = item.isRss ? 'rss-card' : 'news-card';
    console.log(item)

    if (item.isAlert) {
        // Alert card
        const levelClass = item.alert?.severity_level?.toLowerCase() || 'info';
        card.classList.add(levelClass);

        card.innerHTML = `
            <p class="news-title">${escapeHtml(item.title)}</p>
            <div class="news-description">${escapeHtml(item.description)}</div>
            <div class="news-notes">
                <a class="news-read" href="#report?id=${escapeHtml(item.uuid)}">View Report</a>
                <p class="news-level">${escapeHtml(item.alert?.severity_level || 'Info')}</p>
                <p class="news-timestamp">${formatDate(item.publication_date || item.fetch_date)}</p>
            </div>
        `;
    } else if (item.isRss) {
        // RSS card
        card.innerHTML = `
            <p class="rss-title">${escapeHtml(item.title)}</p>
            <div class="rss-description">${escapeHtml(item.description)}</div>
            <div class="rss-notes">
                <a class="rss-read" href="${escapeHtml(item.link)}" target="_blank">Read</a>
                <a class="rss-source" href="${escapeHtml(item.feedLink)}" target="_blank">${escapeHtml(item.feedName)}</a>
                <p class="rss-timestamp">${formatDate(item.publication_date || item.fetch_date)}</p>
            </div>
        `;
    } else {
        // Generic card fallback
        card.classList.add('generic-card');
        card.innerHTML = `
            <p class="card-title">${escapeHtml(item.title)}</p>
            <div class="card-description">${escapeHtml(item.description)}</div>
            <div class="card-notes">
                <p class="card-timestamp">${formatDate(item.publication_date || item.fetch_date)}</p>
            </div>
        `;
    }

    return card;
}

/**
 * Update pagination controls visibility and state
 */
function updatePaginationControls() {
    const state = window.rssPageState || {};
    const pagination = document.getElementById('rss-pagination');

    if (!pagination) {
        console.warn('[RSS Pagination] Pagination controls not found');
        return;
    }

    const prevBtn = pagination.querySelector('#rss-prev-btn');
    const nextBtn = pagination.querySelector('#rss-next-btn');
    const pageInfo = pagination.querySelector('#rss-page-info');

    // Get safe values from state
    const currentPage = state.currentPage ?? 0;
    const pageSize = state.pageSize ?? 20;
    const totalCount = state.totalCount ?? 0;
    
    // Calculate total pages (0-indexed, so 20 items = 1 page = maxPage 0)
    const maxPage = totalCount > 0 ? Math.ceil(totalCount / pageSize) - 1 : 0;

    // Update previous button
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 0;
        console.log(`[RSS Pagination] Prev button disabled: ${currentPage <= 0}`);
    }

    // Update next button
    if (nextBtn) {
        nextBtn.disabled = currentPage >= maxPage;
        console.log(`[RSS Pagination] Next button disabled: ${currentPage >= maxPage} (current: ${currentPage}, max: ${maxPage})`);
    }

    // Update page info
    if (pageInfo) {
        const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
        pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    }

    console.log('[RSS Pagination] Updated controls - current page: ' + currentPage + ', total: ' + totalCount + ', max page: ' + maxPage);
}

/**
 * Request a specific page of RSS items from the backend
 * @param {number} page - The page number to request (0-indexed)
 */
function requestRssPage(page) {
    if (window.communicator) {
        const requestData = {
            page: page,
            limit: 20,
            hideViewed: true
        };
        console.log('[RSS Request] Requesting page', page, 'with data:', requestData);
        window.communicator.send('request-rss-feed', requestData);
    } else {
        console.error('[RSS Request] Communicator not available');
    }
}

/**
 * Navigate to the next page of RSS items
 */
function nextRssPage() {
    const state = window.rssPageState || {};
    const currentPage = state.currentPage ?? 0;
    const pageSize = state.pageSize ?? 20;
    const totalCount = state.totalCount ?? 0;
    const maxPage = totalCount > 0 ? Math.ceil(totalCount / pageSize) - 1 : 0;

    if (currentPage < maxPage) {
        console.log(`[RSS Next] Navigating from page ${currentPage} to ${currentPage + 1}`);
        requestRssPage(currentPage + 1);
    } else {
        console.log(`[RSS Next] Already at last page (${currentPage}), cannot go further`);
    }
}

/**
 * Navigate to the previous page of RSS items
 */
function previousRssPage() {
    const state = window.rssPageState || {};
    const currentPage = state.currentPage ?? 0;

    if (currentPage > 0) {
        console.log(`[RSS Prev] Navigating from page ${currentPage} to ${currentPage - 1}`);
        requestRssPage(currentPage - 1);
    } else {
        console.log(`[RSS Prev] Already at first page, cannot go further`);
    }
}

/**
 * Format a date string for display
 * @param {string} dateStr - The date string to format
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
    if (!dateStr) return 'Unknown Date';

    try {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if date is today
        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        // Check if date is yesterday
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }

        // Otherwise show date
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    } catch (error) {
        return 'Invalid Date';
    }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
