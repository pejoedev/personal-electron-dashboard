const { db, initializeDatabase } = require('../sql/init.sql');
const { v4: uuidv4 } = require('uuid');

class SettingsHandler {
    rssFollow;
    constructor() {
        console.log("SettingsHandler initiated")
        this.rssFollow = this.loadRssSettings()
        console.log(this.rssFollow)
    }

    updateChannelInfo(title, rssUuid, link, description, language, last_fetch) {
        // Check if feed already exists for this rssUuid
        const existingFeed = db.prepare(`
        SELECT uuid FROM feed WHERE rssId = ?
    `).get(rssUuid);

        if (existingFeed) {
            // Update existing feed
            const updateStmt = db.prepare(`
            UPDATE feed 
            SET name = ?, link = ?, description = ?, language = ?, last_fetch = ?
            WHERE rssId = ?
        `);
            updateStmt.run(title, link, description, language, last_fetch, rssUuid);
            return existingFeed.uuid;
        } else {
            // Create new feed
            const feedUuid = uuidv4();
            const insertStmt = db.prepare(`
            INSERT INTO feed (uuid, rssId, name, link, description, language, last_fetch)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
            insertStmt.run(feedUuid, rssUuid, title, link, description, language, last_fetch);
            return feedUuid;
        }
    }

    loadRssSettings() {
        const stmt = db.prepare(`
            SELECT 
                rssFollow.uuid,
                rssFollow.name,
                rssFollow.rssLink,
                feed.uuid AS feed_uuid,
                feed.name AS feed_name,
                feed.link,
                feed.last_fetch,
                feed.description,
                feed.language
            FROM rssFollow
            LEFT JOIN feed ON rssFollow.uuid = feed.rssId
        `);
        return stmt.all();
    }

    getRssFollowedChannels() {
        return this.rssFollow;
    }

}

module.exports = new SettingsHandler();