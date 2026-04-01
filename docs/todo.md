needed for official release

- being able to set/edit/delete the rssFollow table items from ui
- a settings menu, all frontend features / settings need to be stored in localstorage, all merged / backend features in the database.
    - start minimized boolean
        Default: True
        Saved in localstorage
    - reader
        - open rss item in fullscreen boolean
            this boolean should control whether or not the "read" button will open a new pop-out window, or whether it opens in fullscreen in the default window.
            Default: False
            Saved in localstorage
        - open rss item source in fullscreen boolean
            this boolean should control whether or not the "rss-source" button will open a new pop-out window, or whether it opens in fullscreen in the default window.
            Default: True
            Saved in localstorage
        - hide the dismiss button boolean
            Whether or not the "rss-dismiss" is shown
            Default: False
            Saved in localstorage
            - only if the above is false: remove article from feed when opening the reading view boolean
                This will be ignored if the above setting is true. 
                This setting will not send the backen the signal to set an item as "viewed" once the user clicks on "read" button.
                Default: True
                Saved in localstorage



