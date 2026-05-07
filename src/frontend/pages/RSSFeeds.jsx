import React, { useState, useEffect, useCallback } from 'react';
import { useIPC } from '../hooks/useIPC';

function RSSFeeds() {
    const { send, subscribe } = useIPC();
    const [feeds, setFeeds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        uuid: '',
        name: '',
        rssLink: '',
    });

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteFeedData, setDeleteFeedData] = useState(null);

    // Load feeds on component mount
    useEffect(() => {
        const unsubscribe = subscribe('rss-feeds-list-update', (data) => {
            console.log('[RSSFeeds] Received feeds list:', data);
            setFeeds(data.feeds || []);
        });

        requestFeedsList();
        return unsubscribe;
    }, [subscribe]);

    // Subscribe to feed creation response
    useEffect(() => {
        const unsubscribe = subscribe('rss-feed-created', (data) => {
            console.log('[RSSFeeds] Feed created:', data);
            if (data.success) {
                setSuccessMessage('RSS feed added successfully!');
                setShowModal(false);
                setFormData({ uuid: '', name: '', rssLink: '' });
                requestFeedsList();
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        });

        return unsubscribe;
    }, [subscribe]);

    // Subscribe to feed deletion response
    useEffect(() => {
        const unsubscribe = subscribe('rss-feed-deleted', (data) => {
            console.log('[RSSFeeds] Feed deleted:', data);
            if (data.success) {
                setSuccessMessage('RSS feed deleted successfully!');
                setShowDeleteConfirm(false);
                setDeleteFeedData(null);
                requestFeedsList();
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        });

        return unsubscribe;
    }, [subscribe]);

    // Subscribe to errors
    useEffect(() => {
        const unsubscribe = subscribe('rss-feed-error', (data) => {
            console.error('[RSSFeeds] Error:', data);
            setError(data.error || 'An error occurred');
            setTimeout(() => setError(null), 5000);
        });

        return unsubscribe;
    }, [subscribe]);

    const requestFeedsList = useCallback(() => {
        setLoading(true);
        send('request-rss-feeds-list', {});
    }, [send]);

    const handleAddFeed = () => {
        setFormData({ uuid: '', name: '', rssLink: '' });
        setShowModal(true);
    };

    const handleEditFeed = (feed) => {
        setFormData({
            uuid: feed.uuid,
            name: feed.name,
            rssLink: feed.rssLink,
        });
        setShowModal(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Please enter a feed name');
            return;
        }

        if (!formData.rssLink.trim()) {
            setError('Please enter an RSS link');
            return;
        }

        if (formData.uuid) {
            // Update existing feed
            send('update-rss-feed', {
                uuid: formData.uuid,
                name: formData.name,
                rssLink: formData.rssLink,
            });
        } else {
            // Create new feed
            send('create-rss-feed', {
                name: formData.name,
                rssLink: formData.rssLink,
            });
        }
    };

    const handleDeleteClick = (feed) => {
        setDeleteFeedData(feed);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        if (deleteFeedData) {
            send('delete-rss-feed', {
                uuid: deleteFeedData.uuid,
                deleteMode: 'cascade', // or 'soft' for soft delete
            });
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setError(null);
    };

    const handleCloseDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setDeleteFeedData(null);
    };

    return (
        <div className="content-section">
            <section id="rss-management">
                <div className="section-header">
                    <h2>RSS Feeds Management</h2>
                    <p>Add, update, or remove RSS feed subscriptions</p>
                </div>

                {error && <div className="error-notification">{error}</div>}
                {successMessage && <div className="success-notification">{successMessage}</div>}

                <button className="btn btn-primary" onClick={handleAddFeed} style={{ marginBottom: '2rem' }}>
                    + Add New Feed
                </button>

                {loading && <p>Loading feeds...</p>}

                {feeds && feeds.length > 0 ? (
                    <div className="feeds-list">
                        {feeds.map((feed) => (
                            <div key={feed.uuid} className="feed-item">
                                <div className="feed-header">
                                    <h3>{feed.name}</h3>
                                    <a href={feed.rssLink} target="_blank" rel="noopener noreferrer" className="feed-link">
                                        Visit Feed
                                    </a>
                                </div>
                                <p className="feed-link-text">{feed.rssLink}</p>
                                {feed.description && <p className="feed-description">{feed.description}</p>}
                                {feed.last_fetch && (
                                    <p className="feed-meta">Last fetched: {new Date(feed.last_fetch).toLocaleString()}</p>
                                )}
                                <div className="feed-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleEditFeed(feed)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDeleteClick(feed)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No RSS feeds subscribed yet. Add one to get started!</p>
                    </div>
                )}
            </section>

            {/* Add/Edit Feed Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{formData.uuid ? 'Edit RSS Feed' : 'Add New RSS Feed'}</h2>
                            <button className="modal-close" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleFormSubmit}>
                            <div className="form-group">
                                <label htmlFor="feed-name">Feed Name</label>
                                <input
                                    type="text"
                                    id="feed-name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleFormChange}
                                    placeholder="e.g., Tech News"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="feed-rss-link">RSS Feed URL</label>
                                <input
                                    type="url"
                                    id="feed-rss-link"
                                    name="rssLink"
                                    value={formData.rssLink}
                                    onChange={handleFormChange}
                                    placeholder="e.g., https://example.com/feed.xml"
                                    required
                                />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    {formData.uuid ? 'Update Feed' : 'Add Feed'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModal}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && deleteFeedData && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Confirm Delete</h2>
                            <button className="modal-close" onClick={handleCloseDeleteConfirm}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Are you sure you want to delete the feed "<strong>{deleteFeedData.name}</strong>"?
                            </p>
                            <p>This action will permanently delete the feed and all related data.</p>
                        </div>
                        <div className="form-actions">
                            <button
                                className="btn btn-danger"
                                onClick={handleConfirmDelete}
                            >
                                Delete Feed
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleCloseDeleteConfirm}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RSSFeeds;
