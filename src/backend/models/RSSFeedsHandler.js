const { db } = require('../sql/init.sql');
const { v4: uuidv4 } = require('uuid');

/**
 * Handles CRUD operations for RSS feed subscriptions (rssFollow table)
 * Supports cascading deletion based on user settings
 */
class RSSFeedsHandler {
    /**
     * Get all RSS feed subscriptions
     * @returns {Array} List of RSS feed subscriptions
     */
    getAllFeeds() {
        const stmt = db.prepare(`
            SELECT 
                rf.uuid,
                rf.name,
                rf.rssLink,
                rf.deleted,
                COUNT(DISTINCT f.uuid) as feed_count,
                COUNT(DISTINCT r.uuid) as item_count,
                MAX(f.last_fetch) as last_fetch
            FROM rssFollow rf
            LEFT JOIN feed f ON rf.uuid = f.rssId
            LEFT JOIN rss r ON f.uuid = r.feedId
            WHERE rf.deleted = 0
            GROUP BY rf.uuid
            ORDER BY rf.name ASC
        `);
        return stmt.all();
    }

    /**
     * Get a specific RSS feed subscription by UUID
     * @param {string} uuid - The UUID of the RSS feed
     * @returns {Object|null} The RSS feed object or null if not found
     */
    getFeedById(uuid) {
        const stmt = db.prepare(`
            SELECT 
                rf.uuid,
                rf.name,
                rf.rssLink,
                rf.deleted,
                COUNT(DISTINCT f.uuid) as feed_count,
                COUNT(DISTINCT r.uuid) as item_count,
                MAX(f.last_fetch) as last_fetch
            FROM rssFollow rf
            LEFT JOIN feed f ON rf.uuid = f.rssId
            LEFT JOIN rss r ON f.uuid = r.feedId
            WHERE rf.uuid = ?
            GROUP BY rf.uuid
        `);
        return stmt.get(uuid);
    }

    /**
     * Create a new RSS feed subscription
     * @param {string} name - The name of the feed subscription
     * @param {string} rssLink - The RSS feed URL
     * @returns {Object} The created RSS feed object
     */
    createFeed(name, rssLink) {
        if (!name || !rssLink) {
            throw new Error('Name and rssLink are required');
        }

        const uuid = uuidv4();
        const stmt = db.prepare(`
            INSERT INTO rssFollow (uuid, name, rssLink, deleted)
            VALUES (?, ?, ?, 0)
        `);

        try {
            stmt.run(uuid, name, rssLink);
            console.log(`[RSSFeedsHandler] Created new RSS feed: ${uuid} (${name})`);
            return this.getFeedById(uuid);
        } catch (error) {
            console.error('[RSSFeedsHandler] Failed to create RSS feed:', error);
            throw error;
        }
    }

    /**
     * Update an existing RSS feed subscription
     * @param {string} uuid - The UUID of the RSS feed to update
     * @param {string} name - The new name (optional)
     * @param {string} rssLink - The new RSS URL (optional)
     * @returns {Object} The updated RSS feed object
     */
    updateFeed(uuid, name, rssLink) {
        const feed = this.getFeedById(uuid);
        if (!feed) {
            throw new Error(`RSS feed with UUID ${uuid} not found`);
        }

        const updateName = name || feed.name;
        const updateLink = rssLink || feed.rssLink;

        const stmt = db.prepare(`
            UPDATE rssFollow
            SET name = ?, rssLink = ?
            WHERE uuid = ?
        `);

        try {
            stmt.run(updateName, updateLink, uuid);
            console.log(`[RSSFeedsHandler] Updated RSS feed: ${uuid}`);
            return this.getFeedById(uuid);
        } catch (error) {
            console.error('[RSSFeedsHandler] Failed to update RSS feed:', error);
            throw error;
        }
    }

    /**
     * Delete an RSS feed subscription
     * Respects the "delete.data.on.rssfollow.delete" setting if no strategy is provided
     * Mode 1: Cascade delete all related feeds, RSS items, and messages
     * Mode 2: Soft delete by marking as deleted
     * Mode 3: Ask user (returns ask response with preview)
     * 
     * @param {string} uuid - The UUID of the RSS feed to delete
     * @param {string} strategy - Optional deletion strategy: 'cascade' or 'soft' (overrides user setting)
     * @returns {Object} Result object with deletion details or ask response
     */
    deleteFeed(uuid, strategy = null) {
        const feed = this.getFeedById(uuid);
        if (!feed) {
            throw new Error(`RSS feed with UUID ${uuid} not found`);
        }

        // If strategy is provided, use it directly
        if (strategy) {
            console.log(`[RSSFeedsHandler] Deleting feed ${uuid}, strategy: ${strategy}`);
            try {
                if (strategy === 'cascade') {
                    return this._cascadeDeleteFeed(uuid);
                } else if (strategy === 'soft') {
                    return this._softDeleteFeed(uuid);
                } else {
                    throw new Error(`Invalid strategy: ${strategy}`);
                }
            } catch (error) {
                console.error('[RSSFeedsHandler] Failed to delete RSS feed:', error);
                throw error;
            }
        }

        // Otherwise, check the deletion mode setting
        const settingStmt = db.prepare(`
            SELECT value FROM userSetting WHERE key = ?
        `);
        const setting = settingStmt.get('delete.data.on.rssfollow.delete');
        const deletionMode = setting ? parseInt(setting.value) : 3; // Default to ask mode if not set

        console.log(`[RSSFeedsHandler] Deleting feed ${uuid}, deletion mode: ${deletionMode}`);

        try {
            if (deletionMode === 1) {
                // Mode 1: Cascade delete
                return this._cascadeDeleteFeed(uuid);
            } else if (deletionMode === 2) {
                // Mode 2: Soft delete
                return this._softDeleteFeed(uuid);
            } else if (deletionMode === 3) {
                // Mode 3: Ask user - return preview
                return this._askDeleteFeed(uuid);
            } else {
                // Invalid mode, default to ask
                console.warn(`[RSSFeedsHandler] Invalid deletion mode ${deletionMode}, defaulting to ask`);
                return this._askDeleteFeed(uuid);
            }
        } catch (error) {
            console.error('[RSSFeedsHandler] Failed to delete RSS feed:', error);
            throw error;
        }
    }

