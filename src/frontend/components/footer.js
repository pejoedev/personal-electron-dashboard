/**
 * Footer Component - Reusable footer with version info
 */
class Footer {
    constructor(containerId = 'footer') {
        this.container = document.getElementById(containerId);
        this.versionStatus = {
            hasUpdate: false,
            local: 'Loading...',
            latest: null,
            releaseUrl: null,
            error: false
        };
    }

    async render() {
        this.container.innerHTML = `
            <div class="footer-content">
                <p>&copy; 2026 <a href="https://pejoe.dev/" style="color: inherit" target="_blank">Pejoe.dev</a></p>
                <div class="footer-version-section">
                    <div id="version-badge" class="version-badge" style="cursor: pointer;">
                        <span class="version-text" id="version-text">v${this.versionStatus.local}</span>
                        <span id="version-warning" class="version-warning" style="display: none;" title="Update available">⚠️</span>
                    </div>
                </div>
                <div class="footer-links">
                    <a href="https://github.com/pejoedev/personal-electron-dashboard/issues">Report Issue</a>
                </div>
            </div>

            <!-- Version Update Modal -->
            <div id="version-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>About</h2>
                        <button class="modal-close" id="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="version-info-container">
                            <div class="version-info-item">
                                <label>Local Version:</label>
                                <span id="modal-local-version" class="version-value">Loading...</span>
                            </div>
                            <div class="version-info-item">
                                <label>Latest Version:</label>
                                <span id="modal-latest-version" class="version-value">-</span>
                            </div>
                        </div>
                        <div id="modal-update-status" class="modal-update-status">
                            <!-- Status will be inserted here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="modal-close-secondary">Close</button>
                        <a id="modal-download-btn" href="#" target="_blank" class="btn btn-primary" style="display: none;">Download Update</a>
                    </div>
                </div>
            </div>
        `;

        // Set up event listeners
        await this.setupVersionCheck();
        this.attachEventListeners();
    }

    async setupVersionCheck() {
        if (typeof versionManager === 'undefined') {
            console.warn('[Footer] VersionManager not available');
            return;
        }

        try {
            // Get version info from API
            const versionInfo = await window.electronAPI.getVersion();
            this.versionStatus.local = versionInfo.local;
            this.updateVersionDisplay();

            // Check for updates
            const result = await versionManager.checkForUpdates();
            if (!result.error) {
                this.versionStatus = { ...this.versionStatus, ...result };
                this.updateVersionDisplay();
            }
        } catch (error) {
            console.error('[Footer] Error checking version:', error);
        }
    }

    updateVersionDisplay() {
        const versionText = document.getElementById('version-text');
        const warningBadge = document.getElementById('version-warning');

        if (versionText) {
            versionText.textContent = `v${this.versionStatus.local}`;
        }

        if (warningBadge) {
            if (this.versionStatus.hasUpdate) {
                warningBadge.style.display = 'inline-block';
                warningBadge.title = `Update available: v${this.versionStatus.latest}`;
            } else {
                warningBadge.style.display = 'none';
            }
        }
    }

    attachEventListeners() {
        const badge = document.getElementById('version-badge');
        const modal = document.getElementById('version-modal');
        const closeBtn = document.getElementById('modal-close-btn');
        const closeSecondaryBtn = document.getElementById('modal-close-secondary');

        if (badge) {
            badge.addEventListener('click', () => this.openModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (closeSecondaryBtn) {
            closeSecondaryBtn.addEventListener('click', () => this.closeModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    }

    openModal() {
        const modal = document.getElementById('version-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.populateModal();
        }
    }

    closeModal() {
        const modal = document.getElementById('version-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    populateModal() {
        const localVersionEl = document.getElementById('modal-local-version');
        const latestVersionEl = document.getElementById('modal-latest-version');
        const statusEl = document.getElementById('modal-update-status');
        const downloadBtn = document.getElementById('modal-download-btn');

        if (localVersionEl) {
            localVersionEl.textContent = this.versionStatus.local;
        }

        if (latestVersionEl) {
            latestVersionEl.textContent = this.versionStatus.latest || '-';
        }

        if (statusEl) {
            statusEl.innerHTML = '';

            if (this.versionStatus.error) {
                statusEl.innerHTML = `
                    <div class="status-message error">
                        <span class="status-icon">⚠️</span>
                        <span>Unable to check for updates</span>
                    </div>
                `;
            } else if (this.versionStatus.hasUpdate) {
                statusEl.innerHTML = `
                    <div class="status-message update-available">
                        <span class="status-icon">🆕</span>
                        <span>A new version is available!</span>
                    </div>
                `;
            } else {
                statusEl.innerHTML = `
                    <div class="status-message current">
                        <span class="status-icon">✓</span>
                        <span>You are running the latest version</span>
                    </div>
                `;
            }
        }

        if (downloadBtn) {
            if (this.versionStatus.hasUpdate && this.versionStatus.releaseUrl) {
                downloadBtn.href = this.versionStatus.releaseUrl;
                downloadBtn.style.display = 'inline-block';
            } else {
                downloadBtn.style.display = 'none';
            }
        }
    }
}

// Export singleton
window.footer = new Footer();
