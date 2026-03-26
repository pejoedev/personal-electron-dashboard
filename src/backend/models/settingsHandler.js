const { db, initializeDatabase } = require('../sql/init.sql');

class SettingsHandler {
    rssFollow;
    constructor() {
        console.log("SettingsHandler initiated")
        this.rssFollow = this.loadRssSettings()
        console.log(this.rssFollow)
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
                feed.rss_url,
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