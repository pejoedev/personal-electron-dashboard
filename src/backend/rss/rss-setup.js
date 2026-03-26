const settingsHandler = require("../models/settingsHandler")
const cron = require('../models/CronScheduler');

const ModuleName = "rss-setup"

function RegisterCrons() {
    // every hour
    cron.schedule('Fetch RSS Info', 60 * 60 * 1000, async () => {
        FetchRss()
    }, ModuleName);
    cron.startAll(true)
}

function FetchRss() {
    console.log("Fetching RSS Feeds!")
}

function SetupRSS() {
    RegisterCrons()
}

module.exports = { SetupRSS }