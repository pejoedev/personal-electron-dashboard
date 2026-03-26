const settingsHandler = require("../models/settingsHandler")
const cron = require('../models/CronScheduler');

const ModuleName = "rss-setup"

function RegisterCrons() {
    // every hour
    cron.schedule('Fetch RSS Info', 60 * 60 * 1000, async () => {
        await FetchRss()
    }, ModuleName);
    cron.startAll(true)
}

async function FetchRss() {
    console.log("Fetching RSS Feeds!")
    settingsHandler.rssFollow.forEach((item) => {
        _FetchWebsite(item.rssLink)
    })
}

async function _FetchWebsite(url) {
    const response = await fetch(url);
    const data = await response.text()
    console.log(data);
    return data
}

function SetupRSS() {
    RegisterCrons()
}

module.exports = { SetupRSS }