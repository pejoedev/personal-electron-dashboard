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
                (uuid, title, link, description, publication_date, viewed)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            insertMessageStmt.run(
                messageUuid,
                item.title,
                item.link,
                item.description,
                item.publication_date,
                item.viewed ? 1 : 0
            );
        }
        // Check if rss entry already exists
        const existingRss = db.prepare(`
            SELECT uuid FROM rss 
            WHERE rss_guid = ? AND feedId = ?
        `).get(item.guid ?? "", feedId);

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
}

module.exports = new MessagesHandler();