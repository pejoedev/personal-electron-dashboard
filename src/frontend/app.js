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
 * Initialize Messages page state with defaults
 */
window.messagesPageState = {
    currentPage: 0,
    pageSize: 20,
    totalCount: 0,
    messages: [],
    filters: {
        type: 'all',
        viewedStatus: 'all',
        searchQuery: '',
        feedName: '',
        projectName: ''
    }
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
        // Request RSS feed data when dashboard is loaded
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

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard initializing...');

    // Render static components
    window.header.render();
    window.footer.render();

    // Setup communicator subscriptions FIRST - before navigation
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
        if (data && Array.isArray(data.feeds)) {
            window.rssPageState = {
                currentPage: data.currentPage ?? 0,
                pageSize: data.pageSize ?? 20,
                totalCount: data.totalCount ?? 0,
                feeds: data.feeds ?? []
            };
            console.log('[RSS] State updated:', window.rssPageState);
            renderRssFeeds(data.feeds);
            updatePaginationControls();
        } else {
            console.warn('[RSS] Invalid feed data received:', data);
        }
    });

    // Subscribe to messages feed updates
    subscribeToMessagesUpdates();
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
    if (!items || !Array.isArray(items) || items.length === 0) {
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
    card.setAttribute('data-message-id', item.uuid);
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
                <button class="news-dismiss" type="button">Dismiss</button>
                <p class="news-level">${escapeHtml(item.alert?.severity_level || 'Info')}</p>
                <p class="news-timestamp">${formatDate(item.publication_date || item.fetch_date)}</p>
            </div>
        `;

        // Add click handler for View Report link
        const viewReportLink = card.querySelector('.news-read');
        if (viewReportLink) {
            viewReportLink.addEventListener('click', (e) => {
                markItemViewed(item.uuid);
            });
        }

        // Add click handler for Dismiss button
        const dismissBtn = card.querySelector('.news-dismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('[Dismiss Alert] Dismissing alert:', item.uuid);
                markItemViewed(item.uuid);
            });
        }
    } else if (item.isRss) {
        // RSS card
        card.innerHTML = `
            <p class="rss-title">${escapeHtml(item.title)}</p>
            <div class="rss-description">${escapeHtml(item.description)}</div>
            <div class="rss-notes">
                <a class="rss-read" href="${escapeHtml(item.link)}" target="_blank">Read</a>
                <button class="rss-dismiss" type="button">Dismiss</button>
                <a class="rss-source" href="${escapeHtml(item.feedLink)}" target="_blank">${escapeHtml(item.feedName)}</a>
                <p class="rss-timestamp">${formatDate(item.publication_date || item.fetch_date)}</p>
            </div>
        `;

        // Add click handler for Read link
        const readLink = card.querySelector('.rss-read');
        if (readLink) {
            readLink.addEventListener('click', (e) => {
                console.log('[Read Item] Marking RSS item as viewed:', item.uuid);
                markItemViewed(item.uuid);
            });
        }

        // Add click handler for Dismiss button
        const dismissBtn = card.querySelector('.rss-dismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('[Dismiss RSS] Dismissing RSS item:', item.uuid);
                markItemViewed(item.uuid);
            });
        }
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
 * Mark an item as viewed and refresh the feed
 * @param {string} messageId - The UUID of the message to mark as viewed
 */
function markItemViewed(messageId) {
    console.log('[Mark Viewed] Sending mark-item-viewed request for:', messageId);

    if (window.communicator) {
        window.communicator.send('mark-item-viewed', {
            messageId: messageId
        });

        // After marking, refresh the current page of RSS items
        const state = window.rssPageState || {};
        const currentPage = state.currentPage ?? 0;

        console.log('[Mark Viewed] Refreshing RSS feed after marking item as viewed');
        setTimeout(() => {
            requestRssPage(currentPage);
        }, 300);
    } else {
        console.error('[Mark Viewed] Communicator not available');
    }
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

// ==================== Messages Feed Functions ====================

/**
 * Setup filter controls for the messages page
 */
function setupMessagesFilters() {
    const typeFilter = document.getElementById('filter-type');
    const searchInput = document.getElementById('filter-search');
    const feedFilter = document.getElementById('filter-feed');
    const projectFilter = document.getElementById('filter-project');
    const viewedFilter = document.getElementById('filter-viewed');
    const applyBtn = document.getElementById('apply-filters-btn');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!typeFilter) {
        console.warn('[Messages] Filter elements not found');
        return;
    }

    // Request filter options from backend
    if (window.communicator) {
        window.communicator.send('request-filter-options', {});
    }

    // Type filter change - show/hide feed and project filters
    typeFilter.addEventListener('change', (e) => {
        const type = e.target.value;
        const feedFilterGroup = document.getElementById('feed-filter-group');
        const projectFilterGroup = document.getElementById('project-filter-group');

        if (feedFilterGroup) {
            feedFilterGroup.style.display = type === 'rss' ? 'flex' : 'none';
        }
        if (projectFilterGroup) {
            projectFilterGroup.style.display = type === 'alert' ? 'flex' : 'none';
        }
    });

    // Apply filters button
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const filters = {
                type: typeFilter.value || 'all',
                viewedStatus: viewedFilter.value || 'all',
                searchQuery: searchInput.value || '',
                feedName: feedFilter.value || '',
                projectName: projectFilter.value || ''
            };

            console.log('[Messages Filters] Applying filters:', filters);
            window.messagesPageState.filters = filters;
            requestMessagesPage(0);
        });
    }

    // Reset filters button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            typeFilter.value = 'all';
            searchInput.value = '';
            feedFilter.value = '';
            projectFilter.value = '';
            viewedFilter.value = '';

            const feedFilterGroup = document.getElementById('feed-filter-group');
            const projectFilterGroup = document.getElementById('project-filter-group');
            if (feedFilterGroup) feedFilterGroup.style.display = 'none';
            if (projectFilterGroup) projectFilterGroup.style.display = 'none';

            console.log('[Messages Filters] Filters reset');
            window.messagesPageState.filters = {
                type: 'all',
                viewedStatus: 'all',
                searchQuery: '',
                feedName: '',
                projectName: ''
            };
            requestMessagesPage(0);
        });
    }

    console.log('[Messages Filters] Filter controls setup complete');
}

/**
 * Setup pagination controls for messages page
 */
function setupMessagesPaginationControls() {
    const prevBtn = document.getElementById('messages-prev-btn');
    const nextBtn = document.getElementById('messages-next-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            console.log('[Messages Pagination] Previous button clicked');
            previousMessagesPage();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            console.log('[Messages Pagination] Next button clicked');
            nextMessagesPage();
        });
    }

    console.log('[Messages Pagination] Pagination controls setup complete');
}

/**
 * Request messages from backend with current filters
 * @param {number} page - The page number to request (0-indexed)
 */
function requestMessagesPage(page) {
    if (!window.communicator) {
        console.error('[Messages Request] Communicator not available');
        return;
    }

    const state = window.messagesPageState || {};
    const filters = state.filters || {};

    const requestData = {
        page: page,
        limit: 20,
        type: filters.type || 'all',
        viewedStatus: filters.viewedStatus || 'all',
        searchQuery: filters.searchQuery || '',
        feedName: filters.feedName || '',
        projectName: filters.projectName || ''
    };

    console.log('[Messages Request] Requesting page', page, 'with filters:', filters);
    window.communicator.send('request-messages-feed', requestData);
}

/**
 * Render messages in the messages feed
 * @param {Array} messages - Array of messages to render
 */
function renderMessages(messages) {
    const container = document.getElementById('messages-feed');
    if (!container) {
        console.warn('[Messages Render] Messages feed container not found');
        return;
    }

    // Clear previous messages
    container.innerHTML = '';

    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div class="messages-empty">
                <div class="messages-empty-icon">📭</div>
                <p class="messages-empty-text">No messages found matching your filters.</p>
            </div>
        `;
        console.log('[Messages Render] No messages to render');
        return;
    }

    messages.forEach(item => {
        const messageElement = createMessageElement(item);
        container.appendChild(messageElement);
    });

    console.log(`[Messages Render] Rendered ${messages.length} messages`);
}

