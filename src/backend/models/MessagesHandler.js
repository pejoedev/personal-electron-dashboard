const { db, initializeDatabase } = require('../sql/init.sql');
const { v4: uuidv4 } = require('uuid');

class MessagesHandler {
    _caughtFeeds = {};
    constructor() {
    }

    pushFetch(blob) {
        blob.forEach(element => {
            this._checkFeedId(element);
            element.formattedItems.forEach(item => {
                this._addNonExistingItem(item, element.uuid);
            });
        });
    }

    _checkFeedId(feed) {
        if (this._caughtFeeds[feed.uuid] == undefined) {
            this._caughtFeeds[feed.uuid] = {};
            return false
        }
        return true
    }

    _addNonExistingItem(item, feedId) {
        let alias = `${item.guid}${item.link}`
        if (this._caughtFeeds[feedId][alias] == undefined) {
            this._caughtFeeds[feedId][alias] = this._addOrOverwriteMessage(item, feedId);
            return true;
        }
        return false;
    }

    /**
     * Fetch messages with advanced filtering
     * @param {Object} options - Filter options
     * @param {string} options.type - Filter by type: 'all', 'rss', 'alert' (default: 'all')
     * @param {string} options.viewedStatus - Filter by viewed status: 'all', 'viewed', 'unviewed' (default: 'all')
     * @param {string} options.searchQuery - Search in title and description fields
     * @param {string} options.feedName - Filter by specific feed name (exact match)
     * @param {string} options.projectName - Filter by specific project name (exact match)
     * @param {number} options.limit - number of items per page (default: 20)
     * @param {number} options.page - page number starting from 0 (default: 0)
     * @returns {Object} { items: [], totalCount: number }
     */
    fetchMessages(options = {}) {
        // Destructure with defaults
        const {
            type = 'all',
            viewedStatus = 'all',
            searchQuery = '',
            feedName = '',
            projectName = '',
            limit = 20,
            page = 0
        } = options;

        // Build WHERE clauses
        let whereConditions = [];

        // Handle viewed status filter
        if (viewedStatus === 'unviewed') {
            whereConditions.push('m.viewed = 0');
        } else if (viewedStatus === 'viewed') {
            whereConditions.push('m.viewed = 1');
        }
        // If viewedStatus === 'all', don't add any condition

        if (searchQuery) {
            const searchTerm = `%${searchQuery}%`;
            whereConditions.push(`(m.title LIKE ? OR m.description LIKE ?)`);
        }

        // Get total count with current filters (before pagination)
        let countQuery = 'SELECT COUNT(DISTINCT m.uuid) as count FROM message m';
        let countParams = [];
        let joinClauses = '';

        if (type === 'rss' || feedName) {
            countQuery += ' LEFT JOIN rss r ON m.uuid = r.messageId';
            countQuery += ' LEFT JOIN feed f ON r.feedId = f.uuid';
            if (type === 'rss') {
                whereConditions.push('r.uuid IS NOT NULL');
            }
            if (feedName) {
                whereConditions.push('f.name = ?');
                countParams.push(feedName);
            }
        } else if (type === 'alert' || projectName) {
            countQuery += ' LEFT JOIN securityAlert sa ON m.uuid = sa.messageId';
            countQuery += ' LEFT JOIN project p ON sa.projectId = p.uuid';
            if (type === 'alert') {
                whereConditions.push('sa.uuid IS NOT NULL');
            }
            if (projectName) {
                whereConditions.push('p.name = ?');
                countParams.push(projectName);
            }
        }

        // Add search parameters
        if (searchQuery) {
            const searchTerm = `%${searchQuery}%`;
            countParams.push(searchTerm, searchTerm);
        }

        if (whereConditions.length > 0) {
            countQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        const countResult = db.prepare(countQuery).get(...countParams);
        const totalCount = countResult.count || 0;

        // Build main query with joins and filters
        let query = 'SELECT DISTINCT m.* FROM message m';
        let params = [];

        // Add joins based on type filter
        if (type === 'rss' || feedName) {
            query += ' LEFT JOIN rss r ON m.uuid = r.messageId';
            query += ' LEFT JOIN feed f ON r.feedId = f.uuid';
        } else if (type === 'alert' || projectName) {
            query += ' LEFT JOIN securityAlert sa ON m.uuid = sa.messageId';
            query += ' LEFT JOIN project p ON sa.projectId = p.uuid';
        } else {
            // For 'all' type, still need joins to include RSS and Alert info later
            query += ' LEFT JOIN rss r ON m.uuid = r.messageId';
            query += ' LEFT JOIN feed f ON r.feedId = f.uuid';
            query += ' LEFT JOIN securityAlert sa ON m.uuid = sa.messageId';
            query += ' LEFT JOIN project p ON sa.projectId = p.uuid';
        }

        // Add WHERE conditions
        whereConditions = [];
        params = [];

        // Handle viewed status filter
        if (viewedStatus === 'unviewed') {
            whereConditions.push('m.viewed = 0');
        } else if (viewedStatus === 'viewed') {
            whereConditions.push('m.viewed = 1');
        }

        if (searchQuery) {
            const searchTerm = `%${searchQuery}%`;
            whereConditions.push(`(m.title LIKE ? OR m.description LIKE ?)`);
            params.push(searchTerm, searchTerm);
        }

        if (type === 'rss') {
            whereConditions.push('r.uuid IS NOT NULL');
        } else if (type === 'alert') {
            whereConditions.push('sa.uuid IS NOT NULL');
        }

        if (feedName) {
            whereConditions.push('f.name = ?');
            params.push(feedName);
        }

        if (projectName) {
            whereConditions.push('p.name = ?');
            params.push(projectName);
        }

        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        // Sort and paginate
        query += ' ORDER BY m.fetch_date DESC';
        const offset = page * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        const messages = db.prepare(query).all(...params);
        const result = [];

        // Prepare statements once outside the loop
        const getRssEntryStmt = db.prepare(`
            SELECT r.*, f.name as feed_name, f.link as feed_link
            FROM rss r
            JOIN feed f ON r.feedId = f.uuid
            WHERE r.messageId = ?
        `);

        const getAlertEntryStmt = db.prepare(`
            SELECT sa.*, p.name as project_name, p.link as project_link
            FROM securityAlert sa
            JOIN project p ON sa.projectId = p.uuid
            WHERE sa.messageId = ?
        `);

        messages.forEach(message => {
            const item = { ...message, isRss: false, isAlert: false };

            // Check if it's an RSS item
            const rssEntry = getRssEntryStmt.get(message.uuid);

            if (rssEntry) {
                item.isRss = true;
                item.rss = rssEntry;
                item.feedName = rssEntry.feed_name;
                item.feedLink = rssEntry.feed_link;
            }

            // Check if it's a security alert
            const alertEntry = getAlertEntryStmt.get(message.uuid);

            if (alertEntry) {
                item.isAlert = true;
                item.alert = alertEntry;
                item.projectName = alertEntry.project_name;
                item.projectLink = alertEntry.project_link;
            }

            result.push(item);
        });

        return {
            items: result,
            totalCount: totalCount,
            currentPage: page,
            pageSize: limit,
            totalPages: Math.ceil(totalCount / limit)
        };
    }

    /**
     * Legacy method for backward compatibility - fetches messages with minimal options
     * @deprecated Use fetchMessages with options object instead
     */
    fetchMessages_legacy(hideViewed = false, limit = 20, page = 0) {
        return this.fetchMessages({ hideViewed, limit, page });
    }

    /**
     * Get all unique feed names from RSS entries
     * @returns {Array<string>} Array of unique feed names sorted alphabetically
     */
    getUniqueFeedNames() {
        try {
            const query = `
                SELECT DISTINCT f.name
                FROM feed f
                JOIN rss r ON f.uuid = r.feedId
                ORDER BY f.name ASC
            `;
            const results = db.prepare(query).all();
            return results.map(r => r.name);
        } catch (error) {
            console.error('[MessagesHandler] Error getting unique feed names:', error);
            return [];
        }
    }

    /**
     * Get all unique project names from security alerts
     * @returns {Array<string>} Array of unique project names sorted alphabetically
     */
    getUniqueProjectNames() {
        try {
            const query = `
                SELECT DISTINCT p.name
                FROM project p
                JOIN securityAlert sa ON p.uuid = sa.projectId
                ORDER BY p.name ASC
            `;
            const results = db.prepare(query).all();
            return results.map(r => r.name);
        } catch (error) {
            console.error('[MessagesHandler] Error getting unique project names:', error);
            return [];
        }
    }

    _addOrOverwriteMessage(item, feedId) {
        // Check if message already exists by guid and link
        const existingMessage = db.prepare(`
        SELECT uuid FROM message 
        WHERE title = ? AND link = ?
    `).get(item.title, item.link);

        let messageUuid;

        if (existingMessage) {
            messageUuid = existingMessage.uuid;
            // Update existing message
            const updateMessageStmt = db.prepare(`
            UPDATE message 
            SET description = ?, publication_date = ?, viewed = ?
            WHERE uuid = ?
        `);
            updateMessageStmt.run(
                item.description,
                item.publication_date,
                item.viewed ? 1 : 0,
                messageUuid
            );
        } else {
            // Create new message
            messageUuid = uuidv4();
            const insertMessageStmt = db.prepare(`
                INSERT INTO message 
                (uuid, title, link, description, publication_date, viewed, fetch_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insertMessageStmt.run(
                messageUuid,
                item.title,
                item.link,
                item.description,
                item.publication_date,
                item.viewed ? 1 : 0,
                new Date().toISOString()
            );
        }
        // Check if rss entry already exists
        const existingRss = db.prepare(`
            SELECT uuid FROM rss 
            WHERE feedId = ? AND messageId = ?
        `).get(feedId, messageUuid);

        if (existingRss) {
            // Update existing rss entry
            const updateRssStmt = db.prepare(`
                UPDATE rss 
                SET messageId = ?
                WHERE uuid = ?
            `);
            updateRssStmt.run(messageUuid, existingRss.uuid);
        } else {
            // Create new rss entry
            const rssUuid = uuidv4();
            const insertRssStmt = db.prepare(`
                INSERT INTO rss (uuid, rss_guid, feedId, messageId)
                VALUES (?, ?, ?, ?)
            `);
            insertRssStmt.run(
                rssUuid,
                item.guid,
                feedId,
                messageUuid
            );
        }

        return messageUuid;
    }

    /**
     * Get total count of messages in the database
     * @param {*} hideViewed - if true, count only unviewed items
     * @returns {number} Total count of messages
     */
    getTotalMessageCount(hideViewed = false) {
        let query = 'SELECT COUNT(*) as count FROM message';

        if (hideViewed) {
            query += ' WHERE viewed = 0';
        }

        const result = db.prepare(query).get();
        return result.count || 0;
    }

    /**
     * Mark a message as viewed
     * @param {string} messageId - The UUID of the message to mark as viewed
     * @returns {boolean} Whether the update was successful
     */
    markMessageAsViewed(messageId) {
        try {
            const updateStmt = db.prepare(`
                UPDATE message 
                SET viewed = 1
                WHERE uuid = ?
            `);
            const result = updateStmt.run(messageId);
            const success = result.changes > 0;
            console.log(`[MessagesHandler] Marked message ${messageId} as viewed: ${success}`);
            return success;
        } catch (error) {
            console.error('[MessagesHandler] Error marking message as viewed:', error);
            return false;
        }
    }
}

module.exports = new MessagesHandler();