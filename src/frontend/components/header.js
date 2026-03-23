/**
 * Header Component - Reusable navigation header
 */
class Header {
    constructor(containerId = 'header') {
        this.container = document.getElementById(containerId);
    }

    render(currentPage = 'overview') {
        this.container.innerHTML = `
            <div class="header-container">
                <div class="header-title">
                    <h1>📊 My Dashboard</h1>
                </div>
                <nav class="header-nav">
                    <ul>
                        <li><a href="#overview" class="nav-link" data-page="overview">Overview</a></li>
                        <li><a href="#analytics" class="nav-link" data-page="analytics">Analytics</a></li>
                        <li><a href="#settings" class="nav-link" data-page="settings">Settings</a></li>
                    </ul>
                </nav>
            </div>
        `;

        this._setupEventListeners(currentPage);
    }

    _setupEventListeners(currentPage) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const page = link.getAttribute('data-page');

            if (page === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }

            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.router.navigate(page);
            });
        });
    }

    setActive(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-page') === page);
        });
    }
}

// Export singleton
window.header = new Header();
