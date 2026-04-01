/**
 * Version Management Utility
 * Handles checking and comparing application versions
 */

class VersionManager {
    constructor() {
        this.localVersion = null;
        this.latestVersion = null;
    }

    /**
     * Compare two semantic version strings
     * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     * @param {string} v1 - First version (e.g., "1.2.3")
     * @param {string} v2 - Second version (e.g., "1.2.3")
     * @returns {number} Comparison result
     */
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;

            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }

        return 0;
    }

    /**
     * Check if a new version is available
     * @returns {Promise<Object>} Update check result with version info
     */
    async checkForUpdates() {
        try {
            // Get local version
            const versionInfo = await window.electronAPI.getVersion();
            this.localVersion = versionInfo.local;

            // Get latest version from GitHub
            const updateInfo = await window.electronAPI.checkForUpdates();
            if (!updateInfo) {
                console.warn('[VersionManager] Could not fetch update information');
                return { hasUpdate: false, error: true };
            }

            this.latestVersion = updateInfo.latest;

            const comparison = this.compareVersions(updateInfo.latest, this.localVersion);
            
            return {
                hasUpdate: comparison > 0,
                local: this.localVersion,
                latest: this.latestVersion,
                releaseUrl: updateInfo.releaseUrl,
                publishedAt: updateInfo.publishedAt,
                error: false
            };
        } catch (error) {
            console.error('[VersionManager] Error checking for updates:', error);
            return { hasUpdate: false, error: true, message: error.message };
        }
    }

    /**
     * Get local version string
     * @returns {string} Local version
     */
    getVersionString() {
        return this.localVersion || 'Unknown';
    }
}

// Create singleton instance
const versionManager = new VersionManager();
