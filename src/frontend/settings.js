/**
 * Settings page logic
 * Handles rendering and interaction with the settings panel
 */

/**
 * Show a notification toast
 * @param {string} message - The message to display
 * @param {string} type - Type of notification: 'success', 'error', 'info'
 * @param {number} duration - How long to show the notification in ms
 */
function showNotification(message, type = 'success', duration = 3000) {
    // Remove existing notification if present
    const existing = document.getElementById('settings-notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'settings-notification';
    notification.className = `settings-notification settings-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background-color: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
        color: white;
        border-radius: var(--radius);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

/**
 * Initialize the settings page
 */
function initializeSettings() {
    setupConditionalSettingsLogic();
    attachSettingsEventListeners();
    loadSettingsFromStorage();
}

/**
 * Setup conditional visibility for settings
 * Hide/show "Remove from Feed" setting based on "Hide Dismiss Button" toggle
 */
function setupConditionalSettingsLogic() {
    const hideDismissCheckbox = document.getElementById('hide-dismiss');
    const conditionalSetting = document.getElementById('conditional-setting');

    if (hideDismissCheckbox) {
        hideDismissCheckbox.addEventListener('change', (e) => {
            // Show conditional setting only if dismiss button is visible (not hidden)
            if (!e.target.checked) {
                conditionalSetting.style.display = 'block';
            } else {
                conditionalSetting.style.display = 'none';
            }
        });

        // Set initial state
        const isHidden = hideDismissCheckbox.checked;
        conditionalSetting.style.display = isHidden ? 'none' : 'block';
    }
}

/**
 * Attach event listeners to all settings
 */
function attachSettingsEventListeners() {
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');

    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings to their defaults?')) {
                resetSettingsToDefaults();
            }
        });
    }
}

/**
 * Load settings from localstorage and database
 */
function loadSettingsFromStorage() {
    // Frontend settings from localStorage
    const startMinimized = localStorage.getItem('start.minimized') === 'true';
    const fullscreenArticle = localStorage.getItem('rss.fullscreen.article') === 'true';
    const fullscreenSource = localStorage.getItem('rss.fullscreen.source') !== 'false'; // Default true
    const hideDismiss = localStorage.getItem('rss.hide.dismiss') === 'true';
    const removeOnRead = localStorage.getItem('rss.remove.on.read') !== 'false'; // Default true

    // Backend settings (placeholder - would come from database)
    const deleteMode = localStorage.getItem('delete.data.mode') || '3';

    // Update UI with loaded settings
    const startMinimizedEl = document.getElementById('start-minimized');
    const fullscreenArticleEl = document.getElementById('fullscreen-article');
    const fullscreenSourceEl = document.getElementById('fullscreen-source');
    const hideDismissEl = document.getElementById('hide-dismiss');
    const removeOnReadEl = document.getElementById('remove-on-read');
    const deleteModeEl = document.getElementById('delete-data-mode');

    if (startMinimizedEl) startMinimizedEl.checked = startMinimized;
    if (fullscreenArticleEl) fullscreenArticleEl.checked = fullscreenArticle;
    if (fullscreenSourceEl) fullscreenSourceEl.checked = fullscreenSource;
    if (hideDismissEl) hideDismissEl.checked = hideDismiss;
    if (removeOnReadEl) removeOnReadEl.checked = removeOnRead;
    if (deleteModeEl) deleteModeEl.value = deleteMode;
}

/**
 * Save all settings to storage
 */
function saveSettings() {
    try {
        // Disable the button to prevent double-clicks
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) saveBtn.disabled = true;

        // Get all setting values from DOM
        const startMinimizedEl = document.getElementById('start-minimized');
        const fullscreenArticleEl = document.getElementById('fullscreen-article');
        const fullscreenSourceEl = document.getElementById('fullscreen-source');
        const hideDismissEl = document.getElementById('hide-dismiss');
        const removeOnReadEl = document.getElementById('remove-on-read');
        const deleteModeEl = document.getElementById('delete-data-mode');

        const startMinimized = startMinimizedEl?.checked ?? false;
        const fullscreenArticle = fullscreenArticleEl?.checked ?? false;
        const fullscreenSource = fullscreenSourceEl?.checked ?? true;
        const hideDismiss = hideDismissEl?.checked ?? false;
        const removeOnRead = removeOnReadEl?.checked ?? true;
        const deleteMode = deleteModeEl?.value ?? '3';

        // Save frontend settings to localStorage
        localStorage.setItem('start.minimized', startMinimized.toString());
        localStorage.setItem('rss.fullscreen.article', fullscreenArticle.toString());
        localStorage.setItem('rss.fullscreen.source', fullscreenSource.toString());
        localStorage.setItem('rss.hide.dismiss', hideDismiss.toString());
        localStorage.setItem('rss.remove.on.read', removeOnRead.toString());
        localStorage.setItem('delete.data.mode', deleteMode);

        // Force flush to ensure data is written
        const tempKey = '__settings_save_test_' + Date.now();
        localStorage.setItem(tempKey, 'test');
        localStorage.removeItem(tempKey);

        // Verify they were saved
        if (localStorage.getItem('start.minimized') !== startMinimized.toString() ||
            localStorage.getItem('delete.data.mode') !== deleteMode) {
            throw new Error('Failed to verify settings were saved to localStorage');
        }

        // Send settings to backend (including start minimized for next launch)
        if (window.communicator) {
            window.communicator.send('save-settings', {
                delete_mode: deleteMode,
                start_minimized: startMinimized
            });
        }

        // Show notification with a slight delay to ensure save is complete
        setTimeout(() => {
            showNotification('Settings saved successfully!', 'success');
            // Re-enable save button after notification
            if (saveBtn) saveBtn.disabled = false;
        }, 100);
    } catch (error) {
        console.error('[Settings] Error saving settings:', error);
        showNotification('Error saving settings. Please try again.', 'error');
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) saveBtn.disabled = false;
    }
}

/**
 * Reset all settings to their default values
 */
function resetSettingsToDefaults() {
    try {
        // Defaults from todo.md
        const defaults = {
            'start-minimized': true,
            'fullscreen-article': false,
            'fullscreen-source': true,
            'hide-dismiss': false,
            'remove-on-read': true,
            'delete-data-mode': '3'
        };

        Object.entries(defaults).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else if (element.tagName === 'SELECT') {
                    element.value = value;
                }
            }
        });

        // Trigger conditional visibility update
        const hideDismissCheckbox = document.getElementById('hide-dismiss');
        if (hideDismissCheckbox) {
            const event = new Event('change');
            hideDismissCheckbox.dispatchEvent(event);
        }

        // Clear localStorage and reset to defaults
        Object.keys(localStorage)
            .filter(key => key.startsWith('start.') || key.startsWith('rss.') || key.startsWith('delete.'))
            .forEach(key => localStorage.removeItem(key));

        // Save defaults to localStorage
        localStorage.setItem('start.minimized', 'true');
        localStorage.setItem('rss.fullscreen.article', 'false');
        localStorage.setItem('rss.fullscreen.source', 'true');
        localStorage.setItem('rss.hide.dismiss', 'false');
        localStorage.setItem('rss.remove.on.read', 'true');
        localStorage.setItem('delete.data.mode', '3');

        // Notify backend
        if (window.communicator) {
            window.communicator.send('reset-settings', {});
        }

        showNotification('Settings reset to defaults!', 'success');
    } catch (error) {
        console.error('[Settings] Error resetting settings:', error);
        showNotification('Error resetting settings. Please try again.', 'error');
    }
}

/**
 * Subscribe to settings updates from backend
 */
function subscribeToSettingsUpdates() {
    if (!window.communicator) {
        console.warn('[Settings] Communicator not available yet');
        return;
    }

    window.communicator.subscribe('settings-update', (data) => {
        // Reload settings from storage
        loadSettingsFromStorage();
    });
}
