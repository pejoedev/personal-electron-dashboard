/**
 * Router - Client-side page router for SPA navigation
 */
class Router {
    constructor() {
        this.currentPage = 'dashboard';
        this.pages = {
            dashboard: 'pages/html/dashboard.html',
            messages: 'pages/html/messages.html',
            rss: 'pages/html/analytics.html',
            settings: 'pages/html/settings.html',
        };
    }

    /**
     * Navigate to a page
     * @param {string} page - Page name (overview, analytics, settings)
     */
    async navigate(page) {
        if (!this.pages[page]) {
            console.error(`Page not found: ${page}`);
            return;
        }

        try {
            const response = await fetch(this.pages[page]);
            if (!response.ok) throw new Error(`Failed to load ${page}`);

            const html = await response.text();
            const container = document.getElementById('page-container');
            container.innerHTML = html;

            this.currentPage = page;
            window.header.setActive(page);

            // Trigger page-specific initialization
            window.dispatchEvent(new CustomEvent('page-changed', { detail: { page } }));
        } catch (err) {
            console.error('Navigation error:', err);
            document.getElementById('page-container').innerHTML = `
                <div class="error-container">
                    <p>Error loading page: ${page}</p>
                    <p style="font-size: 0.9rem; color: #888;">Please try refreshing or contact support.</p>
                </div>
            `;
        }
    }

    /**
     * Get the current active page
     */
    getCurrentPage() {
        return this.currentPage;
    }
}

// Export singleton
window.router = new Router();
