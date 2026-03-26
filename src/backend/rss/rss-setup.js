const settingsHandler = require("../models/settingsHandler")
const xml2js = require('xml2js');
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
    settingsHandler.rssFollow.forEach(async (item) => {
        let respone = await _FetchWebsite(item.rssLink)
        console.log(respone.rss.channel);

        // TODO: assign logic to parse the json to the db schema
        // and call the settingHandlers updateChannelInfo() and saveFetchedFeed()
    })

    // TODO: send the new data to the frontends
}

async function _FetchWebsite(url) {
    const response = await fetch(url);
    const data = await response.text()
    const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true
    });
    const parsedData = await parser.parseStringPromise(data);

    console.log(parsedData);
    return parsedData;
}

function SetupRSS() {
    RegisterCrons()
}

module.exports = { SetupRSS }