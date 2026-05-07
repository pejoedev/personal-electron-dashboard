import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIPC } from '../hooks/useIPC';

function Messages() {
  const navigate = useNavigate();
  const { send, subscribe } = useIPC();
  const [messages, setMessages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  const [filterOptions, setFilterOptions] = useState({
    feeds: [],
    projects: [],
  });

  const [filters, setFilters] = useState({
    type: 'all',
    viewedStatus: 'all',
    searchQuery: '',
    feedName: '',
    projectName: '',
  });

  // Subscribe to messages update from backend
  useEffect(() => {
    const unsubscribe = subscribe('messages-feed-update', (data) => {
      console.log('[Messages] Received messages update:', data);
      if (data.items) {
        setMessages(data.items);
        setTotalCount(data.totalCount || 0);
      }
    });

    // Request filter options
    send('request-filter-options', {});

    // Request initial page
    send('request-messages-feed', {
      page: currentPage,
      limit: pageSize,
      filters,
    });

    return unsubscribe;
  }, [send, subscribe, currentPage, pageSize]);

  // Subscribe to filter options
  useEffect(() => {
    const unsubscribe = subscribe('filter-options-update', (data) => {
      console.log('[Messages] Received filter options:', data);
      setFilterOptions({
        feeds: data.feedNames || [],
        projects: data.projectNames || []
      });
    });
    return unsubscribe;
  }, [subscribe]);

  const handleApplyFilters = useCallback(() => {
    setCurrentPage(0);
    send('request-messages-feed', {
      page: 0,
      limit: pageSize,
      filters,
    });
  }, [send, filters, pageSize]);

  const handleResetFilters = useCallback(() => {
    const defaultFilters = {
      type: 'all',
      viewedStatus: 'all',
      searchQuery: '',
      feedName: '',
      projectName: '',
    };
    setFilters(defaultFilters);
    setCurrentPage(0);
    send('request-messages-feed', {
      page: 0,
      limit: pageSize,
      filters: defaultFilters,
    });
  }, [send, pageSize]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    const maxPage = totalCount > 0 ? Math.ceil(totalCount / pageSize) - 1 : 0;
    if (currentPage < maxPage) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalCount, pageSize]);

  const maxPage = totalCount > 0 ? Math.ceil(totalCount / pageSize) - 1 : 0;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;

  const showFeedFilter = filters.type === 'rss' || filters.type === 'all';
  const showProjectFilter = filters.type === 'alert' || filters.type === 'all';

  return (
    <div className="content-section">
      <h2>Messages</h2>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="filter-type">Type:</label>
          <select
            id="filter-type"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="all">All</option>
            <option value="rss">RSS</option>
            <option value="alert">Alerts</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-search">Search:</label>
          <input
            id="filter-search"
            type="text"
            placeholder="Search messages..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-viewed">Viewed Status:</label>
          <select
            id="filter-viewed"
            value={filters.viewedStatus}
            onChange={(e) => setFilters({ ...filters, viewedStatus: e.target.value })}
          >
            <option value="all">All</option>
            <option value="viewed">Viewed</option>
            <option value="unviewed">Unviewed</option>
          </select>
        </div>

        {showFeedFilter && (
          <div id="feed-filter-group" className="filter-group">
            <label htmlFor="filter-feed">Feed:</label>
            <select
              id="filter-feed"
              value={filters.feedName}
              onChange={(e) => setFilters({ ...filters, feedName: e.target.value })}
            >
              <option value="">All Feeds</option>
              {filterOptions.feeds?.map((feed) => (
                <option key={feed} value={feed}>
                  {feed}
                </option>
              ))}
            </select>
          </div>
        )}

        {showProjectFilter && (
          <div id="project-filter-group" className="filter-group">
            <label htmlFor="filter-project">Project:</label>
            <select
              id="filter-project"
              value={filters.projectName}
              onChange={(e) => setFilters({ ...filters, projectName: e.target.value })}
            >
              <option value="">All Projects</option>
              {filterOptions.projects?.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          id="apply-filters-btn"
          className="btn btn-primary"
          onClick={handleApplyFilters}
        >
          Apply Filters
        </button>
        <button
          id="reset-filters-btn"
          className="btn btn-secondary"
          onClick={handleResetFilters}
        >
          Reset
        </button>
        <button
          id="manage-feeds-btn"
          className="btn btn-secondary"
          onClick={() => navigate('/settings')}
        >
          Manage Feeds
        </button>
      </div>

      {/* Messages List */}
      <div className="messages-list">
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <MessageItem key={message.uuid} message={message} />
          ))
        ) : (
          <div className="empty-state">
            <p>No messages found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination-wrapper">
        <div className="messages-pagination">
          <button
            id="messages-prev-btn"
            className="pagination-btn prev-btn"
            onClick={handlePrevPage}
            disabled={currentPage <= 0}
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            id="messages-next-btn"
            className="pagination-btn next-btn"
            onClick={handleNextPage}
            disabled={currentPage >= maxPage}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ message }) {
  return (
    <div className="message-item" data-message-id={message.uuid}>
      <h3 className="message-title">{message.title}</h3>
      <p className="message-description">{message.description}</p>
      <div className="message-meta">
        <span className="message-type">{message.isRss ? 'RSS' : 'Alert'}</span>
        <span className="message-time">
          {new Date(message.publication_date || message.fetch_date).toLocaleString()}
        </span>
        {!message.isViewed && <span className="message-badge unread">Unread</span>}
      </div>
    </div>
  );
}

export default Messages;