/**
 * Create a message element for displaying in the feed
 * @param {Object} item - The message item to create element for
 * @returns {HTMLElement} The message element
 */
function createMessageElement(item) {
    const div = document.createElement('div');
    div.className = `message-item ${item.viewed ? 'viewed' : ''}`;
    div.setAttribute('data-message-id', item.uuid);

    const viewedBadge = item.viewed ? '<span class="message-badge viewed">Viewed</span>' : '';
    const typeLabel = item.isRss ? 'RSS' : item.isAlert ? 'Alert' : 'Message';
    const typeBadge = `<span class="message-badge ${item.isRss ? 'rss' : 'alert'}">${typeLabel}</span>`;

    let metaHtml = '';
    if (item.isRss) {
        metaHtml = `
            <div class="message-meta-item">
                <span class="message-meta-label">Feed:</span>
                <a href="${escapeHtml(item.feedLink)}" target="_blank">${escapeHtml(item.feedName)}</a>
            </div>
        `;
    } else if (item.isAlert) {
        metaHtml = `
            <div class="message-meta-item">
                <span class="message-meta-label">Project:</span>
                <a href="${escapeHtml(item.projectLink)}" target="_blank">${escapeHtml(item.projectName)}</a>
            </div>
        `;
    }

    let actionButtons = '';
    if (item.isRss) {
        actionButtons = `
            <a class="message-action-btn primary" href="${escapeHtml(item.link)}" target="_blank">Read Article</a>
            <a class="message-action-btn" href="${escapeHtml(item.feedLink)}" target="_blank">View Feed</a>
            <button class="message-action-btn" onclick="markMessageViewed('${escapeHtml(item.uuid)}')">Mark as Read</button>
        `;
    } else if (item.isAlert) {
        actionButtons = `
            <a class="message-action-btn primary" href="${escapeHtml(item.projectLink)}" target="_blank">View Project</a>
            <button class="message-action-btn" onclick="markMessageViewed('${escapeHtml(item.uuid)}')">Dismiss</button>
        `;
    }

    div.innerHTML = `
        <div class="message-header">
            <h3 class="message-title">${escapeHtml(item.title)}</h3>
            <div style="display: flex; gap: 8px;">
                ${typeBadge}
                ${viewedBadge}
            </div>
        </div>
        <div class="message-meta">
            <div class="message-meta-item">
                <span class="message-meta-label">Date:</span>
                <span>${formatDate(item.publication_date || item.fetch_date)}</span>
            </div>
            ${metaHtml}
        </div>
        <div class="message-description">${escapeHtml(item.description)}</div>
        <div class="message-actions">
            ${actionButtons}
        </div>
    `;

    return div;
}

