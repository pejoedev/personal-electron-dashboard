const { db, initializeDatabase } = require('../sql/init.sql');

class SettingsHandler {
    rssFollow;
    constructor() {
        console.log("SettingsHandler initiated")
        this.rssFollow = this.loadRssSettings()
        console.log(this.rssFollow)
    }

    updateChannelInfo() {
        // TODO: add items to the feed db if they don't exist already. and update the data
    }

    saveFetchedFeed() {
        // TODO: add fetched items to the messages table, but don't re-create existing ones
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