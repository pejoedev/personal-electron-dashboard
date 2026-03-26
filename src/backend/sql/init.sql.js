const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(app.getPath('userData'), 'perselec-dash.db');
const db = new Database(dbPath);

const INSERT_DATA = true;

// Create tables on app startup
function initializeDatabase() {
    console.log('Database path:', dbPath);
    db.exec(`
  CREATE TABLE IF NOT EXISTS rssFollow (
    uuid TEXT PRIMARY KEY,
    name TEXT,
    rssLink TEXT
  );

  CREATE TABLE IF NOT EXISTS feed (
    uuid TEXT PRIMARY KEY,
    rssId TEXT NOT NULL,
    name TEXT,
    link TEXT,
    rss_url TEXT,
    last_fetch TEXT,
    description TEXT,
    language TEXT,
    FOREIGN KEY (rssId) REFERENCES rssFollow(uuid)
  );

  CREATE TABLE IF NOT EXISTS message (
    uuid TEXT PRIMARY KEY,
    title TEXT,
    link TEXT,
    description TEXT,
    publication_date TEXT,
    viewed BOOLEAN
  );

  CREATE TABLE IF NOT EXISTS rss (
    uuid TEXT PRIMARY KEY,
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
    console.log("Database Initialized!")
    setTimeout(() => {
        if (INSERT_DATA) {
            templateItems()
        }
    }, 100)
}

function templateItems() {
    // Check if rssFollow table is empty
    const count = db.prepare('SELECT COUNT(*) as count FROM rssFollow').get();

    if (count.count === 0) {
        // Insert default rssFollow item
        const uuid = uuidv4();
        db.prepare(`
            INSERT INTO rssFollow (uuid, name, rssLink)
            VALUES (?, ?, ?)
        `).run(uuid, 'dimden.dev', 'https://dimden.dev/rss.xml');

        console.log('Default RSS feed added: dimden.dev');
    }
}

module.exports = { db, initializeDatabase };