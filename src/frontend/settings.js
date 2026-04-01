/**
 * Settings page logic
 * Handles rendering and interaction with the settings panel
 */

/**
 * Initialize the settings page
 */
function initializeSettings() {
    console.log('[Settings] Initializing settings page');

    setupConditionalSettingsLogic();
    attachSettingsEventListeners();
    loadSettingsFromStorage();

    console.log('[Settings] Settings page initialized');
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
            console.log('[Settings] Hide dismiss button toggled:', e.target.checked);

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
        resetBtn.addEventListener('click', resetSettingsToDefaults);
    }

    console.log('[Settings] Event listeners attached');
}

/**
 * Load settings from localstorage and database
 */
function loadSettingsFromStorage() {
    console.log('[Settings] Loading settings from storage');

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

    console.log('[Settings] Settings loaded:', {
        startMinimized,
        fullscreenArticle,
        fullscreenSource,
        hideDismiss,
        removeOnRead,
        deleteMode
    });
}

/**
 * Save all settings to storage
 */
function saveSettings() {
    console.log('[Settings] Attempting to save settings');

    // Get all setting values
    const startMinimized = document.getElementById('start-minimized')?.checked || false;
    const fullscreenArticle = document.getElementById('fullscreen-article')?.checked || false;
    const fullscreenSource = document.getElementById('fullscreen-source')?.checked || false;
    const hideDismiss = document.getElementById('hide-dismiss')?.checked || false;
    const removeOnRead = document.getElementById('remove-on-read')?.checked || false;
    const deleteMode = document.getElementById('delete-data-mode')?.value || '3';

    // TODO: Save settings to localStorage and database
    // This will be implemented later with actual storage operations

    console.log('[Settings] Settings ready to save:', {
        startMinimized,
        fullscreenArticle,
        fullscreenSource,
        hideDismiss,
        removeOnRead,
        deleteMode
    });

    // TODO: Show success message to user
}

/**
 * Reset all settings to their default values
 */
function resetSettingsToDefaults() {
    console.log('[Settings] Resetting settings to defaults');

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

    console.log('[Settings] Settings reset to defaults');

    // TODO: Show confirmation message to user
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
        console.log('[Settings] Settings update received:', data);
        // TODO: Update UI with new settings from backend
    });

    console.log('[Settings] Subscribed to settings-update');
}
