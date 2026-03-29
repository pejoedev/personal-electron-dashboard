const settingsHandler = require("../models/settingsHandler")
const messagesHandler = require("../models/MessagesHandler")
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
    const allChannelFeeds = [];
    await Promise.all(settingsHandler.rssFollow.map(async (item) => {
        let respone = await _FetchWebsite(item.rssLink)
        let responeChannel = respone.rss.channel;
        let formattedResponse = {
            formattedItems: []
        };
        formattedResponse.uuid = null;
        formattedResponse.title = responeChannel.title;
        formattedResponse.rssId = item.uuid;
        formattedResponse.link = responeChannel.link;
        formattedResponse.description = responeChannel.description;
        formattedResponse.language = responeChannel.language;
        formattedResponse.last_fetch = `${new Date(Date.now()).toUTCString()}`
        let itemsList = responeChannel.item;
        itemsList.forEach((item) => {
            let formattedItem = {};
            formattedItem.title = item.title;
            formattedItem.link = item.link;
            formattedItem.description = item.description;
            formattedItem.publication_date = item.pubDate;
            formattedItem.guid = `${item.guid ?? ""}`;
            formattedItem.viewed = false;
            formattedResponse.formattedItems.push(formattedItem);
        });
        allChannelFeeds.push(formattedResponse)
        formattedResponse.uuid = settingsHandler.updateChannelInfo(
            formattedResponse.title, formattedResponse.rssId,
            formattedResponse.link, formattedResponse.description,
            formattedResponse.language, formattedResponse.last_fetch,
        )
    }));

    messagesHandler.pushFetch(allChannelFeeds)

    // console.log(allChannelFeeds);

    // TODO: send the new data to the frontends
}

async function _FetchWebsite(url) {
    const response = await fetch(url);
    const data = await response.text();

    // Extract only the XML portion
    const xmlStart = data.indexOf('<?xml');
    const rssStart = data.indexOf('<rss');
    const startIndex = xmlStart !== -1 ? xmlStart : rssStart;

    if (startIndex === -1) {
        console.log(`No valid RSS found in response: ${url}`)
    }

    const xmlData = data.substring(startIndex);
    const xmlEnd = xmlData.indexOf('</rss>') + 6;
    const cleanXml = xmlData.substring(0, xmlEnd);

    const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true
    });

    return await parser.parseStringPromise(cleanXml);
}

function SetupRSS() {
    RegisterCrons()
}

module.exports = { SetupRSS }