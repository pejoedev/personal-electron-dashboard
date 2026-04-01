/**
 * RSS Feeds Management Page Logic
 * Handles CRUD operations for RSS feed subscriptions
 */

/**
 * Initialize RSS feeds page
 */
function initRssPage() {
    setupRssFeedsUI();
    requestRssFeedsList();
    subscribeToRssFeedsUpdates();
    console.log('[RSS Page] Initialized');
}

/**
 * Setup RSS feeds management UI
 */
function setupRssFeedsUI() {
    const addFeedBtn = document.getElementById('add-feed-btn');
    const modal = document.getElementById('feed-modal');
    const closeBtn = document.querySelector('.modal-close');
    const submitBtn = document.getElementById('submit-feed-btn');
    const cancelBtn = document.getElementById('cancel-feed-btn');
    const form = document.getElementById('feed-form');

    if (addFeedBtn) {
        addFeedBtn.addEventListener('click', () => {
            openFeedModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeFeedModal();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            closeFeedModal();
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            submitFeedForm();
        });
    }

    // Close modal when clicking outside of it
    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeFeedModal();
            }
        });
    }

    console.log('[RSS Page] UI setup complete');
}

/**
 * Open the feed modal for adding/editing
 */
function openFeedModal(feedId = null) {
    const modal = document.getElementById('feed-modal');
    const form = document.getElementById('feed-form');
    const title = document.getElementById('modal-title');
    const uuidField = document.getElementById('feed-uuid');
    const nameField = document.getElementById('feed-name');
    const linkField = document.getElementById('feed-rss-link');
    const submitBtn = document.getElementById('submit-feed-btn');

    // Reset form
    form.reset();
    uuidField.value = '';

    if (feedId) {
        // Edit mode
        title.textContent = 'Edit RSS Feed';
        submitBtn.textContent = 'Update Feed';

        const feeds = window.rssPageState?.feedsList || [];
        const feed = feeds.find(f => f.uuid === feedId);

        if (feed) {
            uuidField.value = feed.uuid;
            nameField.value = feed.name;
            linkField.value = feed.rssLink;
        }
    } else {
        // Create mode
        title.textContent = 'Add New RSS Feed';
        submitBtn.textContent = 'Add Feed';
    }

    if (modal) {
        modal.style.display = 'block';
        nameField.focus();
    }
}

/**
 * Close the feed modal
 */
