/**
 * Page state management
 * Centralized state definitions for different pages
 */

/**
 * Initialize RSS page state with defaults
 */
window.rssPageState = {
    currentPage: 0,
    pageSize: 20,
    totalCount: 0,
    feeds: []
};

/**
 * Initialize Messages page state with defaults
 */
window.messagesPageState = {
    currentPage: 0,
    pageSize: 20,
    totalCount: 0,
    messages: [],
    filters: {
        type: 'all',
        viewedStatus: 'all',
        searchQuery: '',
        feedName: '',
        projectName: ''
    }
};
