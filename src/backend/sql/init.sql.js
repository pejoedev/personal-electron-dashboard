const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(app.getPath('userData'), 'perselec-dash.db');
const db = new Database(dbPath);
const DB_DIAGRAM_VERSION = "v1.1.0";

const INSERT_DATA = true;

// Create tables on app startup
function initializeDatabase() {
    console.log('Database path:', dbPath);
    db.exec(`
  CREATE TABLE IF NOT EXISTS rssFollow (
    uuid TEXT PRIMARY KEY,
    name TEXT,
    rssLink TEXT,
    deleted BOOLEAN
  );

  CREATE TABLE IF NOT EXISTS feed (
    uuid TEXT PRIMARY KEY,
    rssId TEXT NOT NULL,
    name TEXT,
    link TEXT,
    last_fetch TEXT,
    description TEXT,
    language TEXT,
    FOREIGN KEY (rssId) REFERENCES rssFollow(uuid)
  );

  CREATE TABLE IF NOT EXISTS userSetting (
    key TEXT,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS message (
    uuid TEXT PRIMARY KEY,
    title TEXT,
    link TEXT,
    description TEXT,
    publication_date TEXT,
    viewed BOOLEAN,
    fetch_date TEXT
  );

  CREATE TABLE IF NOT EXISTS rss (
    uuid TEXT PRIMARY KEY,
    rss_guid TEXT,
    feedId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    FOREIGN KEY (feedId) REFERENCES feed(uuid),
    FOREIGN KEY (messageId) REFERENCES message(uuid)
  );

  CREATE TABLE IF NOT EXISTS project (
    uuid TEXT PRIMARY KEY,
    name TEXT,
    fetchAlertEndpoint TEXT,
    link TEXT,
    healthCheckUrl TEXT
  );

  CREATE TABLE IF NOT EXISTS securityAlert (
    uuid TEXT PRIMARY KEY,
    messageId TEXT NOT NULL,
    projectId TEXT NOT NULL,
    level TEXT,
    blob TEXT,
    resolved BOOLEAN,
    FOREIGN KEY (messageId) REFERENCES message(uuid),
    FOREIGN KEY (projectId) REFERENCES project(uuid)
  );

  CREATE TABLE IF NOT EXISTS projectHealthCheck (
    uuid TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    fetch TEXT,
    status TEXT,
    httpResponse TEXT,
    FOREIGN KEY (projectId) REFERENCES project(uuid)
  );
`);
    console.log(`Database ${DB_DIAGRAM_VERSION} Initialized!`)

    // Migration: Add deleted column to rssFollow if it doesn't exist
    try {
        const columns = db.prepare("PRAGMA table_info(rssFollow)").all();
        const hasDeletedColumn = columns.some(col => col.name === 'deleted');

        if (!hasDeletedColumn) {
            console.log('[Migration] Adding deleted column to rssFollow table...');
            db.prepare("ALTER TABLE rssFollow ADD COLUMN deleted BOOLEAN DEFAULT 0").run();
            console.log('[Migration] Successfully added deleted column to rssFollow table');
        }
    } catch (error) {
        console.error('[Migration] Error checking/adding deleted column:', error);
    }

    // Migration: Initialize deletion mode setting if it doesn't exist
    try {
        const setting = db.prepare("SELECT value FROM userSetting WHERE key = ?").get('delete.data.on.rssfollow.delete');
        if (!setting) {
            console.log('[Migration] Initializing delete.data.on.rssfollow.delete setting to mode 3 (ask)...');
            db.prepare("INSERT INTO userSetting (key, value) VALUES (?, ?)").run('delete.data.on.rssfollow.delete', '3');
            console.log('[Migration] Successfully initialized delete.data.on.rssfollow.delete setting');
        }
    } catch (error) {
        console.error('[Migration] Error initializing deletion mode setting:', error);
    }

    setTimeout(() => {
        if (INSERT_DATA) {
            templateItems()
        }
    }, 100)
}

function templateItems() {
    // Check if rssFollow table is empty
    const count = db
        .prepare('SELECT COUNT(*) as count FROM rssFollow')
        .get();

    if (count.count === 0) {
        // Insert default rssFollow item
        let uuid = uuidv4();
        db.prepare(`
            INSERT INTO rssFollow (uuid, name, rssLink, deleted)
            VALUES (?, ?, ?, ?)
        `).run(uuid, 'dimden.dev', 'https://dimden.dev/rss.xml', 0);
        uuid = uuidv4();
        db.prepare(`
            INSERT INTO rssFollow (uuid, name, rssLink, deleted)
            VALUES (?, ?, ?, ?)
        `).run(
            uuid,
            'besluiten',
            'https://feeds.rijksoverheid.nl/besluiten.rss',
            0
        );
        uuid = uuidv4();
        db.prepare(`
            INSERT INTO rssFollow (uuid, name, rssLink, deleted)
            VALUES (?, ?, ?, ?)
        `).run(
            uuid,
            'nosnieuwsopmerkelijk',
            'https://feeds.nos.nl/nosnieuwsopmerkelijk',
            0
        );

        console.log('Default RSS feed added: dimden.dev');
    }
}

module.exports = { db, initializeDatabase };