Instructions for future me.
```
In rss-setup there is a TODO item, and in dashboard.html there is a todo item.

these 2 correlate, 
The rss-setup should take the data from fetchMessages(true, 20, 0) and forward it to the frontend. where the frontend should render it.
Communication goes through both Communicator.js files

and also make it work with the pagination
/**
     * Fetch all items from the messages table
     * @param {*} hideViewed - if true, hide the items where viewed == 1
     * @param {*} limit - number of items per page (default: 20)
     * @param {*} page - page number starting from 0 (default: 0)
     * @returns 
     */
    fetchMessages(hideViewed = false, limit = 20, page = 0) {
```