    /**
     * Hard delete - cascade delete all related data
     * @private
     */
    _cascadeDeleteFeed(uuid) {
        const feed = this.getFeedById(uuid);

        // Get all feeds for this rssFollow
        const feedsStmt = db.prepare(`
            SELECT uuid FROM feed WHERE rssId = ?
        `);
        const feeds = feedsStmt.all(uuid);

        let deletedMessages = 0;
        let deletedRssItems = 0;
        let deletedFeeds = 0;

        // For each feed, delete related RSS items
        feeds.forEach(feedRow => {
            // Get all RSS items for this feed
            const rssItemsStmt = db.prepare(`
                SELECT messageId FROM rss WHERE feedId = ?
            `);
            const rssItems = rssItemsStmt.all(feedRow.uuid);

            // Delete RSS items
            const deleteRssStmt = db.prepare('DELETE FROM rss WHERE feedId = ?');
            deleteRssStmt.run(feedRow.uuid);
            deletedRssItems += rssItems.length;

            // Delete orphaned messages (messages not referenced by any other item)
            const deleteMessagesStmt = db.prepare(`
                DELETE FROM message 
                WHERE uuid IN (
                    SELECT m.uuid FROM message m
                    LEFT JOIN rss r ON m.uuid = r.messageId
                    LEFT JOIN securityAlert sa ON m.uuid = sa.messageId
                    WHERE r.uuid IS NULL AND sa.uuid IS NULL
                )
            `);
            const deleteResult = deleteMessagesStmt.run();
            deletedMessages += deleteResult.changes;

            // Delete the feed
            const deleteFeedStmt = db.prepare('DELETE FROM feed WHERE uuid = ?');
            deleteFeedStmt.run(feedRow.uuid);
            deletedFeeds++;
        });

        // Delete the rssFollow entry itself
        const deleteFollowStmt = db.prepare('DELETE FROM rssFollow WHERE uuid = ?');
        deleteFollowStmt.run(uuid);

        const result = {
            success: true,
            uuid: uuid,
            deleteType: 'cascade',
            deletedCounts: {
                feeds: deletedFeeds,
                rssItems: deletedRssItems,
                messages: deletedMessages
            }
        };

        console.log(`[RSSFeedsHandler] Cascade deleted feed ${uuid}:`, result.deletedCounts);
        return result;
    }

    /**
     * Soft delete - mark as deleted instead of removing
     * @private
     */
    _softDeleteFeed(uuid) {
        const updateStmt = db.prepare(`
            UPDATE rssFollow
            SET deleted = 1
            WHERE uuid = ?
        `);

        updateStmt.run(uuid);

        // Note: Feeds will be skipped in the RSS cron job due to their parent being marked deleted
        // Messages are NOT deleted, only the feed subscription stops being updated

        const result = {
            success: true,
            uuid: uuid,
            deleteType: 'soft',
            message: 'Feed marked as deleted. Existing messages preserved. Feed will not be updated in future RSS fetches.'
        };

        console.log(`[RSSFeedsHandler] Soft deleted feed ${uuid}`);
        return result;
    }

    /**
     * Ask delete - returns deletion preview and asks user to choose strategy
     * Used when deletion mode is set to 3 (ask)
     * @private
     */
    _askDeleteFeed(uuid) {
        const preview = this.getDeletePreview(uuid);
        return {
            askUser: true,
            preview: preview
        };
    }

    /**
     * Get deletion preview - shows what would be deleted if cascade delete was enabled
     * @param {string} uuid - The UUID of the RSS feed
     * @returns {Object} Preview of items that would be deleted
     */
    getDeletePreview(uuid) {
        const feed = this.getFeedById(uuid);
        if (!feed) {
            throw new Error(`RSS feed with UUID ${uuid} not found`);
        }

        // Get all feeds for this rssFollow
        const feedsStmt = db.prepare(`
            SELECT uuid FROM feed WHERE rssId = ?
        `);
        const feeds = feedsStmt.all(uuid);

        let totalMessages = 0;
        let totalRssItems = 0;

        feeds.forEach(feedRow => {
            const rssCountStmt = db.prepare(`
                SELECT COUNT(*) as count FROM rss WHERE feedId = ?
            `);
            const rssCount = rssCountStmt.get(feedRow.uuid).count;
            totalRssItems += rssCount;

            const messageCountStmt = db.prepare(`
                SELECT COUNT(DISTINCT m.uuid) as count 
                FROM message m
                LEFT JOIN rss r ON m.uuid = r.messageId
                LEFT JOIN securityAlert sa ON m.uuid = sa.messageId
                WHERE r.feedId = ? AND sa.uuid IS NULL
            `);
            const messageCount = messageCountStmt.get(feedRow.uuid).count;
            totalMessages += messageCount;
        });

        return {
            feedUuid: uuid,
            feedName: feed.name,
            feedsCount: feeds.length,
            rssItemsCount: totalRssItems,
            messagesCount: totalMessages,
            wouldDelete: {
                feeds: feeds.length,
                rssItems: totalRssItems,
                messages: totalMessages
            }
        };
    }
}

module.exports = RSSFeedsHandler;