/**
 * Update messages pagination controls
 */
function updateMessagesPaginationControls() {
    const state = window.messagesPageState || {};
    const pagination = document.getElementById('messages-pagination');

    if (!pagination) {
        console.warn('[Messages Pagination] Pagination controls not found');
        return;
    }

    const prevBtn = pagination.querySelector('#messages-prev-btn');
    const nextBtn = pagination.querySelector('#messages-next-btn');
    const pageInfo = pagination.querySelector('#messages-page-info');
    const messagesCount = document.getElementById('messages-count');

    const currentPage = state.currentPage ?? 0;
    const pageSize = state.pageSize ?? 20;
    const totalCount = state.totalCount ?? 0;
    const maxPage = totalCount > 0 ? Math.ceil(totalCount / pageSize) - 1 : 0;

    // Update previous button
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 0;
    }

    // Update next button
    if (nextBtn) {
        nextBtn.disabled = currentPage >= maxPage;
    }

    // Update page info
    if (pageInfo) {
        const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
        pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    }

    // Update message count
    if (messagesCount) {
        messagesCount.textContent = `Total: ${totalCount} messages`;
    }

    console.log('[Messages Pagination] Updated controls - current: ' + currentPage + ', total: ' + totalCount + ', max page: ' + maxPage);
}

