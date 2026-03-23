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
                <p>&copy; 2026 My Dashboard. All rights reserved.</p>
                <div class="footer-links">
                    <a href="#help">Help</a>
                    <a href="#about">About</a>
                    <a href="#privacy">Privacy</a>
                </div>
            </div>
        `;
    }
}

// Export singleton
window.footer = new Footer();
