const settingsHandler = require("../models/settingsHandler")
const messagesHandler = require("../models/MessagesHandler")
const xml2js = require('xml2js');
const cron = require('../models/CronScheduler');

const ModuleName = "rss-setup"
let communicator = null;

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
    // Reload RSS feeds dynamically instead of using cached array
    const rssFeeds = settingsHandler.getRssFollowedChannels();
    await Promise.all(rssFeeds.map(async (item) => {
        let respone = await _FetchWebsite(item.rssLink)
        if (respone == null) {
            return;
        }
        let responeChannel = respone.rss.channel;
        let formattedResponse = {
            formattedItems: []
        };
        formattedResponse.uuid = null;
        formattedResponse.title = `${responeChannel.title ?? ""}`;
        formattedResponse.rssId = `${item.uuid ?? ""}`;
        formattedResponse.link = `${responeChannel.link ?? ""}`;
        formattedResponse.description = `${responeChannel.description ?? ""}`;
        formattedResponse.language = `${responeChannel.language ?? ""}`;
        formattedResponse.last_fetch = `${new Date(Date.now()).toUTCString()}`
        let itemsList = responeChannel.item;
        itemsList.forEach((itemItem) => {
            let formattedItem = {};
            formattedItem.title = `${itemItem.title ?? ""}`;
            formattedItem.link = `${itemItem.link ?? ""}`;
            formattedItem.description = `${itemItem.description ?? ""}`;
            formattedItem.publication_date = `${itemItem.pubDate ?? ""}`;
            formattedItem.guid = `${itemItem.guid ?? ""}`;
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

    // Send the new data to the frontends
    // this means the feed items and the Settings
    if (communicator) {
        const hideViewed = true;
        const limit = 20;
        const page = 0;

        try {
            const feeds = messagesHandler.fetchMessages(hideViewed, limit, page);
            const totalCount = messagesHandler.getTotalMessageCount(hideViewed);

            communicator.send('rss-feed-update', {
                feeds: feeds,
                totalCount: totalCount,
                currentPage: page,
                pageSize: limit
            });

            console.log(`[RSS Setup] Sent ${feeds?.length ?? 0} feeds to frontend (total: ${totalCount})`);
        } catch (error) {
            console.error('[RSS Setup] Failed to send RSS data to frontend:', error);
        }
    }
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
        return null;
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

function SetupRSS(commInstance = null) {
    if (commInstance) {
        communicator = commInstance;
    }
    RegisterCrons()
}

module.exports = { SetupRSS, FetchRss }