/**
 * Navigate to next messages page
 */
function nextMessagesPage() {
    const state = window.messagesPageState || {};
    const currentPage = state.currentPage ?? 0;
    const pageSize = state.pageSize ?? 20;
    const totalCount = state.totalCount ?? 0;
    const maxPage = totalCount > 0 ? Math.ceil(totalCount / pageSize) - 1 : 0;

    if (currentPage < maxPage) {
        console.log(`[Messages Next] Navigating from page ${currentPage} to ${currentPage + 1}`);
        requestMessagesPage(currentPage + 1);
    } else {
        console.log(`[Messages Next] Already at last page (${currentPage}), cannot go further`);
    }
}

/**
 * Navigate to previous messages page
 */
function previousMessagesPage() {
    const state = window.messagesPageState || {};
    const currentPage = state.currentPage ?? 0;

    if (currentPage > 0) {
        console.log(`[Messages Prev] Navigating from page ${currentPage} to ${currentPage - 1}`);
        requestMessagesPage(currentPage - 1);
    } else {
        console.log(`[Messages Prev] Already at first page, cannot go further`);
    }
}

/**
 * Mark a message as viewed
 * @param {string} messageId - The UUID of the message
 */
function markMessageViewed(messageId) {
    console.log('[Messages] Marking message as viewed:', messageId);

    if (window.communicator) {
        window.communicator.send('mark-item-viewed', {
            messageId: messageId
        });

        // Refresh current page after marking
        const state = window.messagesPageState || {};
        const currentPage = state.currentPage ?? 0;

        setTimeout(() => {
            requestMessagesPage(currentPage);
        }, 300);
    } else {
        console.error('[Messages] Communicator not available');
    }
}

/**
 * Subscribe to messages feed updates from backend
 */
function subscribeToMessagesUpdates() {
    if (!window.communicator) {
        console.warn('[Messages Updates] Communicator not available yet');
        return;
    }

    window.communicator.subscribe('messages-feed-update', (data) => {
        console.log('[Messages Updates] Received messages update:', data);

        if (data && data.items) {
            window.messagesPageState = {
                currentPage: data.currentPage ?? 0,
                pageSize: data.pageSize ?? 20,
                totalCount: data.totalCount ?? 0,
                messages: data.items ?? [],
                filters: window.messagesPageState.filters || {}
            };

            console.log('[Messages Updates] State updated:', window.messagesPageState);
            renderMessages(data.items);
            updateMessagesPaginationControls();
        }
    });

    window.communicator.subscribe('filter-options-update', (data) => {
        console.log('[Messages Updates] Received filter options:', data);

        if (data && (data.feedNames || data.projectNames)) {
            updateFilterDropdowns(data.feedNames || [], data.projectNames || []);
        }
    });

    console.log('[Messages Updates] Subscribed to messages-feed-update and filter-options-update');
}

/**
 * Update filter dropdown options with feed and project names
 * @param {Array<string>} feedNames - Array of feed names
 * @param {Array<string>} projectNames - Array of project names
 */
function updateFilterDropdowns(feedNames, projectNames) {
    const feedFilter = document.getElementById('filter-feed');
    const projectFilter = document.getElementById('filter-project');

    // Populate feed filter
    if (feedFilter) {
        const currentValue = feedFilter.value;
        feedFilter.innerHTML = '<option value="">All Feeds</option>';

        feedNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            feedFilter.appendChild(option);
        });

        feedFilter.value = currentValue;
        console.log(`[Messages Filters] Updated feed dropdown with ${feedNames.length} options`);
    }

    // Populate project filter
    if (projectFilter) {
        const currentValue = projectFilter.value;
        projectFilter.innerHTML = '<option value="">All Projects</option>';

        projectNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            projectFilter.appendChild(option);
        });

        projectFilter.value = currentValue;
        console.log(`[Messages Filters] Updated project dropdown with ${projectNames.length} options`);
    }
}
