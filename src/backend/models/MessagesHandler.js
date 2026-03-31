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
     * Fetch all items from the messages table
     * @param {*} hideViewed - if true, hide the items where viewed == 1
     * @param {*} limit - number of items per page (default: 20)
     * @param {*} page - page number starting from 0 (default: 0)
     * @returns 
     */
    fetchMessages(hideViewed = false, limit = 20, page = 0) {
        // Base query to get messages
        let query = 'SELECT * FROM message';

        if (hideViewed) {
            query += ' WHERE viewed = 0';
        }

        // Sort by fetch_date
        query += ' ORDER BY fetch_date DESC';

        // Calculate offset
        const offset = page * limit;
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        const messages = db.prepare(query).all();
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

        return result;
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
            WHERE feedId = ? AND feedId = ?
        `).get(item.feedId ?? "", feedId);

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