function closeFeedModal() {
    const modal = document.getElementById('feed-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Show the delete strategy modal
 * @param {Object} preview - The delete preview object
 */
function showDeleteStrategyModal(preview) {
    const modal = document.getElementById('delete-strategy-modal');
    const title = document.getElementById('delete-strategy-title');
    const info = document.getElementById('delete-strategy-info');

    title.textContent = `Delete Feed: "${preview.feedName}"`;
    info.textContent = `This feed has:\n- ${preview.wouldDelete.feeds} feed(s)\n- ${preview.wouldDelete.rssItems} RSS item(s)\n- ${preview.wouldDelete.messages} message(s)\n\nChoose "Delete Everything" to cascade delete all related data, or "Keep Messages" to soft delete and preserve the messages.`;

    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Close the delete strategy modal
 */
function closeDeleteStrategyModal() {
    const modal = document.getElementById('delete-strategy-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Show the delete confirmation modal
 * @param {string} feedName - The name of the feed being deleted
 * @param {string} deletionMethod - The deletion method ('cascade' or 'soft')
 */
function showDeleteConfirmModal(feedName, deletionMethod) {
    const modal = document.getElementById('delete-confirm-modal');
    const title = document.getElementById('delete-confirm-title');
    const message = document.getElementById('delete-confirm-message');

    if (deletionMethod === 'cascade') {
        title.textContent = 'Confirm Cascade Delete';
        message.textContent = `You are about to permanently delete the feed "${feedName}" and all related data (feeds, RSS items, and messages). This action cannot be undone. Are you sure?`;
    } else if (deletionMethod === 'soft') {
        title.textContent = 'Confirm Soft Delete';
        message.textContent = `You are about to delete the feed "${feedName}". The feed will be marked as deleted and will not receive future updates, but existing messages will be preserved. Are you sure?`;
    }

    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Close the delete confirmation modal
 */
function closeDeleteConfirmModal() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Submit the feed form (create or update)
 */
function submitFeedForm() {
    const uuidField = document.getElementById('feed-uuid');
    const nameField = document.getElementById('feed-name');
    const linkField = document.getElementById('feed-rss-link');

    const uuid = uuidField.value.trim();
    const name = nameField.value.trim();
    const rssLink = linkField.value.trim();

    if (!name) {
        alert('Please enter a feed name');
        nameField.focus();
        return;
    }

    if (!rssLink) {
        alert('Please enter an RSS link');
        linkField.focus();
        return;
    }

    if (!window.communicator) {
        alert('Communication system not initialized');
        return;
    }

    if (uuid) {
        // Update mode
        window.communicator.send('update-rss-feed', {
            uuid: uuid,
            name: name,
            rssLink: rssLink
        });
    } else {
        // Create mode
        window.communicator.send('create-rss-feed', {
            name: name,
            rssLink: rssLink
        });
    }

    closeFeedModal();
}

/**
 * Request RSS feeds list from backend
 */
function requestRssFeedsList() {
    if (!window.communicator) {
        console.error('[RSS Page] Communicator not initialized');
        return;
    }

    window.communicator.send('request-rss-feeds-list');
}

/**
 * Render RSS feeds list
 * @param {Array} feeds - Array of RSS feed objects
 */
function renderRssFeedsList(feeds) {
    const container = document.getElementById('feeds-list');
    if (!container) {
        console.error('[RSS Page] Feeds container not found');
        return;
    }

    container.innerHTML = '';

    if (!feeds || feeds.length === 0) {
        container.innerHTML = `
            <div class="feeds-empty">
                <div class="feeds-empty-icon">📰</div>
                <p class="feeds-empty-text">No RSS feeds yet. Add one to get started!</p>
            </div>
        `;
        return;
    }

    feeds.forEach(feed => {
        const feedEl = createFeedElement(feed);
        container.appendChild(feedEl);
    });

    console.log(`[RSS Page] Rendered ${feeds.length} feeds`);
}

/**
 * Create a feed element for display
 * @param {Object} feed - The feed object
 * @returns {HTMLElement} The feed element
 */
function createFeedElement(feed) {
    const div = document.createElement('div');
    div.className = 'feed-item';
    div.setAttribute('data-feed-id', feed.uuid);

    const lastFetch = feed.last_fetch ? formatDate(feed.last_fetch) : 'Never';

    div.innerHTML = `
        <div class="feed-header">
            <div class="feed-info">
                <h3 class="feed-name">${escapeHtml(feed.name)}</h3>
                <p class="feed-link"><a href="${escapeHtml(feed.rssLink)}" target="_blank" rel="noopener">Open Feed →</a></p>
            </div>
            <div class="feed-stats">
                <div class="stat">
                    <span class="stat-label">Items:</span>
                    <span class="stat-value">${feed.item_count || 0}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Last Fetch:</span>
                    <span class="stat-value">${lastFetch}</span>
                </div>
            </div>
        </div>
        <div class="feed-rss-link">
            <span class="rss-url">${escapeHtml(feed.rssLink)}</span>
        </div>
        <div class="feed-actions">
            <button class="feed-action-btn edit-btn" data-feed-id="${feed.uuid}">Edit</button>
            <button class="feed-action-btn delete-btn" data-feed-id="${feed.uuid}">Delete</button>
        </div>
    `;

    // Attach event listeners
    const editBtn = div.querySelector('.edit-btn');
    const deleteBtn = div.querySelector('.delete-btn');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openFeedModal(feed.uuid);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            showDeleteConfirm(feed.uuid);
        });
    }

    return div;
}

/**
 * Show delete confirmation dialog
 * @param {string} feedId - The UUID of the feed to delete
 */
function showDeleteConfirm(feedId) {
    const feeds = window.rssPageState?.feedsList || [];
    const feed = feeds.find(f => f.uuid === feedId);

    if (!feed) return;

    if (!window.communicator) {
        alert('Communication system not initialized');
        return;
    }

    // Request deletion mode setting from backend
    window.pendingDeleteFeedId = feedId;
    window.communicator.send('get-deletion-mode', {});
}

/**
 * Subscribe to RSS feeds updates from backend
 */
function subscribeToRssFeedsUpdates() {
    if (!window.communicator) {
        console.error('[RSS Page] Communicator not initialized');
        return;
    }

    // Initialize page state
    window.rssPageState = window.rssPageState || {
        feedsList: []
    };

    // Handle RSS feeds list update
    window.communicator.subscribe('rss-feeds-list-update', (data) => {
        window.rssPageState.feedsList = data.feeds || [];
        renderRssFeedsList(window.rssPageState.feedsList);
        console.log('[RSS Page] Received feeds list:', data);
    });

    // Handle feed created
    window.communicator.subscribe('rss-feed-created', (data) => {
        if (data.success) {
            alert(`Feed "${data.feed.name}" created successfully!`);
            requestRssFeedsList(); // Refresh the list
        }
    });

    // Handle feed updated
    window.communicator.subscribe('rss-feed-updated', (data) => {
        if (data.success) {
            alert(`Feed "${data.feed.name}" updated successfully!`);
            requestRssFeedsList(); // Refresh the list
        }
    });

    // Handle delete preview
    window.communicator.subscribe('rss-feed-delete-preview', (data) => {
        const preview = data.preview;
        showDeleteStrategyModal(preview);
    });

    // Handle deletion mode response
    window.communicator.subscribe('deletion-mode-response', (data) => {
        const deletionMode = data.deletionMode;
        const feedId = window.pendingDeleteFeedId;

        if (!feedId) {
            console.error('[RSS Page] No pending delete feed ID');
            return;
        }

        // Get feed name from state
        const feeds = window.rssPageState?.feedsList || [];
        const feed = feeds.find(f => f.uuid === feedId);
        const feedName = feed ? feed.name : 'Unknown Feed';

        if (deletionMode === 1) {
            // Mode 1: Cascade delete - show confirmation first
            console.log('[RSS Page] Deletion mode 1 (cascade): Showing confirmation');
            window.pendingDeletionMethod = 'cascade';
            window.pendingDeletionFeedName = feedName;
            showDeleteConfirmModal(feedName, 'cascade');
        } else if (deletionMode === 2) {
            // Mode 2: Soft delete - show confirmation first
            console.log('[RSS Page] Deletion mode 2 (soft): Showing confirmation');
            window.pendingDeletionMethod = 'soft';
            window.pendingDeletionFeedName = feedName;
            showDeleteConfirmModal(feedName, 'soft');
        } else if (deletionMode === 3) {
            // Mode 3: Ask user - request preview and show modal
            console.log('[RSS Page] Deletion mode 3 (ask): Requesting preview');
            window.communicator.send('request-rss-feed-delete-preview', {
                uuid: feedId
            });
        } else {
            console.warn(`[RSS Page] Unknown deletion mode: ${deletionMode}`);
            window.pendingDeleteFeedId = null;
        }
    });

    // Setup delete strategy modal buttons
    const deleteStrategyModal = document.getElementById('delete-strategy-modal');
    const deleteStrategyCloseBtn = document.getElementById('delete-strategy-close');
    const deleteCascadeBtn = document.getElementById('delete-cascade-btn');
    const deleteSoftBtn = document.getElementById('delete-soft-btn');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');

    if (deleteStrategyCloseBtn) {
        deleteStrategyCloseBtn.addEventListener('click', () => {
            closeDeleteStrategyModal();
        });
    }

    if (deleteCascadeBtn) {
        deleteCascadeBtn.addEventListener('click', () => {
            if (window.pendingDeleteFeedId) {
                closeDeleteStrategyModal();
                window.communicator.send('delete-rss-feed', {
                    uuid: window.pendingDeleteFeedId,
                    strategy: 'cascade'
                });
                window.pendingDeleteFeedId = null;
            }
        });
    }

    if (deleteSoftBtn) {
        deleteSoftBtn.addEventListener('click', () => {
            if (window.pendingDeleteFeedId) {
                closeDeleteStrategyModal();
                window.communicator.send('delete-rss-feed', {
                    uuid: window.pendingDeleteFeedId,
                    strategy: 'soft'
                });
                window.pendingDeleteFeedId = null;
            }
        });
    }

    if (deleteCancelBtn) {
        deleteCancelBtn.addEventListener('click', () => {
            closeDeleteStrategyModal();
            window.pendingDeleteFeedId = null;
        });
    }

    // Close modal when clicking outside of it
    if (deleteStrategyModal) {
        window.addEventListener('click', (event) => {
            if (event.target === deleteStrategyModal) {
                closeDeleteStrategyModal();
            }
        });
    }

    // Setup delete confirmation modal buttons
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const deleteConfirmCloseBtn = document.getElementById('delete-confirm-close');
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    const deleteConfirmCancelBtn = document.getElementById('delete-confirm-cancel-btn');

    if (deleteConfirmCloseBtn) {
        deleteConfirmCloseBtn.addEventListener('click', () => {
            closeDeleteConfirmModal();
            window.pendingDeleteFeedId = null;
            window.pendingDeletionMethod = null;
            window.pendingDeletionFeedName = null;
        });
    }

    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', () => {
            if (window.pendingDeleteFeedId && window.pendingDeletionMethod) {
                closeDeleteConfirmModal();
                window.communicator.send('delete-rss-feed', {
                    uuid: window.pendingDeleteFeedId,
                    strategy: window.pendingDeletionMethod
                });
                window.pendingDeleteFeedId = null;
                window.pendingDeletionMethod = null;
                window.pendingDeletionFeedName = null;
            }
        });
    }

    if (deleteConfirmCancelBtn) {
        deleteConfirmCancelBtn.addEventListener('click', () => {
            closeDeleteConfirmModal();
            window.pendingDeleteFeedId = null;
            window.pendingDeletionMethod = null;
            window.pendingDeletionFeedName = null;
        });
    }

    // Close confirmation modal when clicking outside of it
    if (deleteConfirmModal) {
        window.addEventListener('click', (event) => {
            if (event.target === deleteConfirmModal) {
                closeDeleteConfirmModal();
                window.pendingDeleteFeedId = null;
                window.pendingDeletionMethod = null;
                window.pendingDeletionFeedName = null;
            }
        });
    }

    // Handle feed deleted
    window.communicator.subscribe('rss-feed-deleted', (data) => {
        if (data.success) {
            const deleteType = data.result.deleteType;
            const message = deleteType === 'cascade'
                ? `Feed deleted with ${data.result.deletedCounts.messages} message(s) removed`
                : `Feed marked as deleted. Messages preserved. Feed will not be updated.`;
            alert(message);
            requestRssFeedsList(); // Refresh the list
            // Clear pending deletion variables
            window.pendingDeleteFeedId = null;
            window.pendingDeletionMethod = null;
            window.pendingDeletionFeedName = null;
        }
    });

    // Handle errors
    window.communicator.subscribe('rss-feed-error', (data) => {
        console.error('[RSS Page] Error:', data.error);
        alert(`Error: ${data.error}`);
        window.pendingDeleteFeedId = null;
        window.pendingDeletionMethod = null;
        window.pendingDeletionFeedName = null;
        closeDeleteConfirmModal();
    });

    window.communicator.subscribe('deletion-mode-error', (data) => {
        console.error('[RSS Page] Deletion mode error:', data.error);
        alert(`Error fetching deletion mode: ${data.error}`);
        window.pendingDeleteFeedId = null;
        window.pendingDeletionMethod = null;
        window.pendingDeletionFeedName = null;
        closeDeleteConfirmModal();
    });

    console.log('[RSS Page] Subscribed to updates');
}
