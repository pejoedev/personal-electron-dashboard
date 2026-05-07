import React, { useState, useEffect, useCallback } from 'react';
import { useIPC } from '../hooks/useIPC';

function Dashboard() {
  const { send, subscribe } = useIPC();
  const [feeds, setFeeds] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Subscribe to RSS updates from backend
  useEffect(() => {
    const unsubscribe = subscribe('rss-feed-update', (data) => {
      console.log('[Dashboard] Received RSS feed update:', data);
      if (data.feeds) {
        setFeeds(data.feeds);
        setTotalCount(data.totalCount || 0);
      }
      setLastRefresh(new Date());
    });

    // Request initial page
    send('request-rss-feed', {
      page: currentPage,
      limit: pageSize,
      hideViewed: true,
    });

    return unsubscribe;
  }, [send, subscribe, currentPage, pageSize]);

  const handleMarkItemViewed = useCallback(
    (messageId) => {
      const removeOnRead = localStorage.getItem('rss.remove.on.read') !== 'false';

      if (removeOnRead) {
        console.log('[Dashboard] Remove on read setting is enabled');
        return;
      }

      send('mark-item-viewed', { messageId });
      setTimeout(() => {
        send('request-rss-feed', {
          page: currentPage,
          limit: pageSize,
          hideViewed: true,
        });
      }, 300);
    },
    [send, currentPage, pageSize]
  );

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

  return (
    <div id="entire-dash" className="content-section">
      <section id="rss-panel">
        <div className="dashboard-header">
          <h2>RSS Feeds</h2>
          <p className="last-refresh">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        
        <div id="rss-feed" className="cards-grid">
          {feeds && feeds.length > 0 ? (
            feeds.map((item) => (
              <RSSCard
                key={item.uuid}
                item={item}
                onMarkViewed={handleMarkItemViewed}
              />
            ))
          ) : (
            <div className="empty-state">
              <p>No RSS feeds available</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="pagination-wrapper">
          <div id="rss-pagination" className="rss-pagination">
            <button
              id="rss-prev-btn"
              className="pagination-btn prev-btn"
              onClick={handlePrevPage}
              disabled={currentPage <= 0}
            >
              ← Previous
            </button>
            <span id="rss-page-info" className="page-info">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              id="rss-next-btn"
              className="pagination-btn next-btn"
              onClick={handleNextPage}
              disabled={currentPage >= maxPage}
            >
              Next →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Separate RSSCard component for reusability
function RSSCard({ item, onMarkViewed }) {
  const hideDismiss = localStorage.getItem('rss.hide.dismiss') === 'true';
  const fullscreenArticle = localStorage.getItem('rss.fullscreen.article') === 'true';
  const fullscreenSource = localStorage.getItem('rss.fullscreen.source') !== 'false';

  const handleReadClick = (e) => {
    e.preventDefault();
    onMarkViewed(item.uuid);
    if (!fullscreenArticle) {
      window.open(item.link, '_blank');
    } else {
      window.location.href = item.link;
    }
  };

  const handleSourceClick = (e) => {
    e.preventDefault();
    if (!fullscreenSource) {
      window.open(item.feedLink, '_blank');
    } else {
      window.location.href = item.feedLink;
    }
  };

  return (
    <div className="rss-card" data-message-id={item.uuid}>
      <p className="rss-title">{item.title}</p>
      <div className="rss-description">{item.description}</div>
      <div className="rss-notes">
        <a className="rss-read" href={item.link} onClick={handleReadClick}>
          Read
        </a>
        {!hideDismiss && (
          <button
            className="rss-dismiss"
            type="button"
            onClick={() => onMarkViewed(item.uuid)}
          >
            Dismiss
          </button>
        )}
        <a
          className="rss-source"
          href={item.feedLink}
          onClick={handleSourceClick}
        >
          {item.feedName}
        </a>
        <p className="rss-timestamp">
          {new Date(item.publication_date || item.fetch_date).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
