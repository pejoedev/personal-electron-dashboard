/**
 * Footer Component - Reusable footer
 */
class Footer {
    constructor(containerId = 'footer') {
        this.container = document.getElementById(containerId);
    }

    render() {
        this.container.innerHTML = `
            <div class="footer-content">
                <p>&copy; 2026 <a href="https://pejoe.dev/" style="color: inherit" target="_blank">Pejoe.dev</a></p>
                <div class="footer-links">
                    <a href="https://github.com/pejoedev/personal-electron-dashboard/issues">Report Issue</a>
                </div>
            </div>
        `;
    }
}

// Export singleton
window.footer = new Footer();
