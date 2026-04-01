/**
 * Messages page logic
 */

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

    // Setup manage feeds button
    const manageFeedsBtn = document.getElementById('manage-feeds-btn');
    if (manageFeedsBtn) {
        manageFeedsBtn.addEventListener('click', () => {
            window.router.navigate('rss-feeds');
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

    // Attach event listeners to action buttons
    setupMessageActionButtons();

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

    // Get fullscreen settings for links
    const fullscreenArticle = localStorage.getItem('rss.fullscreen.article') === 'true';
    const fullscreenSource = localStorage.getItem('rss.fullscreen.source') !== 'false'; // Default true

    let metaHtml = '';
    if (item.isRss) {
        const sourceTarget = fullscreenSource ? '' : ' target="_blank"';
        metaHtml = `
            <div class="message-meta-item">
                <span class="message-meta-label">Feed:</span>
                <a href="${escapeHtml(item.feedLink)}"${sourceTarget}>${escapeHtml(item.feedName)}</a>
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
        const articleTarget = fullscreenArticle ? '' : ' target="_blank"';
        const sourceTarget = fullscreenSource ? '' : ' target="_blank"';
        const markAsReadBtn = !item.viewed ? `<button class="message-action-btn mark-as-read-btn" data-message-id="${escapeHtml(item.uuid)}">Mark as Read</button>` : '';
        actionButtons = `
            <a class="message-action-btn primary" href="${escapeHtml(item.link)}"${articleTarget}>Read Article</a>
            <a class="message-action-btn" href="${escapeHtml(item.feedLink)}"${sourceTarget}>View Feed</a>
            ${markAsReadBtn}
        `;
    } else if (item.isAlert) {
        const dismissBtn = !item.viewed ? `<button class="message-action-btn mark-as-read-btn" data-message-id="${escapeHtml(item.uuid)}">Dismiss</button>` : '';
        actionButtons = `
            <a class="message-action-btn primary" href="${escapeHtml(item.projectLink)}" target="_blank">View Project</a>
            ${dismissBtn}
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
 * Setup event listeners for message action buttons
 */
function setupMessageActionButtons() {
    const buttons = document.querySelectorAll('.mark-as-read-btn');
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const messageId = button.getAttribute('data-message-id');
            if (messageId) {
                markMessageViewed(messageId);
            }
        });
    });
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
