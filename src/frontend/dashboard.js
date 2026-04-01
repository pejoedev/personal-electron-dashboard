/**
 * Dashboard page logic - RSS feeds
 */

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
    console.log(item);

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
        // Get fullscreen settings for links
        const fullscreenArticle = localStorage.getItem('rss.fullscreen.article') === 'true';
        const fullscreenSource = localStorage.getItem('rss.fullscreen.source') !== 'false'; // Default true
        const articleTarget = fullscreenArticle ? '' : ' target="_blank"';
        const sourceTarget = fullscreenSource ? '' : ' target="_blank"';

        card.innerHTML = `
            <p class="rss-title">${escapeHtml(item.title)}</p>
            <div class="rss-description">${escapeHtml(item.description)}</div>
            <div class="rss-notes">
                <a class="rss-read" href="${escapeHtml(item.link)}"${articleTarget}>Read</a>
                <button class="rss-dismiss" type="button">Dismiss</button>
                <a class="rss-source" href="${escapeHtml(item.feedLink)}"${sourceTarget}>${escapeHtml(item.feedName)}</a>
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
 * Subscribe to RSS feed updates from backend
 */
function subscribeToRssUpdates() {
    if (!window.communicator) {
        console.warn('[RSS Updates] Communicator not available yet');
        return;
    }

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

    console.log('[RSS Updates] Subscribed to rss-feed-update');